// VoxBharat Call Server - Twilio + Cartesia STT/TTS + Claude
// Handles real phone calls with AI voice surveys

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import twilio from 'twilio';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { mulawToPcm16k, pcm16kToMulaw } from './audio-convert.js';
import { generateSpeech, chunkAudio } from './cartesia-tts.js';
import { CartesiaSTT } from './cartesia-stt.js';
import { ClaudeConversation } from './claude-conversation.js';
import {
  createCall, getCall, getCallByStreamSid, updateCall,
  getActiveCalls, removeCall, saveCallToFile
} from './call-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const PORT = parseInt(process.env.PORT, 10) || 3002;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const CARTESIA_KEY = process.env.CARTESIA_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');

// Validate config
const missing = [];
if (!TWILIO_SID) missing.push('TWILIO_ACCOUNT_SID');
if (!TWILIO_AUTH) missing.push('TWILIO_AUTH_TOKEN');
if (!TWILIO_PHONE) missing.push('TWILIO_PHONE_NUMBER');
if (!CARTESIA_KEY) missing.push('CARTESIA_API_KEY');
if (!ANTHROPIC_KEY) missing.push('ANTHROPIC_API_KEY');
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  console.error('Copy server/.env.example to server/.env and fill in values');
  process.exit(1);
}

// Initialize
const twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Per-call state: conversation instances, STT sessions, timers
const callSessions = new Map();

/**
 * Convert Anthropic SDK event-based stream to async iterator of text deltas.
 * SDK v0.73.0 doesn't have .textStream — uses .on('text') events instead.
 */
function textIteratorFromStream(stream) {
  const queue = [];
  let done = false;
  let waitResolve = null;

  stream.on('text', (text) => {
    queue.push(text);
    if (waitResolve) { waitResolve(); waitResolve = null; }
  });

  stream.on('message', () => {
    done = true;
    if (waitResolve) { waitResolve(); waitResolve = null; }
  });

  stream.on('error', () => {
    done = true;
    if (waitResolve) { waitResolve(); waitResolve = null; }
  });

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          while (queue.length === 0 && !done) {
            await new Promise(r => { waitResolve = r; });
          }
          if (queue.length > 0) {
            return { value: queue.shift(), done: false };
          }
          return { done: true, value: undefined };
        }
      };
    }
  };
}

// ============================================
// HTTP Endpoints
// ============================================

// Health check
app.get('/call/health', (req, res) => {
  res.json({ status: 'ok', activeCalls: getActiveCalls().length });
});

// Initiate an outbound call
app.post('/call/initiate', async (req, res) => {
  const { phoneNumber, language = 'hi', gender = 'female', customSurvey = null, autoDetectLanguage = false } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required' });
  }

  // Create call record
  const call = createCall({ phoneNumber, language, gender, customSurvey, autoDetectLanguage });

  try {
    // Make outbound call via Twilio
    const twilioCall = await twilioClient.calls.create({
      to: phoneNumber,
      from: TWILIO_PHONE,
      url: `${PUBLIC_URL}/call/twilio-webhook?callId=${call.id}`,
      statusCallback: `${PUBLIC_URL}/call/twilio-status?callId=${call.id}`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    updateCall(call.id, {
      twilioCallSid: twilioCall.sid,
      status: 'ringing',
    });

    console.log(`[Call] Initiated: ${call.id} -> ${phoneNumber} (${language}/${gender})`);
    res.json({ callId: call.id, twilioSid: twilioCall.sid, status: 'ringing' });
  } catch (error) {
    console.error('[Call] Initiation failed:', error.message);
    updateCall(call.id, { status: 'failed', error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Twilio webhook - returns TwiML to connect media stream
app.post('/call/twilio-webhook', (req, res) => {
  const callId = req.query.callId;
  const wsUrl = PUBLIC_URL.replace('http', 'ws');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/call/media-stream" statusCallback="${PUBLIC_URL}/call/twilio-status?callId=${callId}">
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

// Twilio status callback
app.post('/call/twilio-status', (req, res) => {
  const callId = req.query.callId;
  const status = req.body.CallStatus;

  if (callId) {
    console.log(`[Call] Status: ${callId} -> ${status}`);
    if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
      handleCallEnd(callId, status);
    }
  }

  res.sendStatus(200);
});

// List active calls
app.get('/call/active', (req, res) => {
  res.json(getActiveCalls());
});

// Get call details
app.get('/call/:id', (req, res) => {
  const call = getCall(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
});

// Force-end a call
app.post('/call/:id/end', async (req, res) => {
  const call = getCall(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });

  try {
    if (call.twilioCallSid) {
      await twilioClient.calls(call.twilioCallSid).update({ status: 'completed' });
    }
    await handleCallEnd(call.id, 'force-ended');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WebSocket - Twilio Media Stream
// ============================================

const wss = new WebSocketServer({ server, path: '/call/media-stream' });

wss.on('connection', (ws) => {
  let callId = null;
  let streamSid = null;
  let session = null;
  let mediaPackets = 0;

  console.log('[WS] New Twilio media stream connection');

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case 'connected':
          console.log('[WS] Media stream connected');
          break;

        case 'start':
          // Extract call ID from custom parameters
          callId = msg.start.customParameters?.callId;
          streamSid = msg.start.streamSid;

          if (!callId) {
            console.error('[WS] No callId in stream parameters');
            ws.close();
            return;
          }

          const call = getCall(callId);
          if (!call) {
            console.error(`[WS] Call not found: ${callId}`);
            ws.close();
            return;
          }

          updateCall(callId, {
            streamSid,
            status: 'connected',
            connectedAt: new Date().toISOString(),
          });

          // Initialize session
          session = await initSession(callId, call, ws, streamSid);
          callSessions.set(callId, session);

          // Send greeting
          await sendGreeting(session);
          break;

        case 'media':
          if (!session || session.isEnding) break;
          mediaPackets++;
          if (mediaPackets % 500 === 1) {
            console.log(`[WS] Media packets: ${mediaPackets}, isAiSpeaking: ${session.isAiSpeaking}, STT connected: ${session.stt.isConnected}`);
          }

          // Skip STT during greeting to avoid echo (AI voice picked up by mic)
          // After greeting, keep STT active during AI speech for barge-in detection
          if (session.isAiSpeaking && !session.greetingDone) break;

          // Convert mulaw 8kHz -> PCM s16le 16kHz and send to STT
          const pcmAudio = mulawToPcm16k(msg.media.payload);
          session.stt.sendAudio(pcmAudio);
          break;

        case 'mark':
          // TTS playback complete
          console.log(`[WS] Mark received: ${msg.mark?.name}`);
          if (session && msg.mark?.name === 'tts-done') {
            session.isAiSpeaking = false;
            console.log('[WS] AI done speaking, now listening for user');
          }
          break;

        case 'stop':
          console.log(`[WS] Stream stopped: ${callId}`);
          if (callId) handleCallEnd(callId, 'stream-stopped');
          break;
      }
    } catch (error) {
      console.error('[WS] Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed: ${callId}`);
    if (callId) {
      cleanupSession(callId);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error: ${err.message}`);
  });
});

// ============================================
// Session Management
// ============================================

async function initSession(callId, call, ws, streamSid) {
  // Create Claude conversation
  const conversation = new ClaudeConversation(ANTHROPIC_KEY, {
    language: call.language,
    gender: call.gender,
    customSurvey: call.customSurvey || null,
    autoDetectLanguage: call.autoDetectLanguage || false,
  });

  // Session object created first so STT callback can reference it
  const sessionObj = {
    conversation,
    stt: null,
    ws,
    streamSid,
    timeout: null,
    silenceTimer: null,
    isAiSpeaking: false,
    isProcessing: false,
    isEnding: false,
    greetingDone: false,
    accumulatedText: [],
    call,
    currentLanguage: call.autoDetectLanguage ? 'en' : call.language,
  };

  // Create Cartesia STT - uses sessionObj directly (no separate closure vars)
  const stt = new CartesiaSTT(CARTESIA_KEY, {
    language: call.autoDetectLanguage ? 'auto' : call.language,
    onTranscript: ({ text, isFinal, language: detectedLang }) => {
      if (sessionObj.isEnding) return;

      // Track STT-detected language for auto-detect mode
      if (detectedLang && sessionObj.call.autoDetectLanguage) {
        sessionObj.sttDetectedLanguage = detectedLang;
        console.log(`[STT:${callId}] Language field from Cartesia: "${detectedLang}"`);

        // On first non-English detection, reconnect STT with that specific language
        // Auto-detect mode gives us the language but garbles the transcription —
        // reconnecting with the correct language gives clean text for subsequent utterances
        if (detectedLang !== 'en' && !sessionObj.sttLanguageLocked) {
          sessionObj.sttLanguageLocked = true;
          console.log(`[STT:${callId}] Detected ${detectedLang} from audio — reconnecting STT for better transcription...`);
          sessionObj.stt.switchLanguage(detectedLang).catch(err => {
            console.error(`[STT:${callId}] Language switch failed:`, err.message);
            sessionObj.sttLanguageLocked = false; // Allow retry
          });
        }
      }

      // Fallback: if no language field from Cartesia, detect Indic scripts in the text
      if (!detectedLang && sessionObj.call.autoDetectLanguage && !sessionObj.sttLanguageLocked && isFinal && text) {
        const scriptLangMap = [
          { pattern: /[\u0980-\u09FF]/, lang: 'bn' }, // Bengali
          { pattern: /[\u0A80-\u0AFF]/, lang: 'gu' }, // Gujarati
          { pattern: /[\u0A00-\u0A7F]/, lang: 'pa' }, // Gurmukhi (Punjabi)
          { pattern: /[\u0C80-\u0CFF]/, lang: 'kn' }, // Kannada
          { pattern: /[\u0D00-\u0D7F]/, lang: 'ml' }, // Malayalam
          { pattern: /[\u0B00-\u0B7F]/, lang: 'or' }, // Odia
          { pattern: /[\u0B80-\u0BFF]/, lang: 'ta' }, // Tamil
          { pattern: /[\u0C00-\u0C7F]/, lang: 'te' }, // Telugu
          { pattern: /[\u0900-\u097F]/, lang: 'hi' }, // Devanagari (Hindi/Marathi)
        ];
        for (const { pattern, lang } of scriptLangMap) {
          if (pattern.test(text)) {
            console.log(`[STT:${callId}] No language field — detected ${lang} from script in text`);
            sessionObj.sttDetectedLanguage = lang;
            sessionObj.sttLanguageLocked = true;
            sessionObj.stt.switchLanguage(lang).catch(err => {
              console.error(`[STT:${callId}] Script-based language switch failed:`, err.message);
              sessionObj.sttLanguageLocked = false;
            });
            break;
          }
        }
      }

      if (isFinal && text.trim()) {
        let trimmed = text.trim();

        // Filter out Whisper looping/hallucination artifacts
        // Detects repeated character or syllable patterns (e.g., "गगगगग..." or "वादावादावादा...")
        trimmed = trimmed.replace(/(.{2,6}?)\1{4,}/g, '$1');
        if (trimmed.length < 2) return; // Skip if only garbage remained

        // --- BARGE-IN: User spoke while AI is speaking ---
        if (sessionObj.isAiSpeaking) {
          // Filter echo: ignore short fragments (likely AI audio picked up by mic)
          if (trimmed.length < 20) return;

          console.log(`[Barge-in:${callId}] User interrupted: "${trimmed}"`);

          // Clear Twilio audio buffer to stop playback immediately
          if (sessionObj.ws.readyState === 1) {
            sessionObj.ws.send(JSON.stringify({
              event: 'clear',
              streamSid: sessionObj.streamSid,
            }));
          }
          sessionObj.isAiSpeaking = false;
          sessionObj.interrupted = true;

          // Accumulate the interruption text
          sessionObj.accumulatedText.push(trimmed);

          // If not currently processing (unusual), start immediately
          if (!sessionObj.isProcessing) {
            const fullText = sessionObj.accumulatedText.join(' ');
            sessionObj.accumulatedText = [];
            processUserSpeech(callId, fullText);
          }
          // If processing, the interrupted flag will stop the streaming loop
          // and accumulated text will be processed after cleanup
          return;
        }

        // --- Normal flow: accumulate text and wait for silence ---
        sessionObj.accumulatedText.push(trimmed);
        console.log(`[STT:${callId}] Accumulated: "${trimmed}" (lang=${detectedLang || '?'}, total: ${sessionObj.accumulatedText.length}, processing: ${sessionObj.isProcessing})`);

        // Reset silence timer
        if (sessionObj.silenceTimer) clearTimeout(sessionObj.silenceTimer);

        // If Claude is busy, just accumulate (it will be processed when Claude finishes)
        if (sessionObj.isProcessing) return;

        // Wait 1.2s of silence after last final transcript, then send everything to Claude
        sessionObj.silenceTimer = setTimeout(() => {
          if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
            const fullText = sessionObj.accumulatedText.join(' ');
            sessionObj.accumulatedText = [];
            processUserSpeech(callId, fullText);
          }
        }, 1200);
      }
    },
    onError: (msg) => console.error(`[STT:${callId}]`, msg),
  });

  await stt.connect();
  sessionObj.stt = stt;

  // 10 minute timeout
  sessionObj.timeout = setTimeout(() => {
    console.log(`[Call] Timeout: ${callId}`);
    handleCallEnd(callId, 'timeout');
  }, 10 * 60 * 1000);

  return sessionObj;
}

async function sendGreeting(session) {
  const greeting = session.conversation.getGreeting();
  console.log(`[Call] Greeting: "${greeting.substring(0, 50)}..."`);
  await speakAndStream(session, greeting);

  // Discard any STT that arrived during the greeting — it's not an answer to any question
  if (session.accumulatedText.length > 0) {
    console.log(`[Call] Discarding pre-greeting speech: "${session.accumulatedText.join(' ')}"`);
    session.accumulatedText = [];
  }
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
    session.silenceTimer = null;
  }

  session.greetingDone = true;
}

async function processUserSpeech(callId, text) {
  const session = callSessions.get(callId);
  if (!session || session.isEnding || session.isProcessing) return;

  session.isProcessing = true;
  session.interrupted = false;

  // In auto-detect mode, prepend STT-detected language hint for Claude
  const sttLang = session.sttDetectedLanguage;
  const langHint = (session.call.autoDetectLanguage && sttLang) ? sttLang : null;
  if (langHint) {
    console.log(`[Call:${callId}] User: "${text}" [STT detected: ${langHint}]`);
  } else {
    console.log(`[Call:${callId}] User: "${text}"`);
  }

  // Add to transcript
  const call = getCall(callId);
  if (call) {
    call.transcript.push({ role: 'user', content: text });
  }

  updateCall(callId, { status: 'surveying' });

  // Build text with language hint for Claude
  const textForClaude = langHint
    ? `[spoken_language:${langHint}] ${text}`
    : text;

  // --- Streaming pipeline: Claude → sentence TTS → Twilio ---
  const stream = session.conversation.startResponseStream(textForClaude);
  if (!stream) {
    session.isProcessing = false;
    await handleCallEnd(callId, 'completed');
    return;
  }

  session.isAiSpeaking = true;

  let fullResponse = '';
  let pendingText = '';
  let ttsLanguage = session.currentLanguage || session.call.language;
  let langTagParsed = false;

  try {
    for await (const delta of textIteratorFromStream(stream)) {
      if (session.isEnding || session.interrupted) break;

      fullResponse += delta;
      pendingText += delta;

      // Parse [LANG:xx] tag from the beginning of response
      if (!langTagParsed) {
        const match = fullResponse.match(/^\[LANG:([a-z]{2})\]\s*/i);
        if (match) {
          ttsLanguage = match[1].toLowerCase();
          if (ttsLanguage !== session.currentLanguage) {
            console.log(`[Call:${callId}] Language: ${session.currentLanguage} → ${ttsLanguage}`);
            session.currentLanguage = ttsLanguage;
            updateCall(callId, { detectedLanguage: ttsLanguage });
          }
          // Strip the tag from pending text
          pendingText = fullResponse.slice(match[0].length);
          langTagParsed = true;
        } else if (fullResponse.length > 15 || !/^\[/.test(fullResponse)) {
          langTagParsed = true; // No tag present
        }
      }

      // Send TTS at sentence boundaries for lower perceived latency
      if (langTagParsed && pendingText.trim().length > 5) {
        const sentenceEnd = /[.!?।]\s*$/.test(pendingText);
        const clauseBreak = pendingText.trim().length > 80 && /[,;:]\s*$/.test(pendingText);

        if (sentenceEnd || clauseBreak) {
          const sentence = pendingText.trim();
          pendingText = '';
          await speakSentence(session, sentence, ttsLanguage);
        }
      }
    }
  } catch (error) {
    console.error(`[Call:${callId}] Stream error:`, error.message);
  }

  // Speak any remaining text
  let remaining = pendingText;
  if (!langTagParsed) {
    const match = remaining.match(/^\[LANG:([a-z]{2})\]\s*/i);
    if (match) {
      ttsLanguage = match[1].toLowerCase();
      session.currentLanguage = ttsLanguage;
      remaining = remaining.slice(match[0].length);
    }
  }
  remaining = remaining.replace(/\[SURVEY_COMPLETE\]/g, '').trim();
  if (remaining && !session.isEnding) {
    await speakSentence(session, remaining, ttsLanguage);
  }

  // Send final mark to know when all audio finishes playing
  if (session.ws.readyState === 1) {
    session.ws.send(JSON.stringify({
      event: 'mark',
      streamSid: session.streamSid,
      mark: { name: 'tts-done' },
    }));
  }

  // Finalize conversation history
  const cleanResponse = session.conversation.finalizeStreamedResponse(fullResponse);
  console.log(`[Call:${callId}] AI: "${(cleanResponse || '').substring(0, 60)}..."`);

  if (call && cleanResponse) {
    call.transcript.push({ role: 'assistant', content: cleanResponse });
  }

  // Discard any speech accumulated while AI was speaking (unless barge-in)
  if (session.accumulatedText.length > 0 && !session.interrupted) {
    console.log(`[Call:${callId}] Discarding ${session.accumulatedText.length} pre-question segments`);
    session.accumulatedText = [];
  }
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
    session.silenceTimer = null;
  }

  // Unlock processing
  session.isProcessing = false;

  // Check if survey is complete
  if (session.conversation.isComplete) {
    setTimeout(() => handleCallEnd(callId, 'completed'), 5000);
    return;
  }

  // Process queued speech (from barge-in or accumulated during processing)
  if (session.accumulatedText && session.accumulatedText.length > 0) {
    const queuedText = session.accumulatedText.join(' ');
    session.accumulatedText = [];
    setTimeout(() => processUserSpeech(callId, queuedText), 500);
  }
}

/**
 * Generate TTS for a single sentence and stream to Twilio (no mark event)
 */
async function speakSentence(session, text, language) {
  if (!session || session.isEnding || session.interrupted) return;

  const gender = session.call.gender;
  console.log(`[TTS] Sentence: lang=${language}, gender=${gender}, "${text.substring(0, 50)}..."`);

  try {
    const mulawBase64 = await generateSpeech(text, language, gender, CARTESIA_KEY);
    const chunks = chunkAudio(mulawBase64);

    for (const chunk of chunks) {
      if (session.ws.readyState !== 1 || session.isEnding || session.interrupted) break;
      session.ws.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload: chunk },
      }));
    }
  } catch (error) {
    console.error(`[TTS] Sentence error (${language}/${gender}): ${error.message}`);
    // Try English fallback if language-specific voice is unavailable
    if (language !== 'en') {
      try {
        const fallbackBase64 = await generateSpeech(text, 'en', gender, CARTESIA_KEY);
        const chunks = chunkAudio(fallbackBase64);
        for (const chunk of chunks) {
          if (session.ws.readyState !== 1 || session.isEnding) break;
          session.ws.send(JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: { payload: chunk },
          }));
        }
      } catch (fbErr) {
        console.error(`[TTS] Fallback also failed: ${fbErr.message}`);
      }
    }
  }
}

async function speakAndStream(session, text) {
  if (!session || session.isEnding) return;

  session.isAiSpeaking = true;

  const ttsLanguage = session.currentLanguage || session.call.language;
  await speakSentence(session, text, ttsLanguage);

  // Send mark to know when playback is done
  if (session.ws.readyState === 1) {
    session.ws.send(JSON.stringify({
      event: 'mark',
      streamSid: session.streamSid,
      mark: { name: 'tts-done' },
    }));
  }
}

// ============================================
// Call Cleanup
// ============================================

async function handleCallEnd(callId, reason) {
  const session = callSessions.get(callId);
  if (session?.isEnding) return; // Already ending
  if (session) session.isEnding = true;

  console.log(`[Call] Ending: ${callId} (${reason})`);

  const call = getCall(callId);
  if (!call) return;

  updateCall(callId, {
    status: reason === 'completed' ? 'extracting' : reason,
    endedAt: new Date().toISOString(),
  });

  // Extract structured data if we have a conversation
  if (session?.conversation && call.transcript.length > 0) {
    try {
      console.log(`[Call:${callId}] Extracting structured data...`);
      const data = await session.conversation.extractData();
      updateCall(callId, { extractedData: data });

      // Save to file
      saveCallToFile(getCall(callId));
      updateCall(callId, { status: 'saved' });
      console.log(`[Call:${callId}] Survey saved to call-results.json`);
    } catch (error) {
      console.error(`[Call:${callId}] Extraction/save error:`, error.message);
    }
  }

  cleanupSession(callId);
}

function cleanupSession(callId) {
  const session = callSessions.get(callId);
  if (!session) return;

  // Close STT
  session.stt?.close();

  // Clear all timers
  if (session.timeout) clearTimeout(session.timeout);
  if (session.silenceTimer) clearTimeout(session.silenceTimer);
  session.isProcessing = false;
  session.isEnding = true;

  callSessions.delete(callId);
}

// ============================================
// Start Server
// ============================================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     VoxBharat Call Server Running             ║
  ║     http://localhost:${PORT}                      ║
  ╠═══════════════════════════════════════════════╣
  ║  Endpoints:                                   ║
  ║  POST   /call/initiate     - Start a call     ║
  ║  GET    /call/active       - List active      ║
  ║  GET    /call/:id          - Call details      ║
  ║  POST   /call/:id/end     - Force end         ║
  ║  WS     /call/media-stream - Twilio stream    ║
  ╠═══════════════════════════════════════════════╣
  ║  Public URL: ${PUBLIC_URL.padEnd(32)}║
  ╚═══════════════════════════════════════════════╝
  `);
});
