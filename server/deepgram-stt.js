// Deepgram STT WebSocket client - real-time speech-to-text
// Matches the CartesiaSTT interface for drop-in provider switching
import WebSocket from 'ws';

// Languages supported by Deepgram Nova-3 (Indian languages)
const DEEPGRAM_SUPPORTED_LANGUAGES = new Set([
  'en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn',
  // Also supports many non-Indian languages — only listing relevant ones
]);

// Languages supported in Deepgram's multilingual/code-switching mode
const DEEPGRAM_MULTI_LANGUAGES = new Set([
  'en', 'hi', 'es', 'fr', 'de', 'it', 'ja', 'nl', 'ru', 'pt',
]);

/**
 * Creates a Deepgram STT session over WebSocket
 * Streams PCM s16le 16kHz audio and receives transcription events
 * Interface-compatible with CartesiaSTT
 */
export class DeepgramSTT {
  constructor(apiKey, options = {}) {
    this.apiKey = (apiKey || '').trim();
    this.language = options.language || 'hi';
    this.encoding = options.encoding || 'linear16';
    this.sampleRate = options.sampleRate || '16000';
    this.ws = null;
    this.isConnected = false;
    this.onTranscript = options.onTranscript || (() => {});
    this.onFlushDone = options.onFlushDone || (() => {});
    this.onError = options.onError || console.error;
    this.reconnectAttempts = 0;
    this.maxReconnects = 1;
    this.isSwitching = false;
    this.switchBuffer = [];
    this.keepAliveInterval = null;
  }

  /**
   * Connect to Deepgram STT WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const url = new URL('wss://api.deepgram.com/v1/listen');
      url.searchParams.set('model', 'nova-3');
      url.searchParams.set('encoding', this.encoding);
      url.searchParams.set('sample_rate', this.sampleRate);
      url.searchParams.set('punctuate', 'true');
      url.searchParams.set('interim_results', 'true');
      // smart_format deliberately disabled — it adds up to 3s delay waiting for entity completion
      url.searchParams.set('endpointing', '150');
      url.searchParams.set('vad_events', 'true');
      // utterance_end_ms removed — causes 400 on free tier / Nova-3

      // Language: 'auto' → start with 'hi' (greeting is Hindi).
      // Deepgram's 'multi' code-switching mode returns 400 on some plans.
      // Language switch happens via switchLanguage() when non-English/non-Hindi is detected.
      if (this.language === 'auto') {
        url.searchParams.set('language', 'hi');
      } else {
        url.searchParams.set('language', this.language);
      }

      const fullUrl = url.toString();
      console.log(`[DG-STT] Connecting to: ${fullUrl.replace(/Token\s+\S+/, 'Token ***')}`);
      const k = this.apiKey || '';
      console.log(`[DG-STT] API key present: ${!!this.apiKey}, length: ${k.length}, preview: ${k.slice(0,4)}...${k.slice(-4)}`);

      this.ws = new WebSocket(fullUrl, ['token', this.apiKey], {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      this.audioFramesSent = 0;
      this.messagesReceived = 0;

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log(`[DG-STT] Connected OK, language=${this.language === 'auto' ? 'multi (auto-detect)' : this.language}, encoding=${this.encoding}, rate=${this.sampleRate}`);

        // Deepgram disconnects after 10s of no audio — send keepalive every 5s
        this._startKeepAlive();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          this.messagesReceived++;
          const msg = JSON.parse(data.toString());
          if (this.messagesReceived <= 3) {
            console.log(`[DG-STT] Message #${this.messagesReceived}: type=${msg.type}, keys=${Object.keys(msg).join(',')}`);
          }
          this._handleMessage(msg);
        } catch (err) {
          this.onError('[DG-STT] Parse error:', err);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        this._stopKeepAlive();
        console.log(`[DG-STT] Disconnected: ${code} ${reason}`);

        if (this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++;
          console.log(`[DG-STT] Reconnecting (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect().catch(this.onError), 1000);
        }
      });

      this.ws.on('error', (err) => {
        this.onError('[DG-STT] WebSocket error:', err.message);
        if (!this.isConnected) reject(err);
      });

      // Capture HTTP response body on connection rejection (e.g. 400/401)
      this.ws.on('unexpected-response', (req, res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          console.error(`[DG-STT] Connection rejected: HTTP ${res.statusCode} — ${body}`);
          reject(new Error(`Deepgram rejected connection: ${res.statusCode} — ${body}`));
        });
      });
    });
  }

  /**
   * Handle incoming Deepgram messages
   */
  _handleMessage(msg) {
    switch (msg.type) {
      case 'Results': {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt || !alt.transcript) break;

        const text = alt.transcript;
        const isFinal = msg.is_final || false;
        // Extract detected language from word-level or alternatives-level
        const language = alt.languages?.[0] || null;

        const speechFinal = msg.speech_final || false;
        console.log(`[DG-STT] ${isFinal ? 'FINAL' : 'partial'}: "${text}"${speechFinal ? ' [speech_final]' : ''}`);
        this.onTranscript({ text, isFinal, language, speechFinal });

        // Deepgram's Finalize response has from_finalize: true — treat as flush acknowledgment
        if (msg.from_finalize) {
          this.onFlushDone();
        }
        break;
      }
      case 'UtteranceEnd':
        console.log('[DG-STT] Utterance end detected');
        break;
      case 'SpeechStarted':
        // VAD detected speech — could be used for barge-in detection
        break;
      case 'Metadata':
        console.log(`[DG-STT] Session started: model=${msg.model_info?.name || 'unknown'}`);
        break;
      case 'Error':
        this.onError('[DG-STT] Server error:', msg.message, msg.description);
        break;
      default:
        break;
    }
  }

  /**
   * Send PCM audio data to STT as raw binary frames
   * @param {Buffer} pcmBuffer - PCM s16le 16kHz audio data
   */
  sendAudio(pcmBuffer) {
    // Buffer audio during language switch so we don't lose speech
    if (this.isSwitching) {
      if (this.switchBuffer.length < 200) { // ~4 seconds of buffered audio
        this.switchBuffer.push(pcmBuffer);
      }
      return;
    }

    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send as raw binary frame
    this.ws.send(pcmBuffer);
  }

  /**
   * Signal end of utterance - flush buffered audio for transcription
   */
  flush() {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'Finalize' }));
    }
  }

  /**
   * Switch to a new language by reconnecting with updated params
   * @param {string} newLanguage - ISO 639-1 language code
   */
  async switchLanguage(newLanguage) {
    if (newLanguage === this.language) return;
    const prevLanguage = this.language;
    console.log(`[DG-STT] Switching language: ${prevLanguage} → ${newLanguage}`);
    this.language = newLanguage;

    // Start buffering audio so we don't lose speech during reconnect
    this.isSwitching = true;
    this.switchBuffer = [];

    try {
      // Close current connection (prevent auto-reconnect)
      const prevMaxReconnects = this.maxReconnects;
      this.maxReconnects = 0;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
        this.ws.close();
      }
      this.ws = null;
      this.isConnected = false;
      this._stopKeepAlive();

      // Reconnect with new language — timeout after 5 seconds
      this.maxReconnects = prevMaxReconnects;
      await Promise.race([
        this.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('STT reconnect timeout (5s)')), 5000)),
      ]);

      // Replay buffered audio so the user's speech isn't lost
      const buffered = this.switchBuffer;
      this.switchBuffer = [];
      console.log(`[DG-STT] Language switched to ${newLanguage}, replaying ${buffered.length} buffered frames`);
      for (const frame of buffered) {
        this.sendAudio(frame);
      }
    } catch (err) {
      console.error(`[DG-STT] Language switch failed: ${err.message}, falling back to ${prevLanguage}`);
      this.language = prevLanguage;
      // Try to reconnect with previous language so STT doesn't stay dead
      try {
        await Promise.race([
          this.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Fallback reconnect timeout')), 5000)),
        ]);
        const buffered = this.switchBuffer;
        this.switchBuffer = [];
        console.log(`[DG-STT] Fallback reconnect OK (${prevLanguage}), replaying ${buffered.length} frames`);
        for (const frame of buffered) {
          this.sendAudio(frame);
        }
      } catch (fbErr) {
        console.error(`[DG-STT] Fallback reconnect also failed: ${fbErr.message}`);
      }
    } finally {
      this.isSwitching = false;
      this.switchBuffer = [];
    }
  }

  /**
   * Close the STT connection gracefully
   */
  close() {
    this.maxReconnects = 0;
    this._stopKeepAlive();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'CloseStream' }));
    }
    setTimeout(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }, 500);
    this.isConnected = false;
  }

  /** Start keepalive interval (Deepgram requires activity every 10s) */
  _startKeepAlive() {
    this._stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, 5000);
  }

  /** Stop keepalive interval */
  _stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}

export { DEEPGRAM_SUPPORTED_LANGUAGES };
