// VoxBharat Public API v1 — REST endpoints for AI agents & third-party developers
// All routes are mounted under /api/v1/ on the main Express app

import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dns from 'dns/promises';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { requireApiKey } from '../middleware/api-key-auth.js';
import { idempotency } from '../middleware/idempotency.js';
import { createApiKey, listApiKeys, revokeApiKey } from '../db-api-keys.js';
import { createSurvey, listSurveys, getSurveyByName, deleteSurvey, updateSurvey } from '../db-surveys.js';
import { createWebhook, listWebhooks, deleteWebhook, getDeliveries, getWebhookById } from '../db-webhooks.js';
import { dispatchWebhook } from '../webhook-dispatcher.js';
import {
  isDbReady, getCallById, getAllCalls,
  getProjects, getProjectCalls, getProjectAnalytics, getProjectResponseBreakdowns,
  getProjectSurveyConfig, exportProjectCallsJson, exportProjectCallsCsv,
} from '../db.js';
import {
  getCampaignById, getCampaignsByUser, createCampaign, addCampaignNumbers,
  getCampaignNumbersByCampaign, getProgressCounts,
} from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Helpers ──────────────────────────────────────────────

function requireDb(req, res, next) {
  if (!isDbReady()) return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unavailable' } });
  next();
}

function requireJwt(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication not configured' } });
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

/** Wrap handler to catch errors and return consistent format */
function wrap(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[API v1] ${req.method} ${req.path} error (${req.requestId}):`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: req.requestId } });
      }
    });
  };
}

/** Add X-Request-Id to every response */
function requestIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

// ─── Rate limiters ────────────────────────────────────────

const apiKeyRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `apikey_${req.user?.apiKeyId || req.user?.id || 'anon'}`,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Limit: 60/minute.' } },
});

// ─── Survey validation constants ──────────────────────────

const VALID_TYPES = new Set(['political', 'market', 'customer', 'employee', 'social', 'custom', 'verification']);
const VALID_GEOGRAPHIES = new Set(['national', 'state', 'urban', 'rural', 'metro']);
const VALID_LANGUAGES = new Set(['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'en']);
const VALID_QUESTION_TYPES = new Set(['single', 'multiple', 'likert', 'rating', 'nps', 'open', 'yes_no']);

/** Validate questions array schema */
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return 'questions array is required and must not be empty';
  if (questions.length > 100) return 'Maximum 100 questions per survey';

  const ids = new Set();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') return `questions[${i}] must be an object`;
    if (typeof q.id !== 'number') return `questions[${i}].id must be a number`;
    if (ids.has(q.id)) return `Duplicate question id: ${q.id}`;
    ids.add(q.id);
    if (!q.type || !VALID_QUESTION_TYPES.has(q.type)) return `questions[${i}].type must be one of: ${[...VALID_QUESTION_TYPES].join(', ')}`;
    if (!q.text || typeof q.text !== 'string') return `questions[${i}].text is required`;
    if (!q.textEn || typeof q.textEn !== 'string') return `questions[${i}].textEn is required`;
    if (['single', 'multiple', 'likert'].includes(q.type) && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
      return `questions[${i}] of type "${q.type}" requires at least 2 options`;
    }
    if (q.type === 'likert' && q.options?.length !== 5) {
      return `questions[${i}] of type "likert" must have exactly 5 options`;
    }
  }
  return null;
}

/** Validate E.164 phone number format */
function validateE164(phone) {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  if (!/^\+\d{8,15}$/.test(cleaned)) return null;
  return cleaned;
}

// ─── SSRF Protection ──────────────────────────────────────

/** Check if an IP is private/reserved (SSRF protection for webhook URLs) */
function isPrivateIp(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true; // non-IPv4, block by default
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (link-local / cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0
  if (parts.every(p => p === 0)) return true;
  return false;
}

/** Validate webhook URL is not pointing at private/internal services */
async function validateWebhookUrl(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  // Block localhost variants
  if (['localhost', '0.0.0.0', '127.0.0.1', '[::1]', '[::]'].includes(hostname)) return false;
  // Block raw IPv6 in brackets
  if (hostname.startsWith('[')) return false;
  // Block raw IPv4 addresses (must use real hostnames)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return !isPrivateIp(hostname);
  }

  // Resolve hostname — check both IPv4 and IPv6
  try {
    const [v4, v6] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname),
    ]);
    const addresses = [
      ...(v4.status === 'fulfilled' ? v4.value : []),
      ...(v6.status === 'fulfilled' ? v6.value : []),
    ];
    // If DNS resolves to nothing, block it
    if (addresses.length === 0) return false;
    // Check all resolved IPs — IPv6 are blocked by isPrivateIp (non-4-part → true)
    return addresses.every(ip => !isPrivateIp(ip));
  } catch {
    // DNS resolution failed entirely — block (don't allow unresolvable hosts)
    return false;
  }
}

// ─── Build Router ─────────────────────────────────────────

export function createApiV1Router({ initiateCallFn, campaignRunnerRef, getActiveCallsFn }) {
  const router = Router();

  // Add request ID to all responses
  router.use(requestIdMiddleware);

  // ==========================================
  // OpenAPI spec (no auth required)
  // ==========================================
  router.get('/openapi.yaml', (req, res) => {
    try {
      const spec = readFileSync(join(__dirname, '..', 'openapi.yaml'), 'utf-8');
      res.setHeader('Content-Type', 'text/yaml');
      res.send(spec);
    } catch {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'OpenAPI spec not found' } });
    }
  });

  // ==========================================
  // API Keys (JWT auth — dashboard users only)
  // ==========================================

  router.post('/api-keys', requireJwt, requireDb, wrap(async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required (max 100 chars)' } });
    }
    const result = await createApiKey(req.user.id, name.trim());
    res.status(201).json({ data: result });
  }));

  router.get('/api-keys', requireJwt, requireDb, wrap(async (req, res) => {
    const keys = await listApiKeys(req.user.id);
    res.json({ data: keys });
  }));

  router.delete('/api-keys/:id', requireJwt, requireDb, wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid key ID' } });
    const revoked = await revokeApiKey(req.user.id, id);
    if (!revoked) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found or already revoked' } });
    res.json({ data: { revoked: true } });
  }));

  // ==========================================
  // All remaining routes use API key auth
  // ==========================================
  router.use(requireApiKey);
  router.use(apiKeyRateLimiter);
  router.use(requireDb);
  router.use(idempotency);

  // ==========================================
  // Surveys
  // ==========================================

  router.post('/surveys', wrap(async (req, res) => {
    const { name, type, purpose, languages, targetAudience, geography, tone, duration, questions, companyName, greetingTopic, sensitivity, keyQuestions, analysisGoals, brandNames, companyContext, successMetrics } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    }
    const qErr = validateQuestions(questions);
    if (qErr) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: qErr } });
    }
    if (type && !VALID_TYPES.has(type)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}` } });
    }

    const config = {
      name: name.trim(),
      type: type || 'custom',
      purpose: purpose || '',
      languages: (languages || ['hi']).filter(l => VALID_LANGUAGES.has(l)),
      targetAudience: targetAudience || 'General population',
      geography: VALID_GEOGRAPHIES.has(geography) ? geography : 'national',
      tone: tone || 'conversational',
      duration: Math.min(Math.max(1, duration || 5), 30),
      questions,
      companyName: companyName || '',
      greetingTopic: greetingTopic || '',
      sensitivity: sensitivity || 'low',
      keyQuestions: keyQuestions || '',
      analysisGoals: analysisGoals || '',
      brandNames: brandNames || '',
      companyContext: companyContext || '',
      successMetrics: (Array.isArray(successMetrics) ? successMetrics : [])
        .filter(m => m && typeof m.name === 'string' && typeof m.prompt === 'string' && m.name.trim() && m.prompt.trim())
        .slice(0, 5)
        .map(m => ({ name: m.name.trim(), prompt: m.prompt.trim() })),
    };

    const survey = await createSurvey(req.user.id, name.trim(), config);
    res.status(201).json({ data: survey });
  }));

  router.post('/surveys/generate-questions', wrap(async (req, res) => {
    const { config } = req.body;
    if (!config || !config.type || !config.purpose) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'config.type and config.purpose are required' } });
    }
    if (!VALID_TYPES.has(config.type)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid survey type' } });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: { code: 'CONFIGURATION_ERROR', message: 'Anthropic API key not configured' } });
    }

    const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
    const MAX_FIELD_LENGTH = 5000;

    const autoDetect = config.autoDetectLanguage || false;
    const primaryLanguage = autoDetect ? 'en' : (config.languages?.[0] || 'hi');
    const languageMap = {
      hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
      ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
      pa: 'Punjabi', en: 'English',
    };
    const langName = languageMap[primaryLanguage] || 'Hindi';

    const prompt = `You are a professional survey researcher designing voice survey questions for India.

SURVEY CONFIGURATION:
- Type: ${config.type}
- Name: ${(config.name || 'Untitled Survey').slice(0, 200)}
- Primary Language: ${langName} (${primaryLanguage})
- Purpose: ${(config.purpose || '').slice(0, MAX_FIELD_LENGTH)}
- Key Questions to Answer: ${(config.keyQuestions || 'Not specified').slice(0, MAX_FIELD_LENGTH)}
- Target Audience: ${(config.targetAudience || 'General population').slice(0, MAX_FIELD_LENGTH)}
- Geography: ${config.geography || 'National'}
- Tone: ${config.tone || 'conversational'}
- Sensitivity Level: ${config.sensitivity || 'low'}
- Target Duration: ${config.duration || 10} minutes
- Analysis Goals: ${(config.analysisGoals || 'Not specified').slice(0, MAX_FIELD_LENGTH)}
- Brand Names (if market research): ${(config.brandNames || 'None').slice(0, MAX_FIELD_LENGTH)}${config.companyContext ? `\n- Company/Organization Context: ${config.companyContext.slice(0, 1500)}` : ''}

INSTRUCTIONS:
1. Generate the right number of questions based on the target duration above. A voice conversation covers roughly 2-3 questions per minute.
2. Each question MUST be written in ${langName} script as the primary text, with an English translation.
3. Questions should feel natural for a voice conversation.
4. Include a mix of question types: single choice, multiple choice, likert scale, rating, open-ended, yes/no as appropriate.
5. Order questions from easy/comfortable to more sensitive/complex (funnel approach).
6. Make questions specific to the stated purpose.
7. Do NOT include demographic questions (age, gender) — those are added automatically.
8. For likert type, always use exactly 5 options from negative to positive.
9. For rating type, set min=1, max=10. For nps type, set min=0, max=10.
10. Also generate a short greetingTopic (2-5 words).

Call the generate_survey_questions tool with all the questions and the greetingTopic.`;

    const questionTool = {
      name: 'generate_survey_questions',
      description: 'Output the generated survey questions as structured data',
      input_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                type: { type: 'string', enum: ['single', 'multiple', 'likert', 'rating', 'nps', 'open', 'yes_no'] },
                text: { type: 'string' },
                textEn: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                required: { type: 'boolean' },
                category: { type: 'string' },
                min: { type: 'number' },
                max: { type: 'number' },
              },
              required: ['id', 'type', 'text', 'textEn', 'required', 'category'],
            },
          },
          greetingTopic: { type: 'string' },
        },
        required: ['questions', 'greetingTopic'],
      },
    };

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      tools: [questionTool],
      tool_choice: { type: 'tool', name: 'generate_survey_questions' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock) {
      return res.status(500).json({ error: { code: 'GENERATION_FAILED', message: 'AI did not return questions' } });
    }

    const { questions, greetingTopic } = toolBlock.input;
    res.json({ data: { questions, greetingTopic } });
  }));

  router.get('/surveys', wrap(async (req, res) => {
    const cursor = req.query.cursor || null;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await listSurveys(req.user.id, { cursor, limit });
    res.json({ data: result.data, pagination: { cursor: result.cursor, hasMore: result.hasMore } });
  }));

  router.get('/surveys/:name', wrap(async (req, res) => {
    const survey = await getSurveyByName(req.user.id, decodeURIComponent(req.params.name));
    if (!survey) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Survey not found' } });
    res.json({ data: survey });
  }));

  router.get('/surveys/:name/config', wrap(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const survey = await getSurveyByName(req.user.id, name);
    if (survey) return res.json({ data: survey.config });

    // Fallback: look up config from most recent call
    const config = await getProjectSurveyConfig(name, req.user.id);
    if (!config) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Survey config not found' } });
    res.json({ data: config });
  }));

  router.put('/surveys/:name', wrap(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const existing = await getSurveyByName(req.user.id, name);
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Survey not found' } });

    const { questions, purpose, tone, duration, greetingTopic, companyName, companyContext, targetAudience, geography, sensitivity, keyQuestions, analysisGoals, brandNames } = req.body;

    // Merge with existing config
    const config = { ...existing.config };
    if (questions) {
      const qErr = validateQuestions(questions);
      if (qErr) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: qErr } });
      config.questions = questions;
    }
    if (purpose !== undefined) config.purpose = purpose;
    if (tone !== undefined) config.tone = tone;
    if (duration !== undefined) config.duration = Math.min(Math.max(1, duration), 30);
    if (greetingTopic !== undefined) config.greetingTopic = greetingTopic;
    if (companyName !== undefined) config.companyName = companyName;
    if (companyContext !== undefined) config.companyContext = companyContext;
    if (targetAudience !== undefined) config.targetAudience = targetAudience;
    if (geography !== undefined) config.geography = VALID_GEOGRAPHIES.has(geography) ? geography : config.geography;
    if (sensitivity !== undefined) config.sensitivity = sensitivity;
    if (keyQuestions !== undefined) config.keyQuestions = keyQuestions;
    if (analysisGoals !== undefined) config.analysisGoals = analysisGoals;
    if (brandNames !== undefined) config.brandNames = brandNames;

    const updated = await updateSurvey(req.user.id, name, config);
    res.json({ data: updated });
  }));

  router.delete('/surveys/:name', wrap(async (req, res) => {
    const deleted = await deleteSurvey(req.user.id, decodeURIComponent(req.params.name));
    if (!deleted) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Survey not found' } });
    res.json({ data: { deleted: true } });
  }));

  // ==========================================
  // Calls
  // ==========================================

  router.post('/calls', wrap(async (req, res) => {
    const { phoneNumber, surveyName, language, gender, autoDetectLanguage } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'phoneNumber is required' } });
    }

    const cleaned = phoneNumber.replace(/[\s\-().]/g, '');
    if (!/^\+\d{8,15}$/.test(cleaned)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Phone number must be in E.164 format (e.g. +919876543210)' } });
    }

    // Resolve survey config
    let customSurvey = null;
    if (surveyName) {
      const survey = await getSurveyByName(req.user.id, surveyName);
      if (!survey) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Survey "${surveyName}" not found` } });
      }
      customSurvey = survey.config;
    }

    const lang = VALID_LANGUAGES.has(language) ? language : 'hi';
    const gen = ['male', 'female'].includes(gender) ? gender : 'female';

    const result = await initiateCallFn({
      phoneNumber: cleaned,
      language: lang,
      gender: gen,
      customSurvey,
      autoDetectLanguage: autoDetectLanguage || false,
      userId: req.user.id,
    });

    res.status(201).json({ data: { callId: result.callId, status: result.status } });
  }));

  router.get('/calls', wrap(async (req, res) => {
    const surveyName = req.query.survey || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const cursor = req.query.cursor || null;

    let rows;
    if (surveyName) {
      rows = await getProjectCalls(surveyName, req.user.id);
    } else {
      rows = await getAllCalls(req.user.id);
    }

    // Client-side cursor pagination (simple approach on existing functions)
    let filtered = rows;
    if (cursor) {
      const idx = filtered.findIndex(r => r.id === cursor);
      if (idx >= 0) filtered = filtered.slice(idx + 1);
    }
    const hasMore = filtered.length > limit;
    const data = filtered.slice(0, limit);

    res.json({
      data,
      pagination: { cursor: hasMore ? data[data.length - 1].id : null, hasMore },
    });
  }));

  router.get('/calls/:id', wrap(async (req, res) => {
    const call = await getCallById(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Call not found' } });

    res.json({
      data: {
        id: call.id,
        phoneNumber: call.phone_number,
        status: call.status,
        duration: call.duration,
        language: call.language,
        direction: call.direction,
        transcript: call.transcript,
        extractedData: {
          responses: call.responses,
          demographics: call.demographics,
          structured: call.structured,
          sentiment: call.sentiment,
          summary: call.summary,
        },
        recordingUrl: call.recording_url,
        recordingDuration: call.recording_duration,
        metrics: call.metrics || null,
        startedAt: call.started_at,
        endedAt: call.ended_at,
        surveyName: call.custom_survey?.name || null,
      },
    });
  }));

  router.get('/calls/:id/recording', wrap(async (req, res) => {
    const call = await getCallById(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Call not found' } });
    if (!call.recording_url) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No recording available' } });

    // Proxy the recording from Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const recordingResponse = await fetch(call.recording_url, {
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') },
      signal: AbortSignal.timeout(30_000),
    });

    if (!recordingResponse.ok) {
      return res.status(502).json({ error: { code: 'RECORDING_FETCH_FAILED', message: 'Failed to fetch recording' } });
    }

    res.setHeader('Content-Type', recordingResponse.headers.get('content-type') || 'audio/wav');
    const buffer = Buffer.from(await recordingResponse.arrayBuffer());
    res.send(buffer);
  }));

  // ==========================================
  // Campaigns
  // ==========================================

  router.post('/campaigns', wrap(async (req, res) => {
    const { name, surveyName, phoneNumbers, language, gender, autoDetectLanguage, concurrency, maxRetries, callTiming } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    }
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'phoneNumbers array is required' } });
    }
    if (phoneNumbers.length > 10000) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Maximum 10,000 phone numbers per campaign' } });
    }

    // Resolve survey config
    let surveyConfig = null;
    if (surveyName) {
      const survey = await getSurveyByName(req.user.id, surveyName);
      if (!survey) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Survey "${surveyName}" not found` } });
      }
      surveyConfig = survey.config;
    } else if (req.body.surveyConfig) {
      // Validate inline config has required fields
      const sc = req.body.surveyConfig;
      if (!sc || typeof sc !== 'object' || !sc.name || !sc.questions) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'surveyConfig must include name and questions' } });
      }
      const qErr = validateQuestions(sc.questions);
      if (qErr) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `surveyConfig.questions: ${qErr}` } });
      }
      surveyConfig = sc;
    } else {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'surveyName or surveyConfig is required' } });
    }

    const campaign = await createCampaign(req.user.id, {
      name: name.trim(),
      surveyConfig,
      language: VALID_LANGUAGES.has(language) ? language : 'hi',
      gender: ['male', 'female'].includes(gender) ? gender : 'female',
      autoDetectLanguage: autoDetectLanguage || false,
      concurrency: Math.min(Math.max(1, concurrency || 2), 2),
      maxRetries: Math.min(Math.max(0, maxRetries ?? 3), 10),
      callTiming: callTiming || ['morning', 'afternoon', 'evening'],
    });

    // Validate and normalize phone numbers
    const validated = [];
    const invalid = [];
    for (let i = 0; i < phoneNumbers.length; i++) {
      const entry = phoneNumbers[i];
      let phone, metadata = null;
      if (typeof entry === 'string') {
        phone = entry;
      } else if (entry && typeof entry === 'object' && entry.phoneNumber) {
        phone = entry.phoneNumber;
        metadata = entry.metadata || null;
      } else {
        invalid.push({ index: i, reason: 'Invalid entry format' });
        continue;
      }
      const cleaned = validateE164(phone);
      if (!cleaned) {
        invalid.push({ index: i, phone, reason: 'Invalid E.164 format' });
        continue;
      }
      validated.push(metadata ? { phoneNumber: cleaned, metadata } : cleaned);
    }

    if (validated.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid phone numbers provided', invalid } });
    }

    await addCampaignNumbers(campaign.id, validated);

    res.status(201).json({
      data: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        phoneNumbersQueued: validated.length,
        phoneNumbersRejected: invalid.length,
        ...(invalid.length > 0 ? { invalidNumbers: invalid.slice(0, 20) } : {}),
      },
    });
  }));

  router.get('/campaigns', wrap(async (req, res) => {
    const campaigns = await getCampaignsByUser(req.user.id);
    res.json({ data: campaigns });
  }));

  router.get('/campaigns/:id', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }
    res.json({ data: campaign });
  }));

  router.post('/campaigns/:id/start', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }
    const runner = campaignRunnerRef();
    if (!runner) return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Campaign runner not ready' } });

    await runner.startCampaign(campaign.id, { force: req.body.force || false });
    res.json({ data: { status: 'running' } });
  }));

  router.post('/campaigns/:id/pause', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }
    const runner = campaignRunnerRef();
    if (!runner) return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Campaign runner not ready' } });

    await runner.pauseCampaign(campaign.id);
    res.json({ data: { status: 'paused' } });
  }));

  router.post('/campaigns/:id/cancel', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }
    const runner = campaignRunnerRef();
    if (!runner) return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Campaign runner not ready' } });

    await runner.cancelCampaign(campaign.id);
    res.json({ data: { status: 'cancelled' } });
  }));

  router.get('/campaigns/:id/progress', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }
    const counts = await getProgressCounts(campaign.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const done = (counts.completed || 0) + (counts.failed || 0) + (counts.no_answer || 0) + (counts.voicemail || 0);
    res.json({
      data: {
        status: campaign.status,
        ...counts,
        total,
        percentComplete: total > 0 ? Math.round((done / total) * 100) : 0,
      },
    });
  }));

  router.get('/campaigns/:id/numbers', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }

    const numbers = await getCampaignNumbersByCampaign(campaign.id);
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const page = numbers.slice(offset, offset + limit);

    res.json({ data: page, pagination: { total: numbers.length, offset, limit, hasMore: offset + limit < numbers.length } });
  }));

  router.get('/campaigns/:id/results', wrap(async (req, res) => {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign || campaign.user_id !== req.user.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    }

    // Get calls that belong to this specific campaign (by campaign_id, not survey name)
    const { getCampaignCalls } = await import('../db.js');
    const calls = await getCampaignCalls(campaign.id, req.user.id);
    res.json({ data: calls });
  }));

  // ==========================================
  // Analytics & Exports
  // ==========================================

  router.get('/surveys/:name/analytics', wrap(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const analytics = await getProjectAnalytics(name, req.user.id);
    if (!analytics) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No analytics data found' } });
    res.json({ data: analytics });
  }));

  router.get('/surveys/:name/responses', wrap(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const breakdowns = await getProjectResponseBreakdowns(name, req.user.id);
    if (!breakdowns) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No response data found' } });
    res.json({ data: breakdowns });
  }));

  router.get('/surveys/:name/export', wrap(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const format = req.query.format || 'json';

    if (format === 'csv') {
      const csv = await exportProjectCallsCsv(name, req.user.id);
      if (!csv) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No data to export' } });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^a-z0-9]/gi, '_')}_export.csv"`);
      return res.send(csv);
    }

    const data = await exportProjectCallsJson(name, req.user.id);
    res.json({ data });
  }));

  // ==========================================
  // Webhooks
  // ==========================================

  router.post('/webhooks', wrap(async (req, res) => {
    const { url, events } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'url is required' } });
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'url must be a valid URL' } });
    }
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Webhook URL must use HTTPS' } });
    }

    // SSRF protection: block private/reserved IPs
    const safe = await validateWebhookUrl(url);
    if (!safe) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Webhook URL must not point to private or internal addresses' } });
    }

    const validEvents = ['call.completed', 'call.failed', 'campaign.completed'];
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `events array is required. Valid: ${validEvents.join(', ')}` } });
    }
    const filtered = events.filter(e => validEvents.includes(e));
    if (filtered.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `No valid events. Valid: ${validEvents.join(', ')}` } });
    }

    const result = await createWebhook(req.user.id, url, filtered);
    res.status(201).json({ data: result });
  }));

  router.get('/webhooks', wrap(async (req, res) => {
    const webhooks = await listWebhooks(req.user.id);
    res.json({ data: webhooks });
  }));

  router.delete('/webhooks/:id', wrap(async (req, res) => {
    const deleted = await deleteWebhook(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
    res.json({ data: { deleted: true } });
  }));

  router.get('/webhooks/:id/deliveries', wrap(async (req, res) => {
    // Verify webhook belongs to this user before returning deliveries
    const webhook = await getWebhookById(req.user.id, req.params.id);
    if (!webhook) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });

    const limit = parseInt(req.query.limit, 10) || 20;
    const deliveries = await getDeliveries(req.params.id, { limit });
    res.json({ data: deliveries });
  }));

  router.post('/webhooks/:id/test', wrap(async (req, res) => {
    const webhook = await getWebhookById(req.user.id, req.params.id);
    if (!webhook) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });

    // Send a test event
    const testPayload = {
      event: 'test',
      message: 'This is a test webhook delivery from VoxBharat',
      webhookId: webhook.id,
    };

    // Use dispatchWebhook-like logic but single delivery
    const body = JSON.stringify({ ...testPayload, timestamp: new Date().toISOString() });
    const hmac = crypto.createHmac('sha256', webhook.secret);
    hmac.update(body);
    const signature = 'sha256=' + hmac.digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VoxBharat-Signature': signature,
          'X-VoxBharat-Event': 'test',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      res.json({ data: { delivered: response.ok, statusCode: response.status } });
    } catch (err) {
      res.json({ data: { delivered: false, error: err.message } });
    }
  }));

  return router;
}
