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

          // Skip STT while AI is speaking (echo suppression)
          if (session.isAiSpeaking) break;

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
    accumulatedText: [],
    call,
    currentLanguage: call.autoDetectLanguage ? 'en' : call.language,
  };

  // Create Cartesia STT - uses sessionObj directly (no separate closure vars)
  const stt = new CartesiaSTT(CARTESIA_KEY, {
    language: call.autoDetectLanguage ? 'en' : call.language,
    onTranscript: ({ text, isFinal }) => {
      if (sessionObj.isEnding) return;

      if (isFinal && text.trim()) {
        let trimmed = text.trim();

        // Filter out Whisper looping/hallucination artifacts
        // Detects repeated character or syllable patterns (e.g., "गगगगग..." or "वादावादावादा...")
        trimmed = trimmed.replace(/(.{2,6}?)\1{4,}/g, '$1');
        if (trimmed.length < 2) return; // Skip if only garbage remained

        sessionObj.accumulatedText.push(trimmed);
        console.log(`[STT:${callId}] Accumulated: "${trimmed}" (total: ${sessionObj.accumulatedText.length}, processing: ${sessionObj.isProcessing})`);

        // Reset silence timer
        if (sessionObj.silenceTimer) clearTimeout(sessionObj.silenceTimer);

        // If Claude is busy, just accumulate (it will be processed when Claude finishes)
        if (sessionObj.isProcessing) return;

        // Wait 2s of silence after last final transcript, then send everything to Claude
        // The discard-on-speak fix prevents misattribution even if we process too early
        sessionObj.silenceTimer = setTimeout(() => {
          if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
            const fullText = sessionObj.accumulatedText.join(' ');
            sessionObj.accumulatedText = [];
            processUserSpeech(callId, fullText);
          }
        }, 2000);
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
}

async function processUserSpeech(callId, text) {
  const session = callSessions.get(callId);
  if (!session || session.isEnding || session.isProcessing) return;

  session.isProcessing = true;

  console.log(`[Call:${callId}] User: "${text}"`);

  // Add to transcript
  const call = getCall(callId);
  if (call) {
    call.transcript.push({ role: 'user', content: text });
  }

  updateCall(callId, { status: 'surveying' });

  // Get Claude's response
  const response = await session.conversation.getResponse(text);

  if (!response) {
    session.isProcessing = false;
    await handleCallEnd(callId, 'completed');
    return;
  }

  // Update language if auto-detect switched it
  if (session.conversation.autoDetectLanguage) {
    const newLang = session.conversation.currentLanguage;
    if (newLang !== session.currentLanguage) {
      console.log(`[Call:${callId}] Language switched: ${session.currentLanguage} → ${newLang}`);
      session.currentLanguage = newLang;
      updateCall(callId, { detectedLanguage: newLang });

      // Switch STT language hint to improve transcription quality
      if (session.stt && newLang !== 'en') {
        session.stt.switchLanguage(newLang).catch(err => {
          console.error(`[Call:${callId}] STT language switch failed:`, err.message);
        });
      }
    }
  }

  console.log(`[Call:${callId}] AI: "${response.substring(0, 50)}..."`);

  // Add to transcript
  if (call) {
    call.transcript.push({ role: 'assistant', content: response });
  }

  // Speak the response
  await speakAndStream(session, response);

  // Discard any speech that accumulated while AI was speaking —
  // it was spoken BEFORE the user heard this question, so it can't be an answer to it
  if (session.accumulatedText.length > 0) {
    console.log(`[Call:${callId}] Discarding ${session.accumulatedText.length} pre-question segments: "${session.accumulatedText.join(' ')}"`);
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

  // Check if more speech accumulated while we were processing
  if (session.accumulatedText && session.accumulatedText.length > 0) {
    const queuedText = session.accumulatedText.join(' ');
    session.accumulatedText = [];
    // Small delay to let TTS finish before processing next
    setTimeout(() => processUserSpeech(callId, queuedText), 1000);
  }
}

async function speakAndStream(session, text) {
  if (!session || session.isEnding) return;

  session.isAiSpeaking = true;

  // Use currentLanguage (tracks auto-detect switches) with fallback to call.language
  const ttsLanguage = session.currentLanguage || session.call.language;
  const ttsGender = session.call.gender;

  try {
    // Generate TTS audio
    const mulawBase64 = await generateSpeech(
      text,
      ttsLanguage,
      ttsGender,
      CARTESIA_KEY
    );

    // Split into chunks and stream to Twilio
    const chunks = chunkAudio(mulawBase64);

    for (const chunk of chunks) {
      if (session.ws.readyState !== 1) break; // WebSocket not open

      session.ws.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload: chunk },
      }));
    }

    // Send mark to know when playback is done
    session.ws.send(JSON.stringify({
      event: 'mark',
      streamSid: session.streamSid,
      mark: { name: 'tts-done' },
    }));
  } catch (error) {
    console.error(`[TTS] Error:`, error.message);
    session.isAiSpeaking = false;

    // Retry once
    try {
      const mulawBase64 = await generateSpeech(
        text,
        ttsLanguage,
        ttsGender,
        CARTESIA_KEY
      );
      const chunks = chunkAudio(mulawBase64);
      for (const chunk of chunks) {
        if (session.ws.readyState !== 1) break;
        session.ws.send(JSON.stringify({
          event: 'media',
          streamSid: session.streamSid,
          media: { payload: chunk },
        }));
      }
      session.ws.send(JSON.stringify({
        event: 'mark',
        streamSid: session.streamSid,
        mark: { name: 'tts-done' },
      }));
    } catch (retryErr) {
      console.error(`[TTS] Retry failed:`, retryErr.message);
      session.isAiSpeaking = false;
    }
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
