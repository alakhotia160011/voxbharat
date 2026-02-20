// Cartesia TTS client - generates speech audio from text
// Supports both HTTP POST (batch) and WebSocket streaming (low-latency)
import { pcm16kToMulaw } from './audio-convert.js';
import { WebSocket } from 'ws';

const CARTESIA_TTS_URL = 'https://api.cartesia.ai/tts/bytes';
const CARTESIA_TTS_WS_URL = 'wss://api.cartesia.ai/tts/websocket';

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
 * Generate TTS audio via HTTP POST (batch, used for greeting pre-cache)
 */
export async function generateSpeech(text, language, gender, apiKey, options = {}) {
  const voiceKey = `${language}_${gender}`;
  const voiceId = VOICES[voiceKey];
  if (!voiceId) {
    throw new Error(`No voice found for ${voiceKey}`);
  }

  const speed = options.speed ?? 1.0;

  const response = await fetch(CARTESIA_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2025-11-04',
    },
    body: JSON.stringify({
      model_id: 'sonic-3',
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      language: language,
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 16000,
      },
      generation_config: { speed },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cartesia TTS error ${response.status}: ${errorText}`);
  }

  const pcmBuffer = Buffer.from(await response.arrayBuffer());
  return pcm16kToMulaw(pcmBuffer);
}

/**
 * Split mulaw base64 audio into Twilio-sized chunks (160 bytes = 20ms at 8kHz)
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

/**
 * Persistent WebSocket TTS connection for streaming audio with minimal latency.
 * Streams PCM chunks from Cartesia → converts to mulaw → yields base64 chunks for Twilio.
 */
export class CartesiaTTSStream {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.connected = false;
    this.pendingRequests = new Map(); // context_id → { resolve, reject, chunks }
    this.contextCounter = 0;
  }

  async connect() {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) return;

    // Clean up stale connection if any
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.connected = false;

    const url = `${CARTESIA_TTS_WS_URL}?api_key=${this.apiKey}&cartesia_version=2025-11-04`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          const ctx = msg.context_id;
          const pending = this.pendingRequests.get(ctx);
          if (!pending) return;

          if (msg.type === 'chunk' && msg.data) {
            // PCM s16le 16kHz chunk from Cartesia → convert to mulaw 8kHz for Twilio
            const pcmBuffer = Buffer.from(msg.data, 'base64');
            const mulawBase64 = pcm16kToMulaw(pcmBuffer);
            // Split into 160-byte Twilio chunks and push
            const twilioChunks = chunkAudio(mulawBase64);
            for (const chunk of twilioChunks) {
              pending.chunks.push(chunk);
            }
            // Signal that new chunks are available
            if (pending.onChunk) pending.onChunk();
          } else if (msg.type === 'done') {
            pending.done = true;
            if (pending.onChunk) pending.onChunk();
          } else if (msg.type === 'error') {
            pending.error = msg.message || 'TTS streaming error';
            pending.done = true;
            if (pending.onChunk) pending.onChunk();
          }
        } catch (e) {
          // ignore parse errors
        }
      });

      this.ws.on('error', (err) => {
        this.connected = false;
        reject(err);
      });

      this.ws.on('close', () => {
        this.connected = false;
        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          pending.done = true;
          if (pending.onChunk) pending.onChunk();
        }
      });
    });
  }

  /**
   * Stream TTS audio as an async iterator of base64 mulaw Twilio chunks.
   * Yields chunks as they arrive from Cartesia — no waiting for full audio.
   */
  async *streamSpeech(text, language, gender, options = {}) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connected = false;
      await this.connect();
    }

    const voiceKey = `${language}_${gender}`;
    const voiceId = VOICES[voiceKey];
    if (!voiceId) {
      throw new Error(`No voice found for ${voiceKey}`);
    }

    // Double-check WebSocket is still open after potential reconnect
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('TTS WebSocket not open after connect attempt');
    }

    const speed = options.speed ?? 1.0;
    const contextId = `ctx_${++this.contextCounter}_${Date.now()}`;

    const pending = { chunks: [], done: false, error: null, onChunk: null };
    this.pendingRequests.set(contextId, pending);

    // Send TTS request
    this.ws.send(JSON.stringify({
      model_id: 'sonic-3',
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      language: language,
      context_id: contextId,
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 16000,
      },
      generation_config: { speed },
    }));

    // Timeout: if no chunks arrive within 10s, treat as connection failure
    const timeout = setTimeout(() => {
      if (!pending.done && pending.chunks.length === 0) {
        pending.error = 'TTS streaming timeout — no response from Cartesia';
        pending.done = true;
        if (pending.onChunk) pending.onChunk();
      }
    }, 10000);

    // Yield chunks as they arrive
    try {
      while (true) {
        // Drain any available chunks
        while (pending.chunks.length > 0) {
          clearTimeout(timeout); // Got data, cancel timeout
          yield pending.chunks.shift();
        }

        if (pending.error) {
          throw new Error(pending.error);
        }

        if (pending.done) break;

        // Wait for next chunk notification
        await new Promise(resolve => {
          pending.onChunk = resolve;
        });
      }
    } finally {
      clearTimeout(timeout);
      this.pendingRequests.delete(contextId);
    }
  }

  close() {
    if (this.ws) {
      this.connected = false;
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }
}

export { VOICES };
