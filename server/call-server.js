// VoxBharat Call Server - Twilio + Cartesia STT/TTS + Claude
// Handles real phone calls with AI voice surveys

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import twilio from 'twilio';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mulawToPcm16k, pcm16kToMulaw } from './audio-convert.js';
import { generateSpeech, chunkAudio, CartesiaTTSStream } from './cartesia-tts.js';
import { CartesiaSTT } from './cartesia-stt.js';
import { ClaudeConversation } from './claude-conversation.js';
import {
  createCall, getCall, getCallByStreamSid, updateCall,
  getActiveCalls, removeCall, saveCallToFile
} from './call-store.js';
import {
  initDb, updateCallRecording, isDbReady,
  getAllCalls, getCallById, getAnalytics,
  exportCallsJson, exportCallsCsv, deleteCall,
  getProjects, getProjectCalls, getProjectAnalytics, getProjectResponseBreakdowns,
  exportProjectCallsJson, exportProjectCallsCsv,
  createUser, verifyUser, getUserByEmail,
  createCampaign, getCampaignById, getCampaignsByUser,
  updateCampaignStatus, updateCampaignProgress,
  addCampaignNumbers, getCampaignNumbersByCampaign, getProgressCounts,
  createInboundConfig, getInboundConfigById, getInboundConfigsByUser,
  getInboundConfigByNumber, updateInboundConfig, deleteInboundConfig,
  toggleInboundConfig, findCallerInCampaigns, completeCampaignCallback,
  getBucketMappings, saveBucketMappingsBatch, deleteBucketMapping,
} from './db.js';
import { CampaignRunner } from './campaign-runner.js';
import { getVoicemailMessage, SURVEY_SCRIPTS, generateCustomGreeting, generateInboundGreeting, generateCallbackGreeting } from './survey-scripts.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Config
const PORT = parseInt(process.env.PORT, 10) || 3002;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const CARTESIA_KEY = process.env.CARTESIA_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'voxbharat_default_jwt_secret_change_me';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFY_EMAIL = 'ary.lakhoti@gmail.com';

const mailTransport = GMAIL_USER && GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  : null;

async function notifySignup(email, name) {
  if (!mailTransport) return;
  try {
    await mailTransport.sendMail({
      from: `VoxBharat <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `New VoxBharat signup: ${email}`,
      text: `New user signed up:\n\nEmail: ${email}\nName: ${name || '(not provided)'}\nTime: ${new Date().toISOString()}`,
    });
  } catch (e) {
    console.error('Signup notification email failed:', e.message);
  }
}

// Validate config
const missing = [];
if (!TWILIO_SID) missing.push('TWILIO_ACCOUNT_SID');
if (!TWILIO_AUTH) missing.push('TWILIO_AUTH_TOKEN');
if (!TWILIO_PHONE) missing.push('TWILIO_PHONE_NUMBER');
if (!CARTESIA_KEY) missing.push('CARTESIA_API_KEY');
if (!ANTHROPIC_KEY) missing.push('ANTHROPIC_API_KEY');
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  console.error('Copy server/.env.example to server/.env and fill in values');
  process.exit(1);
}

// Initialize
const twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Per-call state: conversation instances, STT sessions, timers
const callSessions = new Map();

// Pre-generated greeting audio cache: callId -> { mulawBase64: string, language: string }
// Generated during call initiation (while phone is ringing) so greeting plays instantly on pickup
const greetingAudioCache = new Map();
let campaignRunner = null;

/**
 * Check if STT text is likely echo of recently spoken TTS audio.
 * On phone calls, the phone mic can pick up the AI's voice from the speaker.
 */
function isLikelyEcho(sttText, recentTtsTexts) {
  if (!recentTtsTexts || recentTtsTexts.length === 0) return false;
  const stt = sttText.toLowerCase().trim();
  if (stt.length < 3) return true; // Too short, treat as noise

  for (const tts of recentTtsTexts) {
    const ttsLower = tts.toLowerCase();
    // If STT text is fully contained within recent TTS text, it's echo
    if (ttsLower.includes(stt)) return true;
    // If first 12 chars match, likely same sentence being echoed back
    if (stt.length >= 12 && ttsLower.startsWith(stt.substring(0, 12))) return true;
  }
  return false;
}

/**
 * Check if short speech is a back-channel (active listening signal, not an interruption).
 * Indian conversational style uses frequent "haan haan" / "accha" while listening.
 * These should NOT stop the AI from speaking.
 */
const BACKCHANNEL_TOKENS = new Set([
  // English
  'uh huh', 'uh-huh', 'mm hmm', 'mmhmm', 'mm', 'hmm', 'hm',
  'yeah', 'yep', 'yup', 'ok', 'okay', 'right', 'sure', 'got it', 'i see',
  // Hindi / Urdu
  'haan', 'ha', 'haan haan', 'han', 'accha', 'achha', 'acha',
  'theek hai', 'thik hai', 'theek', 'thik', 'ji', 'ji haan', 'ji ha',
  'sahi', 'sahi hai', 'aur', 'phir', 'haan ji',
  // Bengali
  'hyan', 'thik ache', 'thik', 'besh', 'accha',
  // Gujarati
  'ha', 'bhai', 'barabar',
  // Tamil
  'aamaa', 'seri', 'sari',
  // Telugu
  'avunu', 'sare',
  // Marathi
  'ho', 'bara', 'barobar',
  // Punjabi
  'haanji', 'theek aa',
]);

function isBackchannel(normalizedText) {
  // Direct match
  if (BACKCHANNEL_TOKENS.has(normalizedText)) return true;
  // Check if text is just repeated tokens ("haan haan haan")
  const words = normalizedText.split(/\s+/);
  if (words.length <= 3 && words.every(w => BACKCHANNEL_TOKENS.has(w))) return true;
  return false;
}

/**
 * Detect hesitation / filler words that indicate the user is still thinking.
 * When detected, the silence timer is extended to avoid cutting them off mid-thought.
 */
const HESITATION_TOKENS = new Set([
  // English
  'um', 'umm', 'uh', 'uhh', 'er', 'err', 'ah', 'ahh',
  'like', 'so', 'well', 'let me think', 'how do i say', 'you know',
  // Hindi / Urdu
  'matlab', 'kya bolu', 'kaise bolu', 'woh', 'toh', 'dekhiye', 'basically',
  // Bengali
  'mane', 'ki boli',
  // Generic fillers
  'hmm', 'hmmm',
]);

function isHesitation(normalizedText) {
  if (HESITATION_TOKENS.has(normalizedText)) return true;
  if (normalizedText.length < 12 && /^(um+|uh+|er+|ah+|hmm+)$/.test(normalizedText)) return true;
  return false;
}

/**
 * Detect if the user is asking for a question to be repeated.
 * Returns true for phrases like "what?", "repeat that", "phir se bolo", "I didn't hear", etc.
 */
const REPEAT_PATTERNS = [
  // English
  /^what\??$/, /^huh\??$/, /^sorry\??$/, /^excuse me\??$/, /^pardon\??$/,
  /repeat/, /say that again/, /say again/, /one more time/, /come again/,
  /didn.?t (hear|catch|understand|get)/, /can.?t hear/, /what did you (say|ask)/,
  /what was that/, /what.?s that/,
  // Hindi / Urdu
  /kya\??$/, /kya bola/, /kya kaha/, /phir se/, /dobara/, /fir se/,
  /samajh nahi/, /sunai nahi/, /suna nahi/, /nahi suna/, /nahi samjha/,
  /ek baar aur/, /ek bar aur/, /wapas bolo/, /dubara bolo/,
  // Bengali
  /ki bolle/, /abar bolo/, /bujhini/, /shunini/,
  // Tamil
  /enna/, /puriyala/, /marubadiyum/,
  // Telugu
  /enti/, /artham kaale/, /malli cheppu/,
  // Marathi
  /kay mhanale/, /punha sanga/, /kalale nahi/,
];

function isRepeatRequest(normalizedText) {
  return REPEAT_PATTERNS.some(p => p.test(normalizedText));
}

/**
 * Convert Anthropic SDK event-based stream to async iterator of text deltas.
 * SDK v0.73.0 doesn't have .textStream — uses .on('text') events instead.
 */
function textIteratorFromStream(stream) {
  const queue = [];
  let done = false;
  let waitResolve = null;

  stream.on('text', (text) => {
    queue.push(text);
    if (waitResolve) { waitResolve(); waitResolve = null; }
  });

  stream.on('message', () => {
    done = true;
    if (waitResolve) { waitResolve(); waitResolve = null; }
  });

  stream.on('error', () => {
    done = true;
    if (waitResolve) { waitResolve(); waitResolve = null; }
  });

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          while (queue.length === 0 && !done) {
            await new Promise(r => { waitResolve = r; });
          }
          if (queue.length > 0) {
            return { value: queue.shift(), done: false };
          }
          return { done: true, value: undefined };
        }
      };
    }
  };
}

// ============================================
// HTTP Endpoints
// ============================================

// Health check
app.get('/call/health', (req, res) => {
  res.json({ status: 'ok', activeCalls: getActiveCalls().length });
});

// Core call initiation logic — used by both HTTP endpoint and campaign runner
async function initiateCall({ phoneNumber, language = 'hi', gender = 'female', customSurvey = null, autoDetectLanguage = false, campaignId = null }) {
  const call = createCall({ phoneNumber, language, gender, customSurvey, autoDetectLanguage, campaignId });

  const twilioCall = await twilioClient.calls.create({
    to: phoneNumber,
    from: TWILIO_PHONE,
    url: `${PUBLIC_URL}/call/twilio-webhook?callId=${call.id}`,
    statusCallback: `${PUBLIC_URL}/call/twilio-status?callId=${call.id}`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    record: true,
    recordingStatusCallback: `${PUBLIC_URL}/call/recording-callback?callId=${call.id}`,
    recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: ['completed'],
    machineDetection: 'DetectMessageEnd',
    asyncAmdStatusCallback: `${PUBLIC_URL}/call/amd-callback?callId=${call.id}`,
    asyncAmdStatusCallbackMethod: 'POST',
  });

  updateCall(call.id, { twilioCallSid: twilioCall.sid, status: 'ringing' });
  console.log(`[Call] Initiated: ${call.id} -> ${phoneNumber} (${language}/${gender})${campaignId ? ` [campaign:${campaignId}]` : ''}`);

  // Pre-generate greeting TTS while phone is ringing
  const greetingLang = autoDetectLanguage ? 'en' : language;
  let greetingText;
  if (autoDetectLanguage) {
    greetingText = customSurvey
      ? `<emotion value="enthusiastic"/> Hello! I'm an AI agent calling from VoxBharat to conduct a survey about ${customSurvey.name}. Do you have a few minutes to share your thoughts?`
      : `<emotion value="enthusiastic"/> Hello! I'm an AI agent calling from VoxBharat. We're conducting a short survey about people's lives and experiences. It'll only take a few minutes. Shall we begin?`;
  } else if (customSurvey) {
    greetingText = generateCustomGreeting(language, gender, customSurvey.name);
  } else if (SURVEY_SCRIPTS[language]) {
    greetingText = SURVEY_SCRIPTS[language].greeting;
  } else {
    greetingText = generateCustomGreeting(language, gender, 'VoxBharat Survey');
  }

  generateSpeech(greetingText, greetingLang, gender, CARTESIA_KEY, { speed: 1.0 })
    .then(mulawBase64 => {
      greetingAudioCache.set(call.id, { mulawBase64, language: greetingLang });
      console.log(`[Call:${call.id}] Greeting audio pre-cached`);
    })
    .catch(err => {
      console.warn(`[Call:${call.id}] Greeting pre-cache failed (will generate on pickup): ${err.message}`);
    });

  return { callId: call.id, twilioSid: twilioCall.sid, status: 'ringing' };
}

// Initiate an outbound call (HTTP endpoint)
app.post('/call/initiate', async (req, res) => {
  const { phoneNumber, language, gender, customSurvey, autoDetectLanguage } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required' });
  }

  try {
    const result = await initiateCall({ phoneNumber, language, gender, customSurvey, autoDetectLanguage });
    res.json(result);
  } catch (error) {
    console.error('[Call] Initiation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Twilio webhook - returns TwiML to connect media stream
app.post('/call/twilio-webhook', (req, res) => {
  const callId = req.query.callId;
  const wsUrl = PUBLIC_URL.replace('http', 'ws');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/call/media-stream" statusCallback="${PUBLIC_URL}/call/twilio-status?callId=${callId}">
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

// Inbound call webhook — Twilio sends POST here when someone calls our number
app.post('/call/inbound', async (req, res) => {
  const callerNumber = req.body.From;
  const twilioNumber = req.body.To;
  const twilioCallSid = req.body.CallSid;

  console.log(`[Inbound] Incoming call from ${callerNumber} to ${twilioNumber} (SID: ${twilioCallSid})`);

  // Capacity check — reject if at concurrent limit
  if (getActiveCalls().length >= 2) {
    console.log(`[Inbound] Rejecting — at capacity (2 concurrent calls)`);
    return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">All our agents are currently busy. Please try again in a few minutes. Thank you.</Say>
  <Hangup/>
</Response>`);
  }

  let surveyConfig = null;
  let language = 'hi';
  let gender = 'female';
  let autoDetectLanguage = false;
  let campaignId = null;
  let customGreeting = null;
  let inboundConfigId = null;

  // 1. Check if caller is a campaign callback (missed call, calling back)
  const campaignMatch = await findCallerInCampaigns(callerNumber);
  if (campaignMatch) {
    console.log(`[Inbound] Campaign callback detected — campaign: ${campaignMatch.campaign_id}, survey: ${campaignMatch.name}`);
    surveyConfig = campaignMatch.survey_config;
    language = campaignMatch.language || 'hi';
    gender = campaignMatch.gender || 'female';
    autoDetectLanguage = campaignMatch.auto_detect_language || false;
    campaignId = campaignMatch.campaign_id;
  } else {
    // 2. Check for standalone inbound config on this number
    const config = await getInboundConfigByNumber(twilioNumber);
    if (config && config.enabled) {
      console.log(`[Inbound] Standalone config found: "${config.name}" (id: ${config.id})`);
      surveyConfig = config.survey_config;
      language = config.language || 'hi';
      gender = config.gender || 'female';
      autoDetectLanguage = config.auto_detect_language || false;
      customGreeting = config.greeting_text || null;
      inboundConfigId = config.id;
    } else {
      // No config for this number — reject gracefully
      console.log(`[Inbound] No inbound config found for ${twilioNumber} — rejecting`);
      return res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This number is not currently configured to receive calls. Thank you for calling.</Say>
  <Hangup/>
</Response>`);
    }
  }

  // Create call record
  const call = createCall({
    phoneNumber: callerNumber,
    language,
    gender,
    customSurvey: surveyConfig,
    autoDetectLanguage,
    campaignId,
    direction: 'inbound',
  });

  updateCall(call.id, {
    twilioCallSid,
    status: 'ringing',
    customGreeting,
    inboundConfigId,
  });

  // Pre-generate greeting TTS
  const greetingLang = autoDetectLanguage ? 'en' : language;
  const surveyName = surveyConfig?.name || 'our survey';
  let greetingText;
  if (campaignId) {
    greetingText = generateCallbackGreeting(greetingLang, gender, surveyName);
  } else {
    greetingText = customGreeting || generateInboundGreeting(greetingLang, gender, surveyName);
  }

  generateSpeech(greetingText, greetingLang, gender, CARTESIA_KEY, { speed: 1.0 })
    .then(mulawBase64 => {
      greetingAudioCache.set(call.id, { mulawBase64, language: greetingLang });
      console.log(`[Inbound:${call.id}] Greeting audio pre-cached`);
    })
    .catch(err => {
      console.warn(`[Inbound:${call.id}] Greeting pre-cache failed: ${err.message}`);
    });

  // Start recording for inbound call
  twilioClient.calls(twilioCallSid).recordings.create({
    recordingStatusCallback: `${PUBLIC_URL}/call/recording-callback?callId=${call.id}`,
    recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: ['completed'],
  }).then(rec => {
    console.log(`[Inbound:${call.id}] Recording started: ${rec.sid}`);
    updateCall(call.id, { recordingSid: rec.sid });
  }).catch(err => {
    console.warn(`[Inbound:${call.id}] Recording start failed: ${err.message}`);
  });

  // Return TwiML to connect media stream (same as outbound webhook)
  const wsUrl = PUBLIC_URL.replace('http', 'ws');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/call/media-stream" statusCallback="${PUBLIC_URL}/call/twilio-status?callId=${call.id}">
      <Parameter name="callId" value="${call.id}" />
    </Stream>
  </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

// Twilio status callback
app.post('/call/twilio-status', (req, res) => {
  const callId = req.query.callId;
  const status = req.body.CallStatus;

  if (callId) {
    console.log(`[Call] Status: ${callId} -> ${status}`);
    if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
      handleCallEnd(callId, status);
    }
  }

  res.sendStatus(200);
});

// Twilio AMD (Answering Machine Detection) callback
app.post('/call/amd-callback', async (req, res) => {
  const callId = req.query.callId;
  const answeredBy = req.body.AnsweredBy; // 'human' | 'machine_end_beep' | 'machine_end_silence' | 'machine_end_other' | 'fax' | 'unknown'

  console.log(`[AMD] Call ${callId}: ${answeredBy}`);
  res.sendStatus(200); // Respond immediately so Twilio doesn't retry

  if (!callId) return;
  const call = getCall(callId);
  if (!call) return;

  updateCall(callId, { answeredBy });

  // Only act on voicemail detection (after the beep)
  const isVoicemail = answeredBy === 'machine_end_beep' || answeredBy === 'machine_end_silence' || answeredBy === 'machine_end_other';
  if (!isVoicemail) return;

  console.log(`[AMD:${callId}] Voicemail detected — leaving message...`);

  const session = callSessions.get(callId);
  if (!session || session.isEnding) return;

  // Flag session as voicemail so normal survey flow stops
  session.isVoicemail = true;
  session.isAiSpeaking = false;
  session.isProcessing = false;

  // Clear any queued audio (stop AI greeting/response)
  if (session.ws.readyState === 1) {
    session.ws.send(JSON.stringify({
      event: 'clear',
      streamSid: session.streamSid,
    }));
  }

  // Generate and stream voicemail message
  const language = session.currentLanguage || call.language;
  const surveyName = call.customSurvey?.name || null;
  const voicemailText = getVoicemailMessage(language, call.gender, surveyName);

  console.log(`[AMD:${callId}] Voicemail (${language}): "${voicemailText.substring(0, 60)}..."`);

  try {
    await speakSentence(session, voicemailText, language);

    // Mark when voicemail audio finishes playing — triggers hangup in WS handler
    if (session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({
        event: 'mark',
        streamSid: session.streamSid,
        mark: { name: 'voicemail-done' },
      }));
    }

    updateCall(callId, { voicemailLeft: true, status: 'voicemail' });

    // Fallback hangup if mark event never arrives (e.g. WebSocket drops)
    setTimeout(async () => {
      if (!session.isEnding) {
        console.log(`[AMD:${callId}] Fallback hangup (mark event not received)`);
        try {
          if (call.twilioCallSid) {
            await twilioClient.calls(call.twilioCallSid).update({ status: 'completed' });
          }
        } catch (e) { /* ignore */ }
        handleCallEnd(callId, 'voicemail');
      }
    }, 15000);
  } catch (error) {
    console.error(`[AMD:${callId}] Voicemail TTS error:`, error.message);
    updateCall(callId, { status: 'voicemail-failed' });
    handleCallEnd(callId, 'voicemail-failed');
  }
});

// Twilio recording callback — fires when recording is ready
app.post('/call/recording-callback', (req, res) => {
  const callId = req.query.callId;
  const { RecordingSid, RecordingUrl, RecordingDuration, RecordingStatus } = req.body;

  res.sendStatus(200);

  if (!callId || RecordingStatus !== 'completed') return;

  // Twilio recording URL (append .mp3 for direct download)
  const recordingUrl = `${RecordingUrl}.mp3`;
  const durationSec = parseInt(RecordingDuration, 10) || null;

  console.log(`[Recording] Call ${callId}: ${recordingUrl} (${durationSec}s)`);

  updateCall(callId, {
    recordingSid: RecordingSid,
    recordingUrl,
    recordingDuration: durationSec,
  });

  // Also persist to Postgres (call may already be cleaned up from memory)
  updateCallRecording(callId, RecordingSid, recordingUrl, durationSec).catch(err => {
    console.error(`[Recording] Postgres update failed for ${callId}:`, err.message);
  });
});

// List active calls
app.get('/call/active', (req, res) => {
  res.json(getActiveCalls());
});

// Get call details
app.get('/call/:id', (req, res) => {
  const call = getCall(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
});

// Force-end a call
app.post('/call/:id/end', async (req, res) => {
  const call = getCall(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });

  try {
    if (call.twilioCallSid) {
      await twilioClient.calls(call.twilioCallSid).update({ status: 'completed' });
    }
    await handleCallEnd(call.id, 'force-ended');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dashboard Auth + Survey / Analytics API
// ============================================

const requireDb = (req, res, next) => {
  if (!isDbReady()) return res.status(503).json({ error: 'Database unavailable' });
  next();
};

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Signup endpoint
app.post('/api/signup', requireDb, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const user = await createUser(email, password, name);
    const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, name: user.name });
    notifySignup(email, name);
  } catch (e) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login endpoint
app.post('/api/login', requireDb, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await verifyUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, name: user.name });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token endpoint
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ email: req.user.email });
});

app.get('/api/surveys', requireAuth, requireDb, async (req, res) => {
  try { res.json(await getAllCalls()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/surveys/:id', requireAuth, requireDb, async (req, res) => {
  try {
    const survey = await getCallById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    res.json(survey);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics', requireAuth, requireDb, async (req, res) => {
  try { res.json(await getAnalytics()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/export/json', requireAuth, requireDb, async (req, res) => {
  try {
    res.setHeader('Content-Disposition', 'attachment; filename=voxbharat-export.json');
    res.json(await exportCallsJson());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/export/csv', requireAuth, requireDb, async (req, res) => {
  try {
    const csv = await exportCallsCsv();
    if (!csv) return res.status(404).json({ error: 'No data' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=voxbharat-export.csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/surveys/:id', requireAuth, requireDb, async (req, res) => {
  try {
    const ok = await deleteCall(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects', requireAuth, requireDb, async (req, res) => {
  try { res.json(await getProjects()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:name/calls', requireAuth, requireDb, async (req, res) => {
  try { res.json(await getProjectCalls(req.params.name)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:name/analytics', requireAuth, requireDb, async (req, res) => {
  try {
    const analytics = await getProjectAnalytics(req.params.name);
    if (!analytics) return res.status(404).json({ error: 'No data' });
    res.json(analytics);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:name/response-breakdowns', requireAuth, requireDb, async (req, res) => {
  try {
    const data = await getProjectResponseBreakdowns(req.params.name);
    if (!data) return res.status(404).json({ error: 'No data' });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:name/export/json', requireAuth, requireDb, async (req, res) => {
  try {
    const data = await exportProjectCallsJson(req.params.name);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(req.params.name)}-export.json"`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:name/export/csv', requireAuth, requireDb, async (req, res) => {
  try {
    const csv = await exportProjectCallsCsv(req.params.name);
    if (!csv) return res.status(404).json({ error: 'No data' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(req.params.name)}-export.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Bucket Mappings ─────────────────────────────────
app.get('/api/projects/:name/bucket-mappings', requireAuth, requireDb, async (req, res) => {
  try {
    const mappings = await getBucketMappings(req.params.name);
    res.json(mappings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects/:name/bucket-mappings', requireAuth, requireDb, async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array required' });
    await saveBucketMappingsBatch(req.params.name, mappings);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/projects/:name/bucket-mappings', requireAuth, requireDb, async (req, res) => {
  try {
    const { field, rawValue } = req.body;
    if (!field || !rawValue) return res.status(400).json({ error: 'field and rawValue required' });
    await deleteBucketMapping(req.params.name, field, rawValue);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/calls/:id/recording', requireAuth, requireDb, async (req, res) => {
  try {
    const call = await getCallById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Call not found' });
    if (!call.recording_url) return res.status(404).json({ error: 'No recording available' });

    const twilioAuth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const upstream = await fetch(call.recording_url, {
      headers: { Authorization: `Basic ${twilioAuth}` },
    });

    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Failed to fetch recording' });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="call-${req.params.id.slice(0, 8)}.mp3"`);

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    await pump();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// WebSocket - Twilio Media Stream
// ============================================

const wss = new WebSocketServer({ server, path: '/call/media-stream' });

wss.on('connection', (ws) => {
  let callId = null;
  let streamSid = null;
  let session = null;
  let mediaPackets = 0;

  console.log('[WS] New Twilio media stream connection');

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case 'connected':
          console.log('[WS] Media stream connected');
          break;

        case 'start':
          // Extract call ID from custom parameters
          callId = msg.start.customParameters?.callId;
          streamSid = msg.start.streamSid;

          if (!callId) {
            console.error('[WS] No callId in stream parameters');
            ws.close();
            return;
          }

          const call = getCall(callId);
          if (!call) {
            console.error(`[WS] Call not found: ${callId}`);
            ws.close();
            return;
          }

          updateCall(callId, {
            streamSid,
            status: 'connected',
            connectedAt: new Date().toISOString(),
          });

          // Initialize session
          session = await initSession(callId, call, ws, streamSid);
          callSessions.set(callId, session);

          // Send greeting
          await sendGreeting(session);
          break;

        case 'media':
          if (!session || session.isEnding || session.isVoicemail) break;
          mediaPackets++;
          if (mediaPackets % 500 === 1) {
            console.log(`[WS] Media packets: ${mediaPackets}, isAiSpeaking: ${session.isAiSpeaking}, STT connected: ${session.stt.isConnected}`);
          }

          // Skip STT during greeting to avoid echo (AI voice picked up by mic)
          // After greeting, keep STT active during AI speech for barge-in detection
          if (session.isAiSpeaking && !session.greetingDone) break;

          // Convert mulaw 8kHz -> PCM s16le 16kHz and send to STT
          const pcmAudio = mulawToPcm16k(msg.media.payload);
          session.stt.sendAudio(pcmAudio);
          break;

        case 'mark':
          // TTS playback complete
          console.log(`[WS] Mark received: ${msg.mark?.name}`);
          if (session && msg.mark?.name === 'tts-done') {
            session.isAiSpeaking = false;
            console.log('[WS] AI done speaking, now listening for user');
          }
          // Voicemail audio finished playing — hang up
          if (session && msg.mark?.name === 'voicemail-done') {
            console.log(`[WS] Voicemail played, hanging up in 2s...`);
            setTimeout(async () => {
              if (session.isEnding) return;
              try {
                const vmCall = getCall(callId);
                if (vmCall?.twilioCallSid) {
                  await twilioClient.calls(vmCall.twilioCallSid).update({ status: 'completed' });
                }
              } catch (e) {
                console.error(`[WS] Voicemail hangup error:`, e.message);
              }
              handleCallEnd(callId, 'voicemail');
            }, 2000);
          }
          break;

        case 'stop':
          console.log(`[WS] Stream stopped: ${callId}`);
          if (callId) handleCallEnd(callId, 'stream-stopped');
          break;
      }
    } catch (error) {
      console.error('[WS] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed: ${callId}`);
    if (callId) {
      cleanupSession(callId);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error: ${err.message}`);
  });
});

// ============================================
// Session Management
// ============================================

async function initSession(callId, call, ws, streamSid) {
  // Create Claude conversation
  const conversation = new ClaudeConversation(ANTHROPIC_KEY, {
    language: call.language,
    gender: call.gender,
    customSurvey: call.customSurvey || null,
    autoDetectLanguage: call.autoDetectLanguage || false,
    direction: call.direction || 'outbound',
    inboundType: call.direction === 'inbound' ? (call.campaignId ? 'callback' : 'standalone') : null,
    customGreeting: call.customGreeting || null,
  });

  // Persistent TTS WebSocket for streaming (low-latency)
  const ttsStream = new CartesiaTTSStream(CARTESIA_KEY);
  ttsStream.connect().catch(err => console.error(`[TTS:${callId}] Stream connect failed:`, err.message));

  // Session object created first so STT callback can reference it
  const sessionObj = {
    conversation,
    stt: null,
    ttsStream,
    ws,
    streamSid,
    timeout: null,
    silenceTimer: null,
    maxWaitTimer: null,
    isAiSpeaking: false,
    isProcessing: false,
    isEnding: false,
    isVoicemail: false,
    greetingDone: false,
    firstResponseDone: false,  // Track if first Claude response has been sent
    accumulatedText: [],
    recentTtsTexts: [],
    call,
    currentLanguage: call.autoDetectLanguage ? 'en' : call.language,
  };

  // Create Cartesia STT - uses sessionObj directly (no separate closure vars)
  const stt = new CartesiaSTT(CARTESIA_KEY, {
    language: call.autoDetectLanguage ? 'auto' : call.language,
    onTranscript: ({ text, isFinal, language: detectedLang }) => {
      if (sessionObj.isEnding || sessionObj.isVoicemail) return;

      // Track STT-detected language for auto-detect mode
      if (detectedLang && sessionObj.call.autoDetectLanguage) {
        sessionObj.sttDetectedLanguage = detectedLang;
        console.log(`[STT:${callId}] Language field from Cartesia: "${detectedLang}"`);

        // On first non-English detection, reconnect STT with that specific language
        // Auto-detect mode gives us the language but garbles the transcription —
        // reconnecting with the correct language gives clean text for subsequent utterances
        if (detectedLang !== 'en' && !sessionObj.sttLanguageLocked) {
          sessionObj.sttLanguageLocked = true;
          console.log(`[STT:${callId}] Detected ${detectedLang} from audio — reconnecting STT for better transcription...`);
          sessionObj.stt.switchLanguage(detectedLang).catch(err => {
            console.error(`[STT:${callId}] Language switch failed:`, err.message);
            sessionObj.sttLanguageLocked = false; // Allow retry
          });
        }
      }

      // Fallback: if no language field from Cartesia, detect Indic scripts in the text
      if (!detectedLang && sessionObj.call.autoDetectLanguage && !sessionObj.sttLanguageLocked && isFinal && text) {
        const scriptLangMap = [
          { pattern: /[\u0980-\u09FF]/, lang: 'bn' }, // Bengali
          { pattern: /[\u0A80-\u0AFF]/, lang: 'gu' }, // Gujarati
          { pattern: /[\u0A00-\u0A7F]/, lang: 'pa' }, // Gurmukhi (Punjabi)
          { pattern: /[\u0C80-\u0CFF]/, lang: 'kn' }, // Kannada
          { pattern: /[\u0D00-\u0D7F]/, lang: 'ml' }, // Malayalam
          { pattern: /[\u0B00-\u0B7F]/, lang: 'or' }, // Odia
          { pattern: /[\u0B80-\u0BFF]/, lang: 'ta' }, // Tamil
          { pattern: /[\u0C00-\u0C7F]/, lang: 'te' }, // Telugu
          { pattern: /[\u0900-\u097F]/, lang: 'hi' }, // Devanagari (Hindi/Marathi)
        ];
        for (const { pattern, lang } of scriptLangMap) {
          if (pattern.test(text)) {
            console.log(`[STT:${callId}] No language field — detected ${lang} from script in text`);
            sessionObj.sttDetectedLanguage = lang;
            sessionObj.sttLanguageLocked = true;
            sessionObj.stt.switchLanguage(lang).catch(err => {
              console.error(`[STT:${callId}] Script-based language switch failed:`, err.message);
              sessionObj.sttLanguageLocked = false;
            });
            break;
          }
        }
      }

      // --- BARGE-IN: Detect user speech during AI playback (partial + final) ---
      if (sessionObj.isAiSpeaking && sessionObj.greetingDone) {
        const bargeText = (text || '').trim();
        if (bargeText.length < 3) return; // Too short, noise

        // Echo detection: check if STT text matches recently spoken TTS audio
        if (isLikelyEcho(bargeText, sessionObj.recentTtsTexts)) return;

        // BACK-CHANNEL FILTER: Don't treat listening signals as interruptions.
        // Indian conversational style includes frequent "haan haan" / "accha" while
        // the other person is speaking. These should NOT stop the AI.
        const normalized = bargeText.toLowerCase().replace(/[^\w\s]/g, '');
        const wordCount = normalized.split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount <= 2 && isBackchannel(normalized)) {
          if (isFinal) {
            console.log(`[Barge-in:${callId}] Back-channel filtered (AI continues): "${bargeText}"`);
          }
          return; // Let AI keep speaking — this is just active listening
        }

        // Real user speech during AI playback — trigger barge-in
        console.log(`[Barge-in:${callId}] User interrupted (${isFinal ? 'final' : 'partial'}): "${bargeText}"`);

        // Clear Twilio audio buffer to stop playback immediately
        if (sessionObj.ws.readyState === 1) {
          sessionObj.ws.send(JSON.stringify({
            event: 'clear',
            streamSid: sessionObj.streamSid,
          }));
        }
        sessionObj.isAiSpeaking = false;
        sessionObj.interrupted = true;
        // Clear echo tracking since we stopped playback
        sessionObj.recentTtsTexts = [];

        // Only accumulate final transcripts for Claude processing
        if (isFinal) {
          let cleaned = bargeText.replace(/(.{2,6}?)\1{4,}/g, '$1');
          if (cleaned.length >= 2) {
            sessionObj.accumulatedText.push(cleaned);
          }
          // Give the user a brief window to finish their interrupting thought
          // (they may have more to say after "No, I don't want to...")
          if (!sessionObj.isProcessing) {
            if (sessionObj.silenceTimer) clearTimeout(sessionObj.silenceTimer);
            sessionObj.silenceTimer = setTimeout(() => {
              if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
                const fullText = sessionObj.accumulatedText.join(' ');
                sessionObj.accumulatedText = [];
                processUserSpeech(callId, fullText);
              }
            }, 400); // Short post-barge-in window
          }
        }
        return;
      }

      // --- NORMAL FLOW: only process final transcripts ---
      if (isFinal && text.trim()) {
        let trimmed = text.trim();

        // Filter out Whisper looping/hallucination artifacts
        trimmed = trimmed.replace(/(.{2,6}?)\1{4,}/g, '$1');
        if (trimmed.length < 2) return;

        sessionObj.accumulatedText.push(trimmed);
        console.log(`[STT:${callId}] Accumulated: "${trimmed}" (lang=${detectedLang || '?'}, total: ${sessionObj.accumulatedText.length}, processing: ${sessionObj.isProcessing})`);

        // Hesitation detection: if the user is saying "umm", "matlab", etc.,
        // extend the silence timer significantly to let them finish thinking
        const normalizedForHesitation = trimmed.toLowerCase().replace(/[^\w\s]/g, '');
        if (sessionObj.firstResponseDone && isHesitation(normalizedForHesitation)) {
          console.log(`[STT:${callId}] Hesitation detected: "${trimmed}" — extending silence timer`);
          if (sessionObj.silenceTimer) clearTimeout(sessionObj.silenceTimer);
          if (sessionObj.maxWaitTimer) { clearTimeout(sessionObj.maxWaitTimer); sessionObj.maxWaitTimer = null; }
          sessionObj.silenceTimer = setTimeout(() => {
            if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
              const fullText = sessionObj.accumulatedText.join(' ');
              sessionObj.accumulatedText = [];
              processUserSpeech(callId, fullText);
            }
          }, 1200); // 1.2s after a filler — they need time to continue
          return;
        }

        // Reset silence timer and max-wait ceiling
        if (sessionObj.silenceTimer) clearTimeout(sessionObj.silenceTimer);
        if (sessionObj.maxWaitTimer) { clearTimeout(sessionObj.maxWaitTimer); sessionObj.maxWaitTimer = null; }

        // If Claude is busy, just accumulate (it will be processed when Claude finishes)
        if (sessionObj.isProcessing) return;

        // Wait for brief silence after last transcript, then send to Claude
        // Adaptive silence timer:
        //  - First response (consent "haan"/"yes"): 200ms — stay fast
        //  - Short single-word answers (<10 chars): 500ms — wait for elaboration
        //  - Medium responses (<30 chars): 650ms — covers mid-sentence thinking pauses
        //  - Long responses (30+ chars): 550ms — they've said a lot, likely done
        const currentText = sessionObj.accumulatedText.join(' ');
        let silenceMs;
        if (!sessionObj.firstResponseDone) {
          silenceMs = 200;
        } else if (currentText.length < 10) {
          silenceMs = 500;
        } else if (currentText.length < 30) {
          silenceMs = 650;
        } else {
          silenceMs = 550;
        }
        sessionObj.silenceTimer = setTimeout(() => {
          if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
            const fullText = sessionObj.accumulatedText.join(' ');
            sessionObj.accumulatedText = [];
            processUserSpeech(callId, fullText);
          }
        }, silenceMs);

        // Max-wait ceiling: process after 3s of silence regardless, to prevent indefinite waiting
        if (!sessionObj.maxWaitTimer) {
          sessionObj.maxWaitTimer = setTimeout(() => {
            sessionObj.maxWaitTimer = null;
            if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
              console.log(`[STT:${callId}] Max wait (3s) reached — processing accumulated text`);
              if (sessionObj.silenceTimer) { clearTimeout(sessionObj.silenceTimer); sessionObj.silenceTimer = null; }
              const fullText = sessionObj.accumulatedText.join(' ');
              sessionObj.accumulatedText = [];
              processUserSpeech(callId, fullText);
            }
          }, 3000);
        }
      }
    },
    onError: (msg) => console.error(`[STT:${callId}]`, msg),
  });

  // Start STT connection in background — not needed until greeting finishes
  // (media events during greeting are already skipped)
  const sttConnectPromise = stt.connect().then(() => {
    sessionObj.stt = stt;
    console.log(`[STT:${callId}] Connected`);
  }).catch(err => {
    console.error(`[STT:${callId}] Connection failed:`, err.message);
  });
  sessionObj.stt = stt; // Assign immediately so media handler can check .isConnected
  sessionObj.sttConnectPromise = sttConnectPromise;

  // 10 minute timeout
  sessionObj.timeout = setTimeout(() => {
    console.log(`[Call] Timeout: ${callId}`);
    handleCallEnd(callId, 'timeout');
  }, 10 * 60 * 1000);

  return sessionObj;
}

async function sendGreeting(session) {
  const callId = session.call.id;
  const greeting = session.conversation.getGreeting();
  console.log(`[Call] Greeting: "${greeting.substring(0, 50)}..."`);

  // Check for pre-cached greeting audio (generated while phone was ringing)
  const cached = greetingAudioCache.get(callId);
  if (cached) {
    greetingAudioCache.delete(callId);
    console.log(`[Call:${callId}] Using pre-cached greeting audio (zero TTS latency)`);

    session.isAiSpeaking = true;

    // Track for echo detection
    session.recentTtsTexts.push(greeting);
    if (session.recentTtsTexts.length > 5) session.recentTtsTexts.shift();

    const chunks = chunkAudio(cached.mulawBase64);
    for (let i = 0; i < chunks.length; i++) {
      if (session.ws.readyState !== 1 || session.isEnding) break;
      session.ws.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload: chunks[i] },
      }));
      if ((i + 1) % 40 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }

    // Send mark to know when playback is done
    if (session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({
        event: 'mark',
        streamSid: session.streamSid,
        mark: { name: 'tts-done' },
      }));
    }
  } else {
    // Fallback: generate TTS now (cache miss — e.g. pre-generation failed)
    console.log(`[Call:${callId}] No cached greeting, generating TTS now`);
    await speakAndStream(session, greeting);
  }

  // Ensure STT is connected before we start listening (it was connecting in background)
  if (session.sttConnectPromise) {
    await session.sttConnectPromise;
    session.sttConnectPromise = null;
  }

  // Discard any STT that arrived during the greeting — it's not an answer to any question
  if (session.accumulatedText.length > 0) {
    console.log(`[Call] Discarding pre-greeting speech: "${session.accumulatedText.join(' ')}"`);
    session.accumulatedText = [];
  }
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
    session.silenceTimer = null;
  }

  session.greetingDone = true;
}

async function processUserSpeech(callId, text) {
  const session = callSessions.get(callId);
  if (!session || session.isEnding || session.isProcessing) return;

  session.isProcessing = true;
  session.interrupted = false;
  if (session.maxWaitTimer) { clearTimeout(session.maxWaitTimer); session.maxWaitTimer = null; }

  // In auto-detect mode, prepend STT-detected language hint for Claude
  const sttLang = session.sttDetectedLanguage;
  const langHint = (session.call.autoDetectLanguage && sttLang) ? sttLang : null;
  if (langHint) {
    console.log(`[Call:${callId}] User: "${text}" [STT detected: ${langHint}]`);
  } else {
    console.log(`[Call:${callId}] User: "${text}"`);
  }

  // Add to transcript
  const call = getCall(callId);
  if (call) {
    call.transcript.push({ role: 'user', content: text });
  }

  updateCall(callId, { status: 'surveying' });

  // Build text with context for Claude
  let textForClaude = text;

  // Detect repeat/clarification requests and tag them explicitly
  const normalizedForRepeat = text.toLowerCase().replace(/[^\w\s]/g, '');
  if (isRepeatRequest(normalizedForRepeat)) {
    textForClaude = `[REPEAT_REQUEST] ${textForClaude}`;
    console.log(`[Call:${callId}] Repeat request detected: "${text}"`);
  }

  // Add interruption context so Claude knows what it was saying when the user spoke
  if (session.interruptionContext) {
    textForClaude = `[USER_INTERRUPTED: You were saying "${session.interruptionContext}" when the respondent interrupted with:] ${textForClaude}`;
    console.log(`[Call:${callId}] Sending interruption context to Claude`);
    session.interruptionContext = null;
  }

  // Add language hint for auto-detect mode
  if (langHint) {
    textForClaude = `[spoken_language:${langHint}] ${textForClaude}`;
  }

  // --- Streaming pipeline: Claude → sentence TTS → Twilio ---
  const stream = session.conversation.startResponseStream(textForClaude);
  if (!stream) {
    session.isProcessing = false;
    await handleCallEnd(callId, 'completed');
    return;
  }

  session.isAiSpeaking = true;

  let fullResponse = '';
  let pendingText = '';
  let ttsLanguage = session.currentLanguage || session.call.language;
  let langTagParsed = false;
  let emotionTagParsed = false;
  let ttsEmotion = 'content'; // default, overridden by Claude's [EMOTION:xxx] tag
  const spokenSentences = [];

  // Pipeline: queue TTS calls so Claude keeps streaming while TTS generates/plays.
  // Each call runs in sequence (audio order preserved) but Claude isn't blocked.
  let ttsQueue = Promise.resolve();
  const enqueueTTS = (text, lang, emotion) => {
    spokenSentences.push(text);
    ttsQueue = ttsQueue.then(() => {
      if (session.isEnding || session.interrupted) return;
      return speakSentence(session, text, lang, emotion);
    });
  };

  try {
    for await (const delta of textIteratorFromStream(stream)) {
      if (session.isEnding || session.interrupted) break;

      fullResponse += delta;
      pendingText += delta;

      // Parse [LANG:xx] tag from the beginning of response
      if (!langTagParsed) {
        const match = fullResponse.match(/^\[LANG:([a-z]{2})\]\s*/i);
        if (match) {
          ttsLanguage = match[1].toLowerCase();
          if (ttsLanguage !== session.currentLanguage) {
            console.log(`[Call:${callId}] Language: ${session.currentLanguage} → ${ttsLanguage}`);
            session.currentLanguage = ttsLanguage;
            updateCall(callId, { detectedLanguage: ttsLanguage });
          }
          // Strip the tag from pending text
          pendingText = fullResponse.slice(match[0].length);
          langTagParsed = true;
        } else if (fullResponse.length > 15 || !/^\[/.test(fullResponse)) {
          langTagParsed = true; // No tag present
        }
      }

      // Parse [EMOTION:xxx] tag (appears after [LANG:xx] or at the start)
      if (langTagParsed && !emotionTagParsed) {
        const emMatch = pendingText.match(/^\[EMOTION:([a-z]+)\]\s*/i);
        if (emMatch) {
          ttsEmotion = emMatch[1].toLowerCase();
          console.log(`[Call:${callId}] Emotion: ${ttsEmotion}`);
          pendingText = pendingText.slice(emMatch[0].length);
          emotionTagParsed = true;
        } else if (pendingText.length > 20 || (pendingText.length > 0 && !/^\[/.test(pendingText))) {
          emotionTagParsed = true; // No emotion tag present
        }
      }

      // Split text at natural break points — very aggressive for minimal latency
      if (langTagParsed && emotionTagParsed && pendingText.trim().length > 2) {
        const trimLen = pendingText.trim().length;
        const sentenceEnd = /[.!?।]\s*$/.test(pendingText);
        const clauseBreak = trimLen > 20 && /[,;:—]\s*$/.test(pendingText);
        const longChunk = trimLen > 40;

        if (sentenceEnd || clauseBreak || longChunk) {
          const sentence = pendingText.trim();
          pendingText = '';
          enqueueTTS(sentence, ttsLanguage, ttsEmotion);
        }
      }
    }
  } catch (error) {
    console.error(`[Call:${callId}] Stream error:`, error.message);
  }

  // Speak any remaining text
  let remaining = pendingText;
  if (!langTagParsed) {
    const match = remaining.match(/^\[LANG:([a-z]{2})\]\s*/i);
    if (match) {
      ttsLanguage = match[1].toLowerCase();
      session.currentLanguage = ttsLanguage;
      remaining = remaining.slice(match[0].length);
    }
  }
  // Strip any leftover emotion tag from remaining text
  if (!emotionTagParsed) {
    const emMatch = remaining.match(/^\[EMOTION:([a-z]+)\]\s*/i);
    if (emMatch) {
      ttsEmotion = emMatch[1].toLowerCase();
      remaining = remaining.slice(emMatch[0].length);
    }
  }
  remaining = remaining.replace(/\[SURVEY_COMPLETE\]/g, '').trim();
  if (remaining && !session.isEnding && !session.interrupted) {
    enqueueTTS(remaining, ttsLanguage, ttsEmotion);
  }

  // Wait for all queued TTS to finish playing
  await ttsQueue;

  // If user interrupted, store what was spoken so Claude gets context
  if (session.interrupted && spokenSentences.length > 0) {
    session.interruptionContext = spokenSentences.join(' ');
    console.log(`[Call:${callId}] Interrupted after speaking: "${session.interruptionContext.substring(0, 80)}..."`);
  }

  // Send final mark to know when all audio finishes playing
  if (session.ws.readyState === 1) {
    session.ws.send(JSON.stringify({
      event: 'mark',
      streamSid: session.streamSid,
      mark: { name: 'tts-done' },
    }));
  }

  // Finalize conversation history
  const cleanResponse = session.conversation.finalizeStreamedResponse(fullResponse);
  console.log(`[Call:${callId}] AI: "${(cleanResponse || '').substring(0, 60)}..."`);

  if (call && cleanResponse) {
    call.transcript.push({ role: 'assistant', content: cleanResponse });
  }

  // Keep any speech accumulated while AI was speaking — the user may have been
  // eagerly answering before the AI finished. Don't discard real responses.
  if (session.accumulatedText.length > 0 && !session.interrupted) {
    console.log(`[Call:${callId}] User spoke during AI (${session.accumulatedText.length} segments) — keeping for processing`);
  }
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
    session.silenceTimer = null;
  }

  // Unlock processing
  session.isProcessing = false;
  session.firstResponseDone = true;

  // Check if survey is complete
  if (session.conversation.isComplete) {
    setTimeout(() => handleCallEnd(callId, 'completed'), 5000);
    return;
  }

  // Process queued speech (from barge-in or accumulated during processing)
  if (session.accumulatedText && session.accumulatedText.length > 0) {
    const queuedText = session.accumulatedText.join(' ');
    session.accumulatedText = [];
    setTimeout(() => processUserSpeech(callId, queuedText), 500);
  }
}

/**
 * Generate TTS for a single sentence and stream to Twilio.
 * Uses WebSocket streaming for low latency — audio plays as it generates.
 * Falls back to HTTP POST if streaming fails.
 */
const VALID_EMOTIONS = new Set(['neutral', 'angry', 'excited', 'content', 'sad', 'scared', 'enthusiastic', 'triumphant', 'sympathetic', 'confident', 'curious', 'surprised']);

// Speed varies by emotion to sound more natural:
// Slower for empathetic/thoughtful moments, slightly faster for energy/acknowledgments
const EMOTION_SPEED = {
  sympathetic: 0.9,
  sad: 0.9,
  curious: 0.95,
  neutral: 1.0,
  confident: 1.0,
  content: 1.0,
  enthusiastic: 1.05,
  excited: 1.05,
  triumphant: 1.05,
  angry: 1.0,
  scared: 0.95,
  surprised: 1.0,
};

async function speakSentence(session, text, language, emotion = 'content') {
  if (!session || session.isEnding || session.interrupted) return;

  const gender = session.call.gender;
  // Validate emotion — fall back to 'content' if unrecognized
  const safeEmotion = VALID_EMOTIONS.has(emotion) ? emotion : 'content';
  const speed = EMOTION_SPEED[safeEmotion] || 1.0;
  console.log(`[TTS] Sentence: lang=${language}, gender=${gender}, emotion=${safeEmotion}, speed=${speed}, "${text.substring(0, 50)}..."`);

  // Track for echo detection (keep last 5 sentences)
  session.recentTtsTexts.push(text);
  if (session.recentTtsTexts.length > 5) session.recentTtsTexts.shift();

  // Add Cartesia emotion tag — dynamically chosen by Claude based on context
  const emotionText = `<emotion value="${safeEmotion}"/> ${text}`;

  // Try streaming TTS first (lowest latency)
  if (session.ttsStream?.connected) {
    try {
      let chunkCount = 0;
      for await (const chunk of session.ttsStream.streamSpeech(emotionText, language, gender, { speed })) {
        if (session.ws.readyState !== 1 || session.isEnding || session.interrupted) break;
        session.ws.send(JSON.stringify({
          event: 'media',
          streamSid: session.streamSid,
          media: { payload: chunk },
        }));
        chunkCount++;
        if (chunkCount % 40 === 0) {
          await new Promise(r => setImmediate(r));
        }
      }
      return; // Success — skip HTTP fallback
    } catch (err) {
      console.error(`[TTS] Stream error (${language}/${gender}): ${err.message}, falling back to HTTP`);
    }
  }

  // Fallback: HTTP POST (used if WebSocket not connected or streaming failed)
  try {
    const mulawBase64 = await generateSpeech(emotionText, language, gender, CARTESIA_KEY, { speed });
    const chunks = chunkAudio(mulawBase64);

    for (let i = 0; i < chunks.length; i++) {
      if (session.ws.readyState !== 1 || session.isEnding || session.interrupted) break;
      session.ws.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload: chunks[i] },
      }));
      if ((i + 1) % 40 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }
  } catch (error) {
    console.error(`[TTS] HTTP error (${language}/${gender}): ${error.message}`);
    if (language !== 'en') {
      try {
        const fallbackBase64 = await generateSpeech(emotionText, 'en', gender, CARTESIA_KEY, { speed: 1.0 });
        const chunks = chunkAudio(fallbackBase64);
        for (let i = 0; i < chunks.length; i++) {
          if (session.ws.readyState !== 1 || session.isEnding || session.interrupted) break;
          session.ws.send(JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: { payload: chunks[i] },
          }));
          if ((i + 1) % 40 === 0) {
            await new Promise(r => setImmediate(r));
          }
        }
      } catch (fbErr) {
        console.error(`[TTS] Fallback also failed: ${fbErr.message}`);
      }
    }
  }
}

async function speakAndStream(session, text) {
  if (!session || session.isEnding) return;

  session.isAiSpeaking = true;

  const ttsLanguage = session.currentLanguage || session.call.language;
  await speakSentence(session, text, ttsLanguage);

  // Send mark to know when playback is done
  if (session.ws.readyState === 1) {
    session.ws.send(JSON.stringify({
      event: 'mark',
      streamSid: session.streamSid,
      mark: { name: 'tts-done' },
    }));
  }
}

// ============================================
// Call Cleanup
// ============================================

async function handleCallEnd(callId, reason) {
  const session = callSessions.get(callId);
  if (session?.isEnding) return; // Already ending
  if (session) session.isEnding = true;

  console.log(`[Call] Ending: ${callId} (${reason})`);

  const call = getCall(callId);
  if (!call) return;

  // Voicemail calls — no survey data to extract
  if (reason === 'voicemail' || reason === 'voicemail-failed') {
    updateCall(callId, {
      status: reason,
      endedAt: new Date().toISOString(),
    });
    console.log(`[Call:${callId}] Voicemail call ended (left message: ${call.voicemailLeft})`);
    cleanupSession(callId);
    return;
  }

  updateCall(callId, {
    status: reason === 'completed' ? 'extracting' : reason,
    endedAt: new Date().toISOString(),
  });

  // Extract structured data if we have a conversation
  if (session?.conversation && call.transcript.length > 0) {
    try {
      console.log(`[Call:${callId}] Extracting structured data...`);
      const data = await session.conversation.extractData();
      updateCall(callId, { extractedData: data });

      // Save to Postgres
      await saveCallToFile(getCall(callId));
      updateCall(callId, { status: 'saved' });
      console.log(`[Call:${callId}] Survey saved to Postgres`);
    } catch (error) {
      console.error(`[Call:${callId}] Extraction/save error:`, error.message);
    }
  }

  // Notify campaign runner if this was an outbound campaign call
  const finalCall = getCall(callId);
  if (finalCall?.campaignId && campaignRunner && finalCall.direction !== 'inbound') {
    const numberStatus = (reason === 'completed' || finalCall.status === 'saved') ? 'completed'
      : (reason === 'no-answer' || reason === 'busy') ? 'no_answer'
      : 'failed';
    campaignRunner.onCallCompleted(finalCall.id, finalCall.campaignId, numberStatus);
  }

  // Inbound campaign callback — mark the campaign number as completed
  if (finalCall?.direction === 'inbound' && finalCall?.campaignId) {
    completeCampaignCallback(finalCall.campaignId, finalCall.phoneNumber, finalCall.id)
      .then(() => console.log(`[Inbound:${callId}] Campaign callback completed — updated campaign_numbers`))
      .catch(err => console.error(`[Inbound:${callId}] Failed to update campaign_numbers:`, err.message));
  }

  cleanupSession(callId);
}

function cleanupSession(callId) {
  const session = callSessions.get(callId);
  if (!session) return;

  // Close STT and TTS stream
  session.stt?.close();
  session.ttsStream?.close();

  // Clear all timers
  if (session.timeout) clearTimeout(session.timeout);
  if (session.silenceTimer) clearTimeout(session.silenceTimer);
  if (session.maxWaitTimer) clearTimeout(session.maxWaitTimer);
  session.isProcessing = false;
  session.isEnding = true;

  callSessions.delete(callId);
  greetingAudioCache.delete(callId); // Clean up any unused pre-cached greeting
}

// ============================================
// Campaign API Routes
// ============================================

// Create a new campaign
app.post('/api/campaigns', requireAuth, requireDb, async (req, res) => {
  try {
    const { name, surveyConfig, phoneNumbers, language, gender, autoDetectLanguage, concurrency } = req.body;

    if (!name || !surveyConfig || !phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'name, surveyConfig, and phoneNumbers[] are required' });
    }

    const validConcurrency = Math.min(Math.max(concurrency || 2, 1), 2);

    const campaign = await createCampaign(req.user.id, {
      name, surveyConfig, language, gender, autoDetectLanguage, concurrency: validConcurrency,
    });

    await addCampaignNumbers(campaign.id, phoneNumbers);

    const progress = await getProgressCounts(campaign.id);
    res.json({ ...campaign, progress });
  } catch (error) {
    console.error('[Campaign API] Create error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List user's campaigns
app.get('/api/campaigns', requireAuth, requireDb, async (req, res) => {
  try {
    const campaigns = await getCampaignsByUser(req.user.id);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaign detail with per-number status
app.get('/api/campaigns/:id', requireAuth, requireDb, async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const numbers = await getCampaignNumbersByCampaign(campaign.id);
    const progress = await getProgressCounts(campaign.id);

    res.json({ ...campaign, numbers, progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start or resume a campaign
app.post('/api/campaigns/:id/start', requireAuth, requireDb, async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    if (!campaignRunner) return res.status(500).json({ error: 'Campaign runner not initialized' });

    await campaignRunner.startCampaign(campaign.id);
    const updated = await getCampaignById(campaign.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Pause a campaign
app.post('/api/campaigns/:id/pause', requireAuth, requireDb, async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    if (!campaignRunner) return res.status(500).json({ error: 'Campaign runner not initialized' });

    await campaignRunner.pauseCampaign(campaign.id);
    const updated = await getCampaignById(campaign.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel a campaign
app.post('/api/campaigns/:id/cancel', requireAuth, requireDb, async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    if (!campaignRunner) return res.status(500).json({ error: 'Campaign runner not initialized' });

    await campaignRunner.cancelCampaign(campaign.id);
    const updated = await getCampaignById(campaign.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// Inbound Config API Routes
// ============================================

// Create an inbound config
app.post('/api/inbound-configs', requireAuth, requireDb, async (req, res) => {
  try {
    const { name, surveyConfig, greetingText, language, gender, autoDetectLanguage } = req.body;
    if (!name || !surveyConfig) {
      return res.status(400).json({ error: 'name and surveyConfig are required' });
    }
    const config = await createInboundConfig(req.user.id, {
      twilioNumber: TWILIO_PHONE,
      name,
      surveyConfig,
      greetingText: greetingText || null,
      language: language || 'hi',
      gender: gender || 'female',
      autoDetectLanguage: autoDetectLanguage || false,
    });
    res.json(config);
  } catch (error) {
    console.error('[Inbound API] Create error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List user's inbound configs
app.get('/api/inbound-configs', requireAuth, requireDb, async (req, res) => {
  try {
    const configs = await getInboundConfigsByUser(req.user.id);
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single inbound config
app.get('/api/inbound-configs/:id', requireAuth, requireDb, async (req, res) => {
  try {
    const config = await getInboundConfigById(req.params.id);
    if (!config) return res.status(404).json({ error: 'Not found' });
    if (config.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inbound config
app.put('/api/inbound-configs/:id', requireAuth, requireDb, async (req, res) => {
  try {
    const config = await getInboundConfigById(req.params.id);
    if (!config) return res.status(404).json({ error: 'Not found' });
    if (config.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await updateInboundConfig(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete inbound config
app.delete('/api/inbound-configs/:id', requireAuth, requireDb, async (req, res) => {
  try {
    const config = await getInboundConfigById(req.params.id);
    if (!config) return res.status(404).json({ error: 'Not found' });
    if (config.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await deleteInboundConfig(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle inbound config enabled/disabled
app.post('/api/inbound-configs/:id/toggle', requireAuth, requireDb, async (req, res) => {
  try {
    const config = await getInboundConfigById(req.params.id);
    if (!config) return res.status(404).json({ error: 'Not found' });
    if (config.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await toggleInboundConfig(req.params.id, !config.enabled);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Start Server
// ============================================

// Initialize Postgres + Campaign Runner, then start server
initDb().then(async () => {
  // Initialize campaign runner
  campaignRunner = new CampaignRunner({
    initiateCallFn: initiateCall,
    getActiveCallsFn: getActiveCalls,
  });
  await campaignRunner.init();

  // Auto-configure Twilio number to point inbound calls to our webhook
  if (TWILIO_PHONE && PUBLIC_URL && !PUBLIC_URL.includes('localhost')) {
    twilioClient.incomingPhoneNumbers.list({ phoneNumber: TWILIO_PHONE })
      .then(nums => {
        if (nums[0]) {
          return twilioClient.incomingPhoneNumbers(nums[0].sid).update({
            voiceUrl: `${PUBLIC_URL}/call/inbound`,
            voiceMethod: 'POST',
          });
        }
      })
      .then(() => console.log(`[Twilio] Inbound webhook configured: ${PUBLIC_URL}/call/inbound`))
      .catch(err => console.warn(`[Twilio] Auto-config failed (set manually): ${err.message}`));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     VoxBharat Call Server Running             ║
  ║     http://localhost:${PORT}                      ║
  ╠═══════════════════════════════════════════════╣
  ║  Endpoints:                                   ║
  ║  POST   /call/initiate     - Start a call     ║
  ║  POST   /call/inbound      - Inbound webhook  ║
  ║  GET    /call/active       - List active      ║
  ║  GET    /call/:id          - Call details      ║
  ║  POST   /call/:id/end     - Force end         ║
  ║  WS     /call/media-stream - Twilio stream    ║
  ║  POST   /api/campaigns     - Campaigns        ║
  ║  CRUD   /api/inbound-configs - Inbound        ║
  ╠═══════════════════════════════════════════════╣
  ║  Public URL: ${PUBLIC_URL.padEnd(32)}║
  ╚═══════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
