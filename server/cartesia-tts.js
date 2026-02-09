// Cartesia TTS client - generates speech audio from text
import { pcm16kToMulaw } from './audio-convert.js';

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';

// Voice IDs matching the frontend
const VOICES = {
  hi_female: '95d51f79-c397-46f9-b49a-23763d3eaa2d',
  hi_male: '7e8cb11d-37af-476b-ab8f-25da99b18644',
  bn_female: '59ba7dee-8f9a-432f-a6c0-ffb33666b654',
  bn_male: '2ba861ea-7cdc-43d1-8608-4045b5a41de5',
  gu_female: '4590a461-bc68-4a50-8d14-ac04f5923d22',
  gu_male: '91925fe5-42ee-4ebe-96c1-c84b12a85a32',
  mr_female: '5c32dce6-936a-4892-b131-bafe474afe5f',
  mr_male: 'f227bc18-3704-47fe-b759-8c78a450fdfa',
  ta_female: '25d2c432-139c-4035-bfd6-9baaabcdd006',
  te_female: '07bc462a-c644-49f1-baf7-82d5599131be',
  pa_female: '991c62ce-631f-48b0-8060-2a0ebecbd15b',
  pa_male: '8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56',
  kn_female: '7c6219d2-e8d2-462c-89d8-7ecba7c75d65',
  kn_male: '6baae46d-1226-45b5-a976-c7f9b797aae2',
  ml_female: 'b426013c-002b-4e89-8874-8cd20b68373a',
  ml_male: '374b80da-e622-4dfc-90f6-1eeb13d331c9',
  en_female: 'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d',
  en_male: '1259b7e3-cb8a-43df-9446-30971a46b8b0',
};

/**
 * Generate TTS audio and return as mulaw base64 chunks for Twilio streaming
 * @param {string} text - Text to speak
 * @param {string} language - 'hi' or 'bn'
 * @param {string} gender - 'male' or 'female'
 * @param {string} apiKey - Cartesia API key
 * @returns {Promise<string>} base64 mulaw audio
 */
export async function generateSpeech(text, language, gender, apiKey) {
  const voiceKey = `${language}_${gender}`;
  const voiceId = VOICES[voiceKey];
  if (!voiceId) {
    throw new Error(`No voice found for ${voiceKey}`);
  }

  const response = await fetch(CARTESIA_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2025-04-16',
    },
    body: JSON.stringify({
      model_id: 'sonic-3-2026-01-12',
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      language: language,
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 16000,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cartesia TTS error ${response.status}: ${errorText}`);
  }

  // Get raw PCM s16le 16kHz audio
  const pcmBuffer = Buffer.from(await response.arrayBuffer());

  // Convert to mulaw 8kHz for Twilio
  return pcm16kToMulaw(pcmBuffer);
}

/**
 * Split mulaw base64 audio into chunks suitable for Twilio streaming
 * Twilio expects ~20ms chunks of mulaw at 8kHz = 160 bytes per chunk
 * @param {string} mulawBase64 - Full mulaw audio as base64
 * @param {number} chunkSize - Bytes per chunk (default 160 = 20ms at 8kHz)
 * @returns {string[]} Array of base64 chunks
 */
export function chunkAudio(mulawBase64, chunkSize = 160) {
  const rawBuf = Buffer.from(mulawBase64, 'base64');
  const chunks = [];

  for (let i = 0; i < rawBuf.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, rawBuf.length);
    chunks.push(rawBuf.subarray(i, end).toString('base64'));
  }

  return chunks;
}

export { VOICES };
