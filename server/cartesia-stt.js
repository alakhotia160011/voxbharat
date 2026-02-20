// Cartesia STT WebSocket client - real-time speech-to-text
import WebSocket from 'ws';

/**
 * Creates a Cartesia STT session over WebSocket
 * Streams PCM s16le 16kHz audio and receives transcription events
 */
export class CartesiaSTT {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.language = options.language || 'hi'; // 'auto' = omit language for auto-detection
    this.ws = null;
    this.isConnected = false;
    this.onTranscript = options.onTranscript || (() => {});
    this.onError = options.onError || console.error;
    this.reconnectAttempts = 0;
    this.maxReconnects = 1;
  }

  /**
   * Connect to Cartesia STT WebSocket
   * All config is passed via query parameters (no configure event needed)
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const paramObj = {
        model: 'ink-whisper',
        encoding: 'pcm_s16le',
        sample_rate: '16000',
        api_key: this.apiKey,
        cartesia_version: '2025-11-04',
      };
      // Omit language for auto-detection mode
      if (this.language && this.language !== 'auto') {
        paramObj.language = this.language;
      }
      const params = new URLSearchParams(paramObj);

      const url = `wss://api.cartesia.ai/stt/websocket?${params}`;

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log(`[STT] Connected, language=${this.language === 'auto' ? 'auto-detect' : this.language}`);
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(msg);
        } catch (err) {
          this.onError('[STT] Parse error:', err);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        console.log(`[STT] Disconnected: ${code} ${reason}`);

        if (this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++;
          console.log(`[STT] Reconnecting (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect().catch(this.onError), 1000);
        }
      });

      this.ws.on('error', (err) => {
        this.onError('[STT] WebSocket error:', err.message);
        if (!this.isConnected) reject(err);
      });
    });
  }

  /**
   * Handle incoming STT messages
   */
  _handleMessage(msg) {
    switch (msg.type) {
      case 'transcript':
        if (msg.text) {
          console.log(`[STT] ${msg.is_final ? 'FINAL' : 'partial'}: "${msg.text}"`);
          this.onTranscript({
            text: msg.text,
            isFinal: msg.is_final || false,
            language: msg.language,
          });
        }
        break;
      case 'flush_done':
        console.log('[STT] Flush acknowledged');
        break;
      case 'done':
        console.log('[STT] Session done');
        break;
      case 'error':
        this.onError('[STT] Server error:', msg.message, msg.code);
        break;
      default:
        console.log(`[STT] Unknown message type: ${msg.type}`);
        break;
    }
  }

  /**
   * Send PCM audio data to STT as raw binary frames
   * @param {Buffer} pcmBuffer - PCM s16le 16kHz audio data
   */
  sendAudio(pcmBuffer) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send as raw binary frame (not JSON-wrapped)
    this.ws.send(pcmBuffer);
  }

  /**
   * Signal end of utterance - flush buffered audio for transcription
   */
  flush() {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send plain text string "finalize" (not JSON)
      this.ws.send('finalize');
    }
  }

  /**
   * Switch to a new language by reconnecting with updated params
   * @param {string} newLanguage - ISO 639-1 language code
   */
  async switchLanguage(newLanguage) {
    if (newLanguage === this.language) return;
    console.log(`[STT] Switching language: ${this.language} → ${newLanguage}`);
    this.language = newLanguage;

    // Close current connection (prevent auto-reconnect)
    const prevMaxReconnects = this.maxReconnects;
    this.maxReconnects = 0;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('done');
      this.ws.close();
    }
    this.ws = null;
    this.isConnected = false;

    // Reconnect with new language
    this.maxReconnects = prevMaxReconnects;
    await this.connect();
  }

  /**
   * Close the STT connection gracefully
   */
  close() {
    this.maxReconnects = 0; // prevent reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send "done" to close session gracefully
      this.ws.send('done');
    }
    setTimeout(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }, 500);
    this.isConnected = false;
  }
}
