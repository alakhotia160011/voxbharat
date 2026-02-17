// VoxBharat Call Server - Twilio + Cartesia STT/TTS + Claude
// Handles real phone calls with AI voice surveys

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import twilio from 'twilio';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mulawToPcm16k, pcm16kToMulaw } from './audio-convert.js';
import { generateSpeech, chunkAudio } from './cartesia-tts.js';
import { CartesiaSTT } from './cartesia-stt.js';
import { ClaudeConversation } from './claude-conversation.js';
import {
  createCall, getCall, getCallByStreamSid, updateCall,
  getActiveCalls, removeCall, saveCallToFile
} from './call-store.js';
import { initDb, updateCallRecording } from './db.js';
import { getVoicemailMessage, SURVEY_SCRIPTS, generateCustomGreeting } from './survey-scripts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

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

// Pre-generated greeting audio cache: callId -> { mulawBase64: string, language: string }
// Generated during call initiation (while phone is ringing) so greeting plays instantly on pickup
const greetingAudioCache = new Map();

/**
 * Check if STT text is likely echo of recently spoken TTS audio.
 * On phone calls, the phone mic can pick up the AI's voice from the speaker.
 */
function isLikelyEcho(sttText, recentTtsTexts) {
  if (!recentTtsTexts || recentTtsTexts.length === 0) return false;
  const stt = sttText.toLowerCase().trim();
  if (stt.length < 3) return true; // Too short, treat as noise

  for (const tts of recentTtsTexts) {
    const ttsLower = tts.toLowerCase();
    // If STT text is fully contained within recent TTS text, it's echo
    if (ttsLower.includes(stt)) return true;
    // If first 12 chars match, likely same sentence being echoed back
    if (stt.length >= 12 && ttsLower.startsWith(stt.substring(0, 12))) return true;
  }
  return false;
}

/**
 * Check if short speech is a back-channel (active listening signal, not an interruption).
 * Indian conversational style uses frequent "haan haan" / "accha" while listening.
 * These should NOT stop the AI from speaking.
 */
const BACKCHANNEL_TOKENS = new Set([
  // English
  'uh huh', 'uh-huh', 'mm hmm', 'mmhmm', 'mm', 'hmm', 'hm',
  'yeah', 'yep', 'yup', 'ok', 'okay', 'right', 'sure', 'got it', 'i see',
  // Hindi / Urdu
  'haan', 'ha', 'haan haan', 'han', 'accha', 'achha', 'acha',
  'theek hai', 'thik hai', 'theek', 'thik', 'ji', 'ji haan', 'ji ha',
  'sahi', 'sahi hai', 'aur', 'phir', 'haan ji',
  // Bengali
  'hyan', 'thik ache', 'thik', 'besh', 'accha',
  // Gujarati
  'ha', 'bhai', 'barabar',
  // Tamil
  'aamaa', 'seri', 'sari',
  // Telugu
  'avunu', 'sare',
  // Marathi
  'ho', 'bara', 'barobar',
  // Punjabi
  'haanji', 'theek aa',
]);

function isBackchannel(normalizedText) {
  // Direct match
  if (BACKCHANNEL_TOKENS.has(normalizedText)) return true;
  // Check if text is just repeated tokens ("haan haan haan")
  const words = normalizedText.split(/\s+/);
  if (words.length <= 3 && words.every(w => BACKCHANNEL_TOKENS.has(w))) return true;
  return false;
}

/**
 * Detect if the user is asking for a question to be repeated.
 * Returns true for phrases like "what?", "repeat that", "phir se bolo", "I didn't hear", etc.
 */
const REPEAT_PATTERNS = [
  // English
  /^what\??$/, /^huh\??$/, /^sorry\??$/, /^excuse me\??$/, /^pardon\??$/,
  /repeat/, /say that again/, /say again/, /one more time/, /come again/,
  /didn.?t (hear|catch|understand|get)/, /can.?t hear/, /what did you (say|ask)/,
  /what was that/, /what.?s that/,
  // Hindi / Urdu
  /kya\??$/, /kya bola/, /kya kaha/, /phir se/, /dobara/, /fir se/,
  /samajh nahi/, /sunai nahi/, /suna nahi/, /nahi suna/, /nahi samjha/,
  /ek baar aur/, /ek bar aur/, /wapas bolo/, /dubara bolo/,
  // Bengali
  /ki bolle/, /abar bolo/, /bujhini/, /shunini/,
  // Tamil
  /enna/, /puriyala/, /marubadiyum/,
  // Telugu
  /enti/, /artham kaale/, /malli cheppu/,
  // Marathi
  /kay mhanale/, /punha sanga/, /kalale nahi/,
];

function isRepeatRequest(normalizedText) {
  return REPEAT_PATTERNS.some(p => p.test(normalizedText));
}

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
      // Record the full call (both sides) for compliance & review
      record: true,
      recordingStatusCallback: `${PUBLIC_URL}/call/recording-callback?callId=${call.id}`,
      recordingStatusCallbackMethod: 'POST',
      recordingStatusCallbackEvent: ['completed'],
      // Answering Machine Detection — waits for beep before signaling
      machineDetection: 'DetectMessageEnd',
      asyncAmdStatusCallback: `${PUBLIC_URL}/call/amd-callback?callId=${call.id}`,
      asyncAmdStatusCallbackMethod: 'POST',
    });

    updateCall(call.id, {
      twilioCallSid: twilioCall.sid,
      status: 'ringing',
    });

    console.log(`[Call] Initiated: ${call.id} -> ${phoneNumber} (${language}/${gender})`);

    // Pre-generate greeting TTS while phone is ringing (eliminates lag on pickup)
    const greetingLang = autoDetectLanguage ? 'en' : language;
    let greetingText;
    if (autoDetectLanguage) {
      greetingText = customSurvey
        ? `Hello! I'm an AI agent calling from VoxBharat to conduct a survey about ${customSurvey.name}. Do you have a few minutes to share your thoughts?`
        : "Hello! I'm an AI agent calling from VoxBharat. We're conducting a short survey about people's lives and experiences. It'll only take a few minutes. Shall we begin?";
    } else if (customSurvey) {
      greetingText = generateCustomGreeting(language, gender, customSurvey.name);
    } else if (SURVEY_SCRIPTS[language]) {
      greetingText = SURVEY_SCRIPTS[language].greeting;
    } else {
      greetingText = generateCustomGreeting(language, gender, 'VoxBharat Survey');
    }

    // Fire-and-forget: generate TTS in background while phone rings
    generateSpeech(greetingText, greetingLang, gender, CARTESIA_KEY, { speed: 0.85 })
      .then(mulawBase64 => {
        greetingAudioCache.set(call.id, { mulawBase64, language: greetingLang });
        console.log(`[Call:${call.id}] Greeting audio pre-cached`);
      })
      .catch(err => {
        console.warn(`[Call:${call.id}] Greeting pre-cache failed (will generate on pickup): ${err.message}`);
      });

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

// Twilio AMD (Answering Machine Detection) callback
app.post('/call/amd-callback', async (req, res) => {
  const callId = req.query.callId;
  const answeredBy = req.body.AnsweredBy; // 'human' | 'machine_end_beep' | 'machine_end_silence' | 'machine_end_other' | 'fax' | 'unknown'

  console.log(`[AMD] Call ${callId}: ${answeredBy}`);
  res.sendStatus(200); // Respond immediately so Twilio doesn't retry

  if (!callId) return;
  const call = getCall(callId);
  if (!call) return;

  updateCall(callId, { answeredBy });

  // Only act on voicemail detection (after the beep)
  const isVoicemail = answeredBy === 'machine_end_beep' || answeredBy === 'machine_end_silence' || answeredBy === 'machine_end_other';
  if (!isVoicemail) return;

  console.log(`[AMD:${callId}] Voicemail detected — leaving message...`);

  const session = callSessions.get(callId);
  if (!session || session.isEnding) return;

  // Flag session as voicemail so normal survey flow stops
  session.isVoicemail = true;
  session.isAiSpeaking = false;
  session.isProcessing = false;

  // Clear any queued audio (stop AI greeting/response)
  if (session.ws.readyState === 1) {
    session.ws.send(JSON.stringify({
      event: 'clear',
      streamSid: session.streamSid,
    }));
  }

  // Generate and stream voicemail message
  const language = session.currentLanguage || call.language;
  const surveyName = call.customSurvey?.name || null;
  const voicemailText = getVoicemailMessage(language, call.gender, surveyName);

  console.log(`[AMD:${callId}] Voicemail (${language}): "${voicemailText.substring(0, 60)}..."`);

  try {
    await speakSentence(session, voicemailText, language);

    // Mark when voicemail audio finishes playing — triggers hangup in WS handler
    if (session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({
        event: 'mark',
        streamSid: session.streamSid,
        mark: { name: 'voicemail-done' },
      }));
    }

    updateCall(callId, { voicemailLeft: true, status: 'voicemail' });

    // Fallback hangup if mark event never arrives (e.g. WebSocket drops)
    setTimeout(async () => {
      if (!session.isEnding) {
        console.log(`[AMD:${callId}] Fallback hangup (mark event not received)`);
        try {
          if (call.twilioCallSid) {
            await twilioClient.calls(call.twilioCallSid).update({ status: 'completed' });
          }
        } catch (e) { /* ignore */ }
        handleCallEnd(callId, 'voicemail');
      }
    }, 15000);
  } catch (error) {
    console.error(`[AMD:${callId}] Voicemail TTS error:`, error.message);
    updateCall(callId, { status: 'voicemail-failed' });
    handleCallEnd(callId, 'voicemail-failed');
  }
});

// Twilio recording callback — fires when recording is ready
app.post('/call/recording-callback', (req, res) => {
  const callId = req.query.callId;
  const { RecordingSid, RecordingUrl, RecordingDuration, RecordingStatus } = req.body;

  res.sendStatus(200);

  if (!callId || RecordingStatus !== 'completed') return;

  // Twilio recording URL (append .mp3 for direct download)
  const recordingUrl = `${RecordingUrl}.mp3`;
  const durationSec = parseInt(RecordingDuration, 10) || null;

  console.log(`[Recording] Call ${callId}: ${recordingUrl} (${durationSec}s)`);

  updateCall(callId, {
    recordingSid: RecordingSid,
    recordingUrl,
    recordingDuration: durationSec,
  });

  // Also persist to Postgres (call may already be cleaned up from memory)
  updateCallRecording(callId, RecordingSid, recordingUrl, durationSec).catch(err => {
    console.error(`[Recording] Postgres update failed for ${callId}:`, err.message);
  });
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
          if (!session || session.isEnding || session.isVoicemail) break;
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
          // Voicemail audio finished playing — hang up
          if (session && msg.mark?.name === 'voicemail-done') {
            console.log(`[WS] Voicemail played, hanging up in 2s...`);
            setTimeout(async () => {
              if (session.isEnding) return;
              try {
                const vmCall = getCall(callId);
                if (vmCall?.twilioCallSid) {
                  await twilioClient.calls(vmCall.twilioCallSid).update({ status: 'completed' });
                }
              } catch (e) {
                console.error(`[WS] Voicemail hangup error:`, e.message);
              }
              handleCallEnd(callId, 'voicemail');
            }, 2000);
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
    isVoicemail: false,
    greetingDone: false,
    firstResponseDone: false,  // Track if first Claude response has been sent
    accumulatedText: [],
    recentTtsTexts: [],
    call,
    currentLanguage: call.autoDetectLanguage ? 'en' : call.language,
  };

  // Create Cartesia STT - uses sessionObj directly (no separate closure vars)
  const stt = new CartesiaSTT(CARTESIA_KEY, {
    language: call.autoDetectLanguage ? 'auto' : call.language,
    onTranscript: ({ text, isFinal, language: detectedLang }) => {
      if (sessionObj.isEnding || sessionObj.isVoicemail) return;

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

      // --- BARGE-IN: Detect user speech during AI playback (partial + final) ---
      if (sessionObj.isAiSpeaking && sessionObj.greetingDone) {
        const bargeText = (text || '').trim();
        if (bargeText.length < 3) return; // Too short, noise

        // Echo detection: check if STT text matches recently spoken TTS audio
        if (isLikelyEcho(bargeText, sessionObj.recentTtsTexts)) return;

        // BACK-CHANNEL FILTER: Don't treat listening signals as interruptions.
        // Indian conversational style includes frequent "haan haan" / "accha" while
        // the other person is speaking. These should NOT stop the AI.
        const normalized = bargeText.toLowerCase().replace(/[^\w\s]/g, '');
        const wordCount = normalized.split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount <= 2 && isBackchannel(normalized)) {
          if (isFinal) {
            console.log(`[Barge-in:${callId}] Back-channel filtered (AI continues): "${bargeText}"`);
          }
          return; // Let AI keep speaking — this is just active listening
        }

        // Real user speech during AI playback — trigger barge-in
        console.log(`[Barge-in:${callId}] User interrupted (${isFinal ? 'final' : 'partial'}): "${bargeText}"`);

        // Clear Twilio audio buffer to stop playback immediately
        if (sessionObj.ws.readyState === 1) {
          sessionObj.ws.send(JSON.stringify({
            event: 'clear',
            streamSid: sessionObj.streamSid,
          }));
        }
        sessionObj.isAiSpeaking = false;
        sessionObj.interrupted = true;
        // Clear echo tracking since we stopped playback
        sessionObj.recentTtsTexts = [];

        // Only accumulate final transcripts for Claude processing
        if (isFinal) {
          let cleaned = bargeText.replace(/(.{2,6}?)\1{4,}/g, '$1');
          if (cleaned.length >= 2) {
            sessionObj.accumulatedText.push(cleaned);
          }
          if (!sessionObj.isProcessing) {
            const fullText = sessionObj.accumulatedText.join(' ');
            sessionObj.accumulatedText = [];
            processUserSpeech(callId, fullText);
          }
        }
        return;
      }

      // --- NORMAL FLOW: only process final transcripts ---
      if (isFinal && text.trim()) {
        let trimmed = text.trim();

        // Filter out Whisper looping/hallucination artifacts
        trimmed = trimmed.replace(/(.{2,6}?)\1{4,}/g, '$1');
        if (trimmed.length < 2) return;

        sessionObj.accumulatedText.push(trimmed);
        console.log(`[STT:${callId}] Accumulated: "${trimmed}" (lang=${detectedLang || '?'}, total: ${sessionObj.accumulatedText.length}, processing: ${sessionObj.isProcessing})`);

        // Reset silence timer
        if (sessionObj.silenceTimer) clearTimeout(sessionObj.silenceTimer);

        // If Claude is busy, just accumulate (it will be processed when Claude finishes)
        if (sessionObj.isProcessing) return;

        // Wait for brief silence after last transcript, then send to Claude
        // Adaptive silence timer:
        //  - First response (user saying "yes"/"ok" to participate): 200ms — we know they're just consenting
        //  - Short utterances (<15 chars, like "haan", "twenty five"): 350ms
        //  - Normal responses: 600ms
        const currentText = sessionObj.accumulatedText.join(' ');
        let silenceMs;
        if (!sessionObj.firstResponseDone) {
          silenceMs = 200; // User is just confirming participation — process fast
        } else if (currentText.length < 15) {
          silenceMs = 350;
        } else {
          silenceMs = 600;
        }
        sessionObj.silenceTimer = setTimeout(() => {
          if (sessionObj.accumulatedText.length > 0 && !sessionObj.isProcessing) {
            const fullText = sessionObj.accumulatedText.join(' ');
            sessionObj.accumulatedText = [];
            processUserSpeech(callId, fullText);
          }
        }, silenceMs);
      }
    },
    onError: (msg) => console.error(`[STT:${callId}]`, msg),
  });

  // Start STT connection in background — not needed until greeting finishes
  // (media events during greeting are already skipped)
  const sttConnectPromise = stt.connect().then(() => {
    sessionObj.stt = stt;
    console.log(`[STT:${callId}] Connected`);
  }).catch(err => {
    console.error(`[STT:${callId}] Connection failed:`, err.message);
  });
  sessionObj.stt = stt; // Assign immediately so media handler can check .isConnected
  sessionObj.sttConnectPromise = sttConnectPromise;

  // 10 minute timeout
  sessionObj.timeout = setTimeout(() => {
    console.log(`[Call] Timeout: ${callId}`);
    handleCallEnd(callId, 'timeout');
  }, 10 * 60 * 1000);

  return sessionObj;
}

async function sendGreeting(session) {
  const callId = session.call.id;
  const greeting = session.conversation.getGreeting();
  console.log(`[Call] Greeting: "${greeting.substring(0, 50)}..."`);

  // Check for pre-cached greeting audio (generated while phone was ringing)
  const cached = greetingAudioCache.get(callId);
  if (cached) {
    greetingAudioCache.delete(callId);
    console.log(`[Call:${callId}] Using pre-cached greeting audio (zero TTS latency)`);

    session.isAiSpeaking = true;

    // Track for echo detection
    session.recentTtsTexts.push(greeting);
    if (session.recentTtsTexts.length > 5) session.recentTtsTexts.shift();

    const chunks = chunkAudio(cached.mulawBase64);
    for (let i = 0; i < chunks.length; i++) {
      if (session.ws.readyState !== 1 || session.isEnding) break;
      session.ws.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload: chunks[i] },
      }));
      if ((i + 1) % 40 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }

    // Send mark to know when playback is done
    if (session.ws.readyState === 1) {
      session.ws.send(JSON.stringify({
        event: 'mark',
        streamSid: session.streamSid,
        mark: { name: 'tts-done' },
      }));
    }
  } else {
    // Fallback: generate TTS now (cache miss — e.g. pre-generation failed)
    console.log(`[Call:${callId}] No cached greeting, generating TTS now`);
    await speakAndStream(session, greeting);
  }

  // Ensure STT is connected before we start listening (it was connecting in background)
  if (session.sttConnectPromise) {
    await session.sttConnectPromise;
    session.sttConnectPromise = null;
  }

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

  // Build text with context for Claude
  let textForClaude = text;

  // Detect repeat/clarification requests and tag them explicitly
  const normalizedForRepeat = text.toLowerCase().replace(/[^\w\s]/g, '');
  if (isRepeatRequest(normalizedForRepeat)) {
    textForClaude = `[REPEAT_REQUEST] ${textForClaude}`;
    console.log(`[Call:${callId}] Repeat request detected: "${text}"`);
  }

  // Add interruption context so Claude knows what it was saying when the user spoke
  if (session.interruptionContext) {
    textForClaude = `[USER_INTERRUPTED: You were saying "${session.interruptionContext}" when the respondent interrupted with:] ${textForClaude}`;
    console.log(`[Call:${callId}] Sending interruption context to Claude`);
    session.interruptionContext = null;
  }

  // Add language hint for auto-detect mode
  if (langHint) {
    textForClaude = `[spoken_language:${langHint}] ${textForClaude}`;
  }

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
  const spokenSentences = [];

  // Pipeline: queue TTS calls so Claude keeps streaming while TTS generates/plays.
  // Each call runs in sequence (audio order preserved) but Claude isn't blocked.
  let ttsQueue = Promise.resolve();
  const enqueueTTS = (text, lang) => {
    spokenSentences.push(text);
    ttsQueue = ttsQueue.then(() => {
      if (session.isEnding || session.interrupted) return;
      return speakSentence(session, text, lang);
    });
  };

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

      // Split text at natural break points — aggressive splitting for lower latency
      if (langTagParsed && pendingText.trim().length > 5) {
        const trimLen = pendingText.trim().length;
        const sentenceEnd = /[.!?।]\s*$/.test(pendingText);
        const clauseBreak = trimLen > 30 && /[,;:—]\s*$/.test(pendingText);
        const longChunk = trimLen > 60; // Force-break long text without punctuation

        if (sentenceEnd || clauseBreak || longChunk) {
          const sentence = pendingText.trim();
          pendingText = '';
          enqueueTTS(sentence, ttsLanguage);
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
  if (remaining && !session.isEnding && !session.interrupted) {
    enqueueTTS(remaining, ttsLanguage);
  }

  // Wait for all queued TTS to finish playing
  await ttsQueue;

  // If user interrupted, store what was spoken so Claude gets context
  if (session.interrupted && spokenSentences.length > 0) {
    session.interruptionContext = spokenSentences.join(' ');
    console.log(`[Call:${callId}] Interrupted after speaking: "${session.interruptionContext.substring(0, 80)}..."`);
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

  // Keep any speech accumulated while AI was speaking — the user may have been
  // eagerly answering before the AI finished. Don't discard real responses.
  if (session.accumulatedText.length > 0 && !session.interrupted) {
    console.log(`[Call:${callId}] User spoke during AI (${session.accumulatedText.length} segments) — keeping for processing`);
  }
  if (session.silenceTimer) {
    clearTimeout(session.silenceTimer);
    session.silenceTimer = null;
  }

  // Unlock processing
  session.isProcessing = false;
  session.firstResponseDone = true;

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

  // Track for echo detection (keep last 5 sentences)
  session.recentTtsTexts.push(text);
  if (session.recentTtsTexts.length > 5) session.recentTtsTexts.shift();

  try {
    const mulawBase64 = await generateSpeech(text, language, gender, CARTESIA_KEY, { speed: 0.85 });
    const chunks = chunkAudio(mulawBase64);

    for (let i = 0; i < chunks.length; i++) {
      if (session.ws.readyState !== 1 || session.isEnding || session.interrupted) break;
      session.ws.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload: chunks[i] },
      }));
      // Yield control every 40 chunks (~800ms audio) so event loop can
      // process STT callbacks for barge-in detection mid-sentence
      if ((i + 1) % 40 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }
  } catch (error) {
    console.error(`[TTS] Sentence error (${language}/${gender}): ${error.message}`);
    // Try English fallback if language-specific voice is unavailable
    if (language !== 'en') {
      try {
        const fallbackBase64 = await generateSpeech(text, 'en', gender, CARTESIA_KEY, { speed: 0.85 });
        const chunks = chunkAudio(fallbackBase64);
        for (let i = 0; i < chunks.length; i++) {
          if (session.ws.readyState !== 1 || session.isEnding || session.interrupted) break;
          session.ws.send(JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: { payload: chunks[i] },
          }));
          if ((i + 1) % 40 === 0) {
            await new Promise(r => setImmediate(r));
          }
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

  // Voicemail calls — no survey data to extract
  if (reason === 'voicemail' || reason === 'voicemail-failed') {
    updateCall(callId, {
      status: reason,
      endedAt: new Date().toISOString(),
    });
    console.log(`[Call:${callId}] Voicemail call ended (left message: ${call.voicemailLeft})`);
    cleanupSession(callId);
    return;
  }

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

      // Save to Postgres
      await saveCallToFile(getCall(callId));
      updateCall(callId, { status: 'saved' });
      console.log(`[Call:${callId}] Survey saved to Postgres`);
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
  greetingAudioCache.delete(callId); // Clean up any unused pre-cached greeting
}

// ============================================
// Start Server
// ============================================

// Initialize Postgres, then start server
initDb().then(() => {
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
}).catch(err => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
