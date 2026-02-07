// Simple TTS proxy server for local development
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

const CARTESIA_API_KEY = 'sk_car_Hamdih147oPiXJqLhbNs9w';

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TTS Proxy
app.post('/api/tts', async (req, res) => {
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
        'Cartesia-Version': '2024-06-10',
      },
      body: JSON.stringify({
        model_id: 'sonic-multilingual',
        transcript: text,
        voice: { mode: 'id', id: voiceId },
        language: language || 'hi',
        output_format: {
          container: 'mp3',
          bit_rate: 128000,
          sample_rate: 44100
        },
      }),
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
