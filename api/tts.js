// Vercel Serverless Function - Cartesia TTS Proxy
// This keeps the API key secure on the server

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://voxbharat.com';
const MAX_TEXT_LENGTH = 2000;

const VALID_VOICE_IDS = new Set([
  '86d3b948-5a63-49e4-98c5-b67da63aba50', '7e8cb11d-37af-476b-ab8f-25da99b18644',
  '59ba7dee-8f9a-432f-a6c0-ffb33666b654', '2ba861ea-7cdc-43d1-8608-4045b5a41de5',
  '07bc462a-c644-49f1-baf7-82d5599131be', '5c32dce6-936a-4892-b131-bafe474afe5f',
  'f227bc18-3704-47fe-b759-8c78a450fdfa', '25d2c432-139c-4035-bfd6-9baaabcdd006',
  '4590a461-bc68-4a50-8d14-ac04f5923d22', '91925fe5-42ee-4ebe-96c1-c84b12a85a32',
  '7c6219d2-e8d2-462c-89d8-7ecba7c75d65', '6baae46d-1226-45b5-a976-c7f9b797aae2',
  'b426013c-002b-4e89-8874-8cd20b68373a', '374b80da-e622-4dfc-90f6-1eeb13d331c9',
  '991c62ce-631f-48b0-8060-2a0ebecbd15b', '8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56',
  'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d', '1259b7e3-cb8a-43df-9446-30971a46b8b0',
]);

const VALID_LANGUAGES = new Set(['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'en']);

export default async function handler(req, res) {
  // CORS headers — restrict to frontend origin
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Origin check — only allow requests from the frontend
  const origin = (req.headers.origin || req.headers.referer || '').replace(/\/+$/, '');
  if (origin !== ALLOWED_ORIGIN && !origin.startsWith(ALLOWED_ORIGIN + '/')) {
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

    if (!VALID_VOICE_IDS.has(voiceId)) {
      return res.status(400).json({ error: 'Invalid voiceId' });
    }

    const lang = VALID_LANGUAGES.has(language) ? language : 'hi';

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
        language: lang,
        output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
        generation_config: { speed: 0.85 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cartesia API error:', errorText);
      return res.status(response.status).json({ error: 'TTS generation failed' });
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
