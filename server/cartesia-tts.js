// Cartesia TTS client - generates speech audio from text
import { pcm16kToMulaw } from './audio-convert.js';

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';

// Voice IDs matching the frontend
const VOICES = {
  hi_female: '95d51f79-c397-46f9-b49a-23763d3eaa2d',
  hi_male: '7e8cb11d-37af-476b-ab8f-25da99b18644',
  bn_female: '59ba7dee-8f9a-432f-a6c0-ffb33666b654',
  bn_male: '2ba861ea-7cdc-43d1-8608-4045b5a41de5',
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
      'Cartesia-Version': '2024-06-10',
    },
    body: JSON.stringify({
      model_id: 'sonic-2',
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
