// Simple TTS proxy server for local development
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;


const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TTS Proxy
app.post('/api/tts', async (req, res) => {
  if (!CARTESIA_API_KEY) {
    return res.status(500).json({ error: 'Cartesia API key not configured. Add CARTESIA_API_KEY to server/.env' });
  }

  try {
    const { text, voiceId, language } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'Missing text or voiceId' });
    }

    console.log(`TTS: "${text.substring(0, 40)}..." voice=${voiceId} lang=${language}`);

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
        output_format: {
          container: 'mp3',
          bit_rate: 128000,
          sample_rate: 44100
        },
        generation_config: { speed: 0.85 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia error:', response.status, errorText);
      return res.status(response.status).json({ error: 'TTS failed', details: errorText });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    console.log(`✓ Audio: ${Math.round(base64Audio.length/1024)}KB`);

    res.json({ audio: base64Audio, contentType: 'audio/mp3' });
  } catch (error) {
    console.error('TTS error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate survey questions via Claude (uses tool_use for guaranteed valid JSON)
app.post('/api/generate-questions', async (req, res) => {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to server/.env' });
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

    console.log(`Generating questions for "${config.name}" in ${langName}...`);

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
    console.log(`✓ Generated ${questions.length} questions`);
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Question generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
});

// Dummy endpoints for surveys (no database)
app.post('/api/surveys', (req, res) => res.json({ success: true, id: 'local_test' }));
app.get('/api/surveys', (req, res) => res.json([]));

app.listen(PORT, () => {
  console.log(`
  ✅ Local TTS Server Running
  http://localhost:${PORT}

  Now run 'npm run dev' in the main folder
  `);
});
