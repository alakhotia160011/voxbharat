import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HINDI_CONVERSATION_F,
  HINDI_CONVERSATION_M,
  BENGALI_CONVERSATION_F,
  BENGALI_CONVERSATION_M,
} from '../../data/conversations';
import VoiceWave from '../shared/VoiceWave';
import SectionHeading from '../shared/SectionHeading';
import { fadeInUp, sectionViewport } from '../../styles/animations';

const CARTESIA_VOICES = [
  { id: '95d51f79-c397-46f9-b49a-23763d3eaa2d', name: 'Hindi Female', gender: 'Female', lang: 'hi' },
  { id: '7e8cb11d-37af-476b-ab8f-25da99b18644', name: 'Hindi Male', gender: 'Male', lang: 'hi' },
  { id: '59ba7dee-8f9a-432f-a6c0-ffb33666b654', name: 'Bengali Female', gender: 'Female', lang: 'bn' },
  { id: '2ba861ea-7cdc-43d1-8608-4045b5a41de5', name: 'Bengali Male', gender: 'Male', lang: 'bn' },
];

const VOICE_LABELS = {
  'Hindi Female': 'Hindi \u2640',
  'Hindi Male': 'Hindi \u2642',
  'Bengali Female': 'Bengali \u2640',
  'Bengali Male': 'Bengali \u2642',
};

export default function DemoSection({ onShowSampleReport, onShowSampleCallLog }) {
  const [selectedVoice, setSelectedVoice] = useState('95d51f79-c397-46f9-b49a-23763d3eaa2d');
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callComplete, setCallComplete] = useState(false);
  const [apiKey, setApiKey] = useState('sk_car_Hamdih147oPiXJqLhbNs9w');
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef = useRef(null);
  const abortRef = useRef(null);
  const timersRef = useRef([]);
  const conversationRef = useRef(null);

  // ── Helpers ──

  const getSelectedVoiceObj = () => CARTESIA_VOICES.find((v) => v.id === selectedVoice);

  const getConversation = () => {
    const voice = getSelectedVoiceObj();
    if (!voice) return HINDI_CONVERSATION_F;
    if (voice.lang === 'hi' && voice.gender === 'Female') return HINDI_CONVERSATION_F;
    if (voice.lang === 'hi' && voice.gender === 'Male') return HINDI_CONVERSATION_M;
    if (voice.lang === 'bn' && voice.gender === 'Female') return BENGALI_CONVERSATION_F;
    if (voice.lang === 'bn' && voice.gender === 'Male') return BENGALI_CONVERSATION_M;
    return HINDI_CONVERSATION_F;
  };

  const getRespondentVoice = () => {
    const voice = getSelectedVoiceObj();
    if (!voice) return CARTESIA_VOICES[1].id;
    const oppositeGender = voice.gender === 'Female' ? 'Male' : 'Female';
    const match = CARTESIA_VOICES.find((v) => v.lang === voice.lang && v.gender === oppositeGender);
    return match ? match.id : voice.id;
  };

  const getSelectedLanguage = () => {
    const voice = getSelectedVoiceObj();
    return voice ? voice.lang : 'hi';
  };

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  // ── Text-only demo ──

  const runTextDemo = () => {
    setCallComplete(false);
    setDemoActive(true);
    setDemoStep(0);
    setIsSpeaking(false);

    const conversation = getConversation();

    conversation.forEach((_, idx) => {
      const timer = setTimeout(() => {
        setDemoStep(idx + 1);

        // If it is an AI message, briefly pulse the speaking indicator
        if (conversation[idx].speaker === 'ai') {
          setIsSpeaking(true);
          const speakTimer = setTimeout(() => setIsSpeaking(false), 800);
          timersRef.current.push(speakTimer);
        }

        // On last message, mark complete
        if (idx === conversation.length - 1) {
          const doneTimer = setTimeout(() => {
            setCallComplete(true);
            setDemoActive(false);
            setIsSpeaking(false);
          }, 1000);
          timersRef.current.push(doneTimer);
        }
      }, (idx + 1) * 1500);

      timersRef.current.push(timer);
    });
  };

  // ── Voice demo (Cartesia TTS) ──

  const runVoiceDemo = async () => {
    setCallComplete(false);
    setDemoActive(true);
    setDemoStep(0);
    setIsSpeaking(false);

    const conversation = getConversation();
    const aiVoiceId = selectedVoice;
    const respondentVoiceId = getRespondentVoice();
    const language = getSelectedLanguage();

    abortRef.current = new AbortController();

    for (let idx = 0; idx < conversation.length; idx++) {
      // Check if demo was stopped
      if (abortRef.current.signal.aborted) return;

      const msg = conversation[idx];
      const voiceId = msg.speaker === 'ai' ? aiVoiceId : respondentVoiceId;

      setDemoStep(idx + 1);

      try {
        setIsSpeaking(true);

        const res = await fetch('https://api.cartesia.ai/tts/bytes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Cartesia-Version': '2024-06-10',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_id: 'sonic-3',
            transcript: msg.text,
            voice: { mode: 'id', id: voiceId },
            language: language,
            output_format: {
              container: 'wav',
              encoding: 'pcm_f32le',
              sample_rate: 44100,
            },
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        // Play audio and wait for it to finish
        await new Promise((resolve, reject) => {
          if (abortRef.current.signal.aborted) {
            URL.revokeObjectURL(url);
            reject(new Error('Aborted'));
            return;
          }

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            setIsSpeaking(false);
            resolve();
          };

          audio.onerror = () => {
            URL.revokeObjectURL(url);
            setIsSpeaking(false);
            reject(new Error('Audio playback error'));
          };

          audio.play().catch((err) => {
            URL.revokeObjectURL(url);
            setIsSpeaking(false);
            reject(err);
          });
        });

        // Short pause between messages
        if (idx < conversation.length - 1) {
          await new Promise((resolve) => {
            const t = setTimeout(resolve, 400);
            timersRef.current.push(t);
          });
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.message === 'Aborted') {
          return;
        }
        // Fall back to text-only timing for remaining messages
        console.warn('Voice demo error, falling back to text mode:', err.message);
        setIsSpeaking(false);

        for (let j = idx + 1; j < conversation.length; j++) {
          if (abortRef.current?.signal.aborted) return;
          await new Promise((resolve) => {
            const t = setTimeout(resolve, 1500);
            timersRef.current.push(t);
          });
          if (abortRef.current?.signal.aborted) return;
          setDemoStep(j + 1);

          if (conversation[j].speaker === 'ai') {
            setIsSpeaking(true);
            await new Promise((resolve) => {
              const t = setTimeout(resolve, 800);
              timersRef.current.push(t);
            });
            setIsSpeaking(false);
          }
        }
        break;
      }
    }

    // Demo finished
    if (!abortRef.current?.signal.aborted) {
      setCallComplete(true);
      setDemoActive(false);
      setIsSpeaking(false);
    }
  };

  // ── Stop demo ──

  const stopDemo = () => {
    clearTimers();
    if (abortRef.current) {
      abortRef.current.abort();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setDemoActive(false);
    setIsSpeaking(false);
  };

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      clearTimers();
      if (abortRef.current) abortRef.current.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ── Auto-scroll conversation ──

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [demoStep]);

  // ── Derived state ──

  const conversation = getConversation();
  const visibleMessages = conversation.slice(0, demoStep);
  const voice = getSelectedVoiceObj();
  const langCode = voice ? voice.lang : 'hi';

  return (
    <section id="demo-section" className="py-20 lg:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left Column: Controls ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={sectionViewport}
            variants={fadeInUp}
          >
            <SectionHeading
              number={3}
              title="Hear the AI in Action"
            />

            <p className="text-[#6b4c3a] text-lg leading-relaxed mt-4 font-body">
              Experience a real voice survey conversation. Our AI conducts natural
              interviews in Hindi and Bengali &mdash; listen to how it builds trust
              and adapts to responses.
            </p>

            {/* Voice selector */}
            <div className="mt-8 flex flex-wrap gap-2">
              {CARTESIA_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    if (!demoActive) {
                      setSelectedVoice(v.id);
                      setDemoStep(0);
                      setCallComplete(false);
                    }
                  }}
                  disabled={demoActive}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedVoice === v.id
                      ? 'bg-[#e8550f] text-white shadow-md'
                      : 'border border-[#3d2314]/20 text-[#3d2314] hover:border-[#e8550f]/40 hover:text-[#e8550f]'
                  } ${demoActive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {VOICE_LABELS[v.name]}
                </button>
              ))}
            </div>

            {/* API Key Settings */}
            <div className="mt-6">
              <button
                onClick={() => setShowApiSettings(!showApiSettings)}
                className="text-xs text-[#6b4c3a]/50 hover:text-[#e8550f] transition-colors font-body flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showApiSettings ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Settings
              </button>

              <AnimatePresence>
                {showApiSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3">
                      <label className="block text-sm text-[#6b4c3a]/70 font-body mb-1">
                        Cartesia API Key
                      </label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk_car_..."
                        className="w-full max-w-sm text-sm rounded-lg border border-[#3d2314]/15 py-2 px-3 font-body text-[#3d2314] placeholder:text-[#6b4c3a]/30 focus:outline-none focus:ring-2 focus:ring-[#e8550f]/30 focus:border-[#e8550f]/50 bg-white"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Demo buttons */}
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              {demoActive ? (
                <button
                  onClick={stopDemo}
                  className="px-6 py-3 bg-[#e8550f] text-white rounded-full font-medium font-body transition-all hover:bg-[#c24a0e] shadow-lg shadow-[#e8550f]/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  Stop
                </button>
              ) : (
                <button
                  onClick={runVoiceDemo}
                  className="px-6 py-3 bg-[#e8550f] text-white rounded-full font-medium font-body transition-all hover:bg-[#c24a0e] shadow-lg shadow-[#e8550f]/20 flex items-center gap-2"
                >
                  {isSpeaking ? (
                    <VoiceWave active={true} color="#ffffff" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  Play Voice Demo
                </button>
              )}

              <button
                onClick={runTextDemo}
                disabled={demoActive}
                className={`px-6 py-3 border border-[#3d2314]/20 rounded-full text-[#3d2314] font-medium font-body transition-all hover:border-[#e8550f]/40 hover:text-[#e8550f] ${
                  demoActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Text Only
              </button>
            </div>

            {/* Call complete badge */}
            {callComplete && !demoActive && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 text-green-600 text-sm font-body"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Survey Complete
              </motion.div>
            )}

            {/* Secondary links */}
            <div className="mt-6 flex gap-6">
              <button
                onClick={onShowSampleCallLog}
                className="text-sm text-[#e8550f] hover:underline font-body transition-colors"
              >
                Sample Call Log
              </button>
              <button
                onClick={onShowSampleReport}
                className="text-sm text-[#e8550f] hover:underline font-body transition-colors"
              >
                Sample Report
              </button>
            </div>
          </motion.div>

          {/* ── Right Column: Phone Frame ── */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, y: 40, rotate: 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={sectionViewport}
            transition={{ duration: 0.7, type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="rounded-[2.5rem] border-[8px] border-[#1a1210] bg-[#1a1210] shadow-2xl overflow-hidden max-w-[440px] w-full"
              style={{ aspectRatio: '9/13' }}
            >
              <div className="flex flex-col h-full">

                {/* Status bar */}
                <div className="bg-[#1a1210] py-2 px-4 flex justify-between items-center flex-shrink-0">
                  <span className="text-xs text-white/60 font-body">VoxBharat AI</span>
                  <span className="text-xs font-body flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        demoActive ? 'bg-green-400' : 'bg-white/30'
                      }`}
                    />
                    <span className={demoActive ? 'text-green-400' : 'text-white/40'}>
                      {demoActive ? 'Connected' : 'Idle'}
                    </span>
                  </span>
                  <span className="text-xs text-white/40 font-body uppercase">{langCode}</span>
                </div>

                {/* VoiceWave area */}
                <div className="bg-[#1a1210] py-4 flex justify-center flex-shrink-0">
                  <VoiceWave active={isSpeaking} color="#ffffff" />
                </div>

                {/* Conversation area */}
                <div ref={conversationRef} className="bg-[#faf8f5] flex-1 overflow-y-auto p-4 space-y-3 relative">
                  {/* Empty state */}
                  {visibleMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[#6b4c3a]/30 text-sm font-body text-center leading-relaxed">
                        Press play to start<br />a voice survey demo
                      </p>
                    </div>
                  )}

                  {/* Messages */}
                  <AnimatePresence>
                    {visibleMessages.map((msg, idx) => (
                      <motion.div
                        key={`${langCode}-${idx}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] ${
                            msg.speaker === 'ai'
                              ? 'bg-white border border-gray-100 rounded-2xl rounded-bl-md'
                              : 'bg-[#e8550f] rounded-2xl rounded-br-md'
                          } px-4 py-3`}
                        >
                          <p
                            className={`text-[10px] uppercase mb-1 font-body tracking-wider ${
                              msg.speaker === 'ai'
                                ? 'text-[#6b4c3a]/40'
                                : 'text-white/50'
                            }`}
                          >
                            {msg.speaker === 'ai' ? 'AI' : 'Respondent'}
                          </p>
                          <p
                            className={`text-[15px] leading-relaxed font-serif-indic ${
                              msg.speaker === 'ai' ? 'text-[#3d2314]' : 'text-white'
                            }`}
                          >
                            {msg.text}
                          </p>

                          {/* Translation (shown when transcript toggle is on) */}
                          {showTranscript && msg.translation && (
                            <p
                              className={`text-xs mt-2 pt-2 border-t leading-relaxed font-body ${
                                msg.speaker === 'ai'
                                  ? 'text-[#6b4c3a]/50 border-gray-100'
                                  : 'text-white/60 border-white/20'
                              }`}
                            >
                              {msg.translation}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                </div>

                {/* Transcript toggle bar */}
                <div className="bg-[#faf8f5] border-t border-gray-100 px-4 py-2 flex-shrink-0">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-xs text-[#6b4c3a]/50 hover:text-[#e8550f] font-body transition-colors flex items-center gap-1.5 w-full justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    {showTranscript ? 'Hide' : 'Show'} English Translation
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
