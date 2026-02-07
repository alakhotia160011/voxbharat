import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Cartesia API Key (for local development)
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY || 'sk_car_Hamdih147oPiXJqLhbNs9w';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new Database(join(__dirname, 'surveys.db'));

// Create tables
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

// Prepared statements
const insertSurvey = db.prepare(`
  INSERT INTO surveys (id, timestamp, duration, language, status, summary)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertResponse = db.prepare(`
  INSERT INTO responses (survey_id, question, question_original, answer, answer_original)
  VALUES (?, ?, ?, ?, ?)
`);

const insertDemographics = db.prepare(`
  INSERT INTO demographics (survey_id, age, age_group, religion, language)
  VALUES (?, ?, ?, ?, ?)
`);

const insertStructuredData = db.prepare(`
  INSERT INTO structured_data (survey_id, age, age_group, religion, religion_importance, prayer_frequency, religious_freedom, interfaith_neighbor, interfaith_marriage, diversity_opinion)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSentiment = db.prepare(`
  INSERT INTO sentiment (survey_id, overall, openness, religiosity)
  VALUES (?, ?, ?, ?)
`);

// Save survey transaction
const saveSurvey = db.transaction((data) => {
  // Insert main survey
  insertSurvey.run(
    data.id,
    data.timestamp,
    data.duration,
    data.language,
    data.status,
    data.summary
  );

  // Insert responses
  for (const response of data.responses) {
    insertResponse.run(
      data.id,
      response.question,
      response.questionOriginal,
      response.answer,
      response.answerOriginal
    );
  }

  // Insert demographics
  if (data.demographics) {
    insertDemographics.run(
      data.id,
      data.demographics.age,
      data.demographics.ageGroup,
      data.demographics.religion,
      data.demographics.language
    );
  }

  // Insert structured data
  if (data.structured) {
    insertStructuredData.run(
      data.id,
      data.structured.age,
      data.structured.ageGroup,
      data.structured.religion,
      data.structured.religionImportance,
      data.structured.prayerFrequency,
      data.structured.religiousFreedom,
      data.structured.interfaithNeighbor,
      data.structured.interfaithMarriage,
      data.structured.diversityOpinion
    );
  }

  // Insert sentiment
  if (data.sentiment) {
    insertSentiment.run(
      data.id,
      data.sentiment.overall,
      data.sentiment.openness,
      data.sentiment.religiosity
    );
  }

  return data.id;
});

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
        'Cartesia-Version': '2024-06-10',
      },
      body: JSON.stringify({
        model_id: 'sonic-2',
        transcript: text,
        voice: { mode: 'id', id: voiceId },
        language: language || 'hi',
        output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
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

// Save a new survey result
app.post('/api/surveys', (req, res) => {
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
app.get('/api/surveys', (req, res) => {
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
app.get('/api/surveys/:id', (req, res) => {
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
app.get('/api/analytics', (req, res) => {
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
app.get('/api/export/json', (req, res) => {
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
app.get('/api/export/csv', (req, res) => {
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
app.delete('/api/surveys/:id', (req, res) => {
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
