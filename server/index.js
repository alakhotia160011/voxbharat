import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database (optional — server starts without it)
let db = null;
try {
  const Database = (await import('better-sqlite3')).default;
  db = new Database(join(__dirname, 'surveys.db'));
} catch (e) {
  console.warn('⚠ better-sqlite3 unavailable — survey storage disabled. API routes still work.');
}

// Database setup (only if better-sqlite3 loaded)
let saveSurvey = null;
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      duration INTEGER,
      language TEXT,
      status TEXT,
      summary TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id TEXT NOT NULL,
      question TEXT,
      question_original TEXT,
      answer TEXT,
      answer_original TEXT,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );
    CREATE TABLE IF NOT EXISTS demographics (
      survey_id TEXT PRIMARY KEY,
      age INTEGER,
      age_group TEXT,
      religion TEXT,
      language TEXT,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );
    CREATE TABLE IF NOT EXISTS structured_data (
      survey_id TEXT PRIMARY KEY,
      age INTEGER,
      age_group TEXT,
      religion TEXT,
      religion_importance TEXT,
      prayer_frequency TEXT,
      religious_freedom TEXT,
      interfaith_neighbor TEXT,
      interfaith_marriage TEXT,
      diversity_opinion TEXT,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );
    CREATE TABLE IF NOT EXISTS sentiment (
      survey_id TEXT PRIMARY KEY,
      overall TEXT,
      openness TEXT,
      religiosity TEXT,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );
  `);

  const insertSurvey = db.prepare(`INSERT INTO surveys (id, timestamp, duration, language, status, summary) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertResponse = db.prepare(`INSERT INTO responses (survey_id, question, question_original, answer, answer_original) VALUES (?, ?, ?, ?, ?)`);
  const insertDemographics = db.prepare(`INSERT INTO demographics (survey_id, age, age_group, religion, language) VALUES (?, ?, ?, ?, ?)`);
  const insertStructuredData = db.prepare(`INSERT INTO structured_data (survey_id, age, age_group, religion, religion_importance, prayer_frequency, religious_freedom, interfaith_neighbor, interfaith_marriage, diversity_opinion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertSentiment = db.prepare(`INSERT INTO sentiment (survey_id, overall, openness, religiosity) VALUES (?, ?, ?, ?)`);

  saveSurvey = db.transaction((data) => {
    insertSurvey.run(data.id, data.timestamp, data.duration, data.language, data.status, data.summary);
    for (const response of data.responses) {
      insertResponse.run(data.id, response.question, response.questionOriginal, response.answer, response.answerOriginal);
    }
    if (data.demographics) {
      insertDemographics.run(data.id, data.demographics.age, data.demographics.ageGroup, data.demographics.religion, data.demographics.language);
    }
    if (data.structured) {
      insertStructuredData.run(data.id, data.structured.age, data.structured.ageGroup, data.structured.religion, data.structured.religionImportance, data.structured.prayerFrequency, data.structured.religiousFreedom, data.structured.interfaithNeighbor, data.structured.interfaithMarriage, data.structured.diversityOpinion);
    }
    if (data.sentiment) {
      insertSentiment.run(data.id, data.sentiment.overall, data.sentiment.openness, data.sentiment.religiosity);
    }
    return data.id;
  });
}

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TTS Proxy - Cartesia API
app.post('/api/tts', async (req, res) => {
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
        model_id: 'sonic-3-2026-01-12',
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

// Generate survey questions via Claude
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

    const primaryLanguage = config.languages?.[0] || 'hi';
    const languageMap = {
      hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
      ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
      pa: 'Punjabi', or: 'Odia', as: 'Assamese', ur: 'Urdu',
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

RESPOND WITH ONLY a JSON array, no other text. Each object must have:
{
  "id": <number starting from 1>,
  "type": "<single|multiple|likert|rating|nps|open|yes_no>",
  "text": "<question in ${langName} script>",
  "textEn": "<English translation>",
  "options": ["<option1>", "<option2>", ...] (only for single/multiple/likert types, omit for open/rating/nps/yes_no),
  "required": true,
  "category": "<short category label in English>"
}

For likert type, always use exactly 5 options from negative to positive.
For rating type, include "min": 1, "max": 10.
For nps type, include "min": 0, "max": 10.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Claude response');
    }

    const questions = JSON.parse(jsonMatch[0]);
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
});

// Guard middleware for DB-dependent routes
const requireDb = (req, res, next) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable in this environment' });
  next();
};

// Save a new survey result
app.post('/api/surveys', requireDb, (req, res) => {
  try {
    const data = req.body;
    const id = saveSurvey(data);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error saving survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all surveys (summary view)
app.get('/api/surveys', requireDb, (req, res) => {
  try {
    const surveys = db.prepare(`
      SELECT s.*, d.age, d.age_group, d.religion
      FROM surveys s
      LEFT JOIN demographics d ON s.id = d.survey_id
      ORDER BY s.timestamp DESC
    `).all();
    res.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single survey with all details
app.get('/api/surveys/:id', requireDb, (req, res) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const responses = db.prepare('SELECT * FROM responses WHERE survey_id = ?').all(req.params.id);
    const demographics = db.prepare('SELECT * FROM demographics WHERE survey_id = ?').get(req.params.id);
    const structured = db.prepare('SELECT * FROM structured_data WHERE survey_id = ?').get(req.params.id);
    const sentiment = db.prepare('SELECT * FROM sentiment WHERE survey_id = ?').get(req.params.id);

    res.json({
      ...survey,
      responses,
      demographics,
      structured,
      sentiment
    });
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get aggregate analytics
app.get('/api/analytics', requireDb, (req, res) => {
  try {
    const totalSurveys = db.prepare('SELECT COUNT(*) as count FROM surveys').get();

    const byLanguage = db.prepare(`
      SELECT language, COUNT(*) as count
      FROM surveys
      GROUP BY language
    `).all();

    const byAgeGroup = db.prepare(`
      SELECT age_group, COUNT(*) as count
      FROM demographics
      GROUP BY age_group
      ORDER BY age_group
    `).all();

    const byReligion = db.prepare(`
      SELECT religion, COUNT(*) as count
      FROM demographics
      GROUP BY religion
    `).all();

    const avgAge = db.prepare(`
      SELECT AVG(age) as avg_age
      FROM demographics
    `).get();

    const sentimentBreakdown = db.prepare(`
      SELECT overall, COUNT(*) as count
      FROM sentiment
      GROUP BY overall
    `).all();

    const religionImportance = db.prepare(`
      SELECT religion_importance, COUNT(*) as count
      FROM structured_data
      GROUP BY religion_importance
    `).all();

    const interfaithMarriage = db.prepare(`
      SELECT interfaith_marriage, COUNT(*) as count
      FROM structured_data
      GROUP BY interfaith_marriage
    `).all();

    const diversityOpinion = db.prepare(`
      SELECT diversity_opinion, COUNT(*) as count
      FROM structured_data
      GROUP BY diversity_opinion
    `).all();

    res.json({
      totalSurveys: totalSurveys.count,
      avgAge: avgAge.avg_age ? Math.round(avgAge.avg_age) : null,
      byLanguage,
      byAgeGroup,
      byReligion,
      sentimentBreakdown,
      religionImportance,
      interfaithMarriage,
      diversityOpinion
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export all data as JSON
app.get('/api/export/json', requireDb, (req, res) => {
  try {
    const surveys = db.prepare('SELECT * FROM surveys').all();
    const allData = surveys.map(survey => {
      const responses = db.prepare('SELECT * FROM responses WHERE survey_id = ?').all(survey.id);
      const demographics = db.prepare('SELECT * FROM demographics WHERE survey_id = ?').get(survey.id);
      const structured = db.prepare('SELECT * FROM structured_data WHERE survey_id = ?').get(survey.id);
      const sentiment = db.prepare('SELECT * FROM sentiment WHERE survey_id = ?').get(survey.id);
      return { ...survey, responses, demographics, structured, sentiment };
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=voxbharat-export.json');
    res.json(allData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export as CSV
app.get('/api/export/csv', requireDb, (req, res) => {
  try {
    const data = db.prepare(`
      SELECT
        s.id, s.timestamp, s.duration, s.language, s.status,
        d.age, d.age_group, d.religion,
        sd.religion_importance, sd.prayer_frequency, sd.religious_freedom,
        sd.interfaith_neighbor, sd.interfaith_marriage, sd.diversity_opinion,
        se.overall as sentiment_overall, se.openness, se.religiosity
      FROM surveys s
      LEFT JOIN demographics d ON s.id = d.survey_id
      LEFT JOIN structured_data sd ON s.id = sd.survey_id
      LEFT JOIN sentiment se ON s.id = se.survey_id
    `).all();

    if (data.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=voxbharat-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a survey
app.delete('/api/surveys/:id', requireDb, (req, res) => {
  try {
    const deleteTransaction = db.transaction((id) => {
      db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM demographics WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM structured_data WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM sentiment WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM surveys WHERE id = ?').run(id);
    });

    deleteTransaction(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║     VoxBharat API Server Running          ║
  ║     http://localhost:${PORT}                 ║
  ╠═══════════════════════════════════════════╣
  ║  Endpoints:                               ║
  ║  POST   /api/surveys      - Save survey   ║
  ║  GET    /api/surveys      - List all      ║
  ║  GET    /api/surveys/:id  - Get one       ║
  ║  GET    /api/analytics    - Aggregates    ║
  ║  GET    /api/export/json  - Export JSON   ║
  ║  GET    /api/export/csv   - Export CSV    ║
  ║  DELETE /api/surveys/:id  - Delete        ║
  ╚═══════════════════════════════════════════╝
  `);
});
