// Vercel Serverless Function - Cartesia TTS Proxy
// This keeps the API key secure on the server

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://voxbharat.com';
const MAX_TEXT_LENGTH = 2000;

export default async function handler(req, res) {
  // CORS headers — restrict to frontend origin
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API key check — prevents unauthorized usage
  const API_SECRET = process.env.API_SECRET;
  if (API_SECRET && req.headers['x-api-key'] !== API_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

  if (!CARTESIA_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { text, voiceId, language } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'Missing required fields: text, voiceId' });
    }

    if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `Text must be a string under ${MAX_TEXT_LENGTH} characters` });
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
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia API error:', errorText);
      return res.status(response.status).json({ error: 'TTS generation failed', details: errorText });
    }

    // Get audio bytes and return as base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    res.status(200).json({
      audio: base64Audio,
      contentType: 'audio/mp3'
    });
  } catch (error) {
    console.error('TTS proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
