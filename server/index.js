import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  initDb, isDbReady, getAllCalls, getCallById,
  getAnalytics, exportCallsJson, exportCallsCsv, deleteCall
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TTS Proxy - Cartesia API
app.post('/api/tts', async (req, res) => {
  if (!CARTESIA_API_KEY) {
    return res.status(500).json({ error: 'CARTESIA_API_KEY not configured — check server/.env' });
  }

  try {
    const { text, voiceId, language } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'Missing required fields: text, voiceId' });
    }

    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CARTESIA_API_KEY}`,
        'Cartesia-Version': '2025-11-04',
      },
      body: JSON.stringify({
        model_id: 'sonic-3',
        transcript: text,
        voice: { mode: 'id', id: voiceId },
        language: language || 'hi',
        output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
        generation_config: { speed: 0.85 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia API error:', errorText);
      return res.status(response.status).json({ error: 'TTS generation failed', details: errorText });
    }

    // Get audio bytes and return as base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    res.json({
      audio: base64Audio,
      contentType: 'audio/mp3'
    });
  } catch (error) {
    console.error('TTS proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Generate survey questions via Claude (uses tool_use for guaranteed valid JSON)
app.post('/api/generate-questions', async (req, res) => {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const { config } = req.body;
    if (!config || !config.type || !config.purpose) {
      return res.status(400).json({ error: 'Missing required fields: config.type, config.purpose' });
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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
- Name: ${config.name || 'Untitled Survey'}
- Primary Language: ${langName} (${primaryLanguage})
- Purpose: ${config.purpose}
- Key Questions to Answer: ${config.keyQuestions || 'Not specified'}
- Target Audience: ${config.targetAudience || 'General population'}
- Geography: ${config.geography || 'National'}${config.states?.length ? ` (${config.states.join(', ')})` : ''}
- Tone: ${config.tone || 'conversational'}
- Sensitivity Level: ${config.sensitivity || 'low'}
- Target Duration: ${config.duration || 10} minutes
- Analysis Goals: ${config.analysisGoals || 'Not specified'}
- Brand Names (if market research): ${config.brandNames || 'None'}

INSTRUCTIONS:
1. Generate 5-8 survey questions tailored to this specific survey's purpose, audience, and goals.
2. Each question MUST be written in ${langName} script as the primary text, with an English translation.
3. Questions should feel natural for a voice conversation — conversational, not formal or bureaucratic.
4. Include a mix of question types: single choice, multiple choice, likert scale, rating, open-ended, yes/no as appropriate.
5. Order questions from easy/comfortable to more sensitive/complex (funnel approach).
6. If sensitivity is "high", include trust-building phrasing and indirect question techniques.
7. If tone is "formal", use respectful/formal language (e.g., "aap" forms). If "friendly", use warmer language.
8. Make questions specific to the stated purpose — do NOT use generic placeholder questions.
9. Do NOT include demographic questions (age, gender) — those are added automatically.
10. For likert type, always use exactly 5 options from negative to positive.
11. For rating type, set min=1, max=10. For nps type, set min=0, max=10.

Call the generate_survey_questions tool with all the questions.`;

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
                id: { type: 'number', description: 'Question number starting from 1' },
                type: { type: 'string', enum: ['single', 'multiple', 'likert', 'rating', 'nps', 'open', 'yes_no'] },
                text: { type: 'string', description: `Question text in ${langName} script` },
                textEn: { type: 'string', description: 'English translation of the question' },
                options: { type: 'array', items: { type: 'string' }, description: 'Answer options (for single/multiple/likert types only)' },
                required: { type: 'boolean' },
                category: { type: 'string', description: 'Short category label in English' },
                min: { type: 'number', description: 'Min value (for rating/nps types)' },
                max: { type: 'number', description: 'Max value (for rating/nps types)' },
              },
              required: ['id', 'type', 'text', 'textEn', 'required', 'category'],
            },
          },
        },
        required: ['questions'],
      },
    };

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [questionTool],
      tool_choice: { type: 'tool', name: 'generate_survey_questions' },
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract questions from tool_use block (guaranteed valid JSON)
    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock) {
      throw new Error('Claude did not return tool output');
    }

    const questions = toolBlock.input.questions;
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
});

// Guard middleware for DB-dependent routes
const requireDb = (req, res, next) => {
  if (!isDbReady()) return res.status(503).json({ error: 'Database unavailable — DATABASE_URL not configured' });
  next();
};

// Get all surveys (summary view)
app.get('/api/surveys', requireDb, async (req, res) => {
  try {
    const surveys = await getAllCalls();
    res.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single survey with all details
app.get('/api/surveys/:id', requireDb, async (req, res) => {
  try {
    const survey = await getCallById(req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    res.json(survey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get aggregate analytics
app.get('/api/analytics', requireDb, async (req, res) => {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export all data as JSON
app.get('/api/export/json', requireDb, async (req, res) => {
  try {
    const allData = await exportCallsJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=voxbharat-export.json');
    res.json(allData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export as CSV
app.get('/api/export/csv', requireDb, async (req, res) => {
  try {
    const csv = await exportCallsCsv();
    if (!csv) {
      return res.status(404).json({ error: 'No data to export' });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=voxbharat-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a survey
app.delete('/api/surveys/:id', requireDb, async (req, res) => {
  try {
    const deleted = await deleteCall(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Postgres, then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║     VoxBharat API Server Running          ║
  ║     http://localhost:${PORT}                 ║
  ╠═══════════════════════════════════════════╣
  ║  Endpoints:                               ║
  ║  GET    /api/surveys      - List all      ║
  ║  GET    /api/surveys/:id  - Get one       ║
  ║  GET    /api/analytics    - Aggregates    ║
  ║  GET    /api/export/json  - Export JSON   ║
  ║  GET    /api/export/csv   - Export CSV    ║
  ║  DELETE /api/surveys/:id  - Delete        ║
  ╚═══════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
