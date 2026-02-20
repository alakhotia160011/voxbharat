import React, { useState, useEffect, useRef } from 'react';
import { LANGUAGES } from '../../data/languages';
import { SURVEY_TYPES, QUESTION_TYPES, GEOGRAPHIES, INDIAN_STATES } from '../../data/surveyTypes';
import VoiceWave from '../shared/VoiceWave';

// ============================================
// FULL SURVEY BUILDER COMPONENT
// ============================================

const FullSurveyBuilder = ({ onClose, onLaunch }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showVoicePreview, setShowVoicePreview] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [playingQuestionId, setPlayingQuestionId] = useState(null);
  const [selectedPreviewVoice, setSelectedPreviewVoice] = useState('95d51f79-c397-46f9-b49a-23763d3eaa2d');
  const [previewLanguage, setPreviewLanguage] = useState('hi');
  const [showCustomQuestionInput, setShowCustomQuestionInput] = useState(false);
  const [customTestText, setCustomTestText] = useState('');
  const [showTestCall, setShowTestCall] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testCallStatus, setTestCallStatus] = useState(null); // null | 'calling' | 'ringing' | 'connected' | 'completed' | 'voicemail' | 'error'
  const [testCallError, setTestCallError] = useState(null);
  const [testCallResult, setTestCallResult] = useState(null);
  const testCallPollRef = useRef(null);
  const audioPreviewRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (testCallPollRef.current) clearInterval(testCallPollRef.current);
    };
  }, []);

  // Auto-expand test call section when results arrive
  useEffect(() => {
    if (testCallStatus === 'completed' || testCallStatus === 'connected' || testCallStatus === 'ringing' || testCallStatus === 'voicemail') {
      setShowTestCall(true);
    }
  }, [testCallStatus]);

  const PREVIEW_VOICES = [
    { id: '95d51f79-c397-46f9-b49a-23763d3eaa2d', name: 'Hindi Female', lang: 'hi' },
    { id: '7e8cb11d-37af-476b-ab8f-25da99b18644', name: 'Hindi Male', lang: 'hi' },
    { id: '59ba7dee-8f9a-432f-a6c0-ffb33666b654', name: 'Bengali Female', lang: 'bn' },
    { id: '2ba861ea-7cdc-43d1-8608-4045b5a41de5', name: 'Bengali Male', lang: 'bn' },
    { id: '07bc462a-c644-49f1-baf7-82d5599131be', name: 'Telugu Female', lang: 'te' },
    { id: '5c32dce6-936a-4892-b131-bafe474afe5f', name: 'Marathi Female', lang: 'mr' },
    { id: 'f227bc18-3704-47fe-b759-8c78a450fdfa', name: 'Marathi Male', lang: 'mr' },
    { id: '25d2c432-139c-4035-bfd6-9baaabcdd006', name: 'Tamil Female', lang: 'ta' },
    { id: '4590a461-bc68-4a50-8d14-ac04f5923d22', name: 'Gujarati Female', lang: 'gu' },
    { id: '91925fe5-42ee-4ebe-96c1-c84b12a85a32', name: 'Gujarati Male', lang: 'gu' },
    { id: '7c6219d2-e8d2-462c-89d8-7ecba7c75d65', name: 'Kannada Female', lang: 'kn' },
    { id: '6baae46d-1226-45b5-a976-c7f9b797aae2', name: 'Kannada Male', lang: 'kn' },
    { id: 'b426013c-002b-4e89-8874-8cd20b68373a', name: 'Malayalam Female', lang: 'ml' },
    { id: '374b80da-e622-4dfc-90f6-1eeb13d331c9', name: 'Malayalam Male', lang: 'ml' },
    { id: '991c62ce-631f-48b0-8060-2a0ebecbd15b', name: 'Punjabi Female', lang: 'pa' },
    { id: '8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56', name: 'Punjabi Male', lang: 'pa' },
    { id: 'f8f5f1b2-f02d-4d8e-a40d-fd850a487b3d', name: 'English Female', lang: 'en' },
    { id: '1259b7e3-cb8a-43df-9446-30971a46b8b0', name: 'English Male', lang: 'en' },
  ];

  // Play text using Cartesia TTS via server proxy (API key kept server-side)
  const playVoice = async (text, questionId = null) => {
    if (isPlayingVoice) {
      // Stop current playback
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
      }
      setIsPlayingVoice(false);
      setPlayingQuestionId(null);
      return;
    }

    setIsPlayingVoice(true);
    setPlayingQuestionId(questionId);

    try {
      const voice = PREVIEW_VOICES.find(v => v.id === selectedPreviewVoice);
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedPreviewVoice,
          language: voice?.lang || 'hi',
        }),
      });

      if (!resp.ok) throw new Error('TTS proxy error');
      const data = await resp.json();

      // Decode base64 MP3 audio
      const binaryStr = atob(data.audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.contentType });
      const url = URL.createObjectURL(blob);

      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }

      audioPreviewRef.current.src = url;
      audioPreviewRef.current.onended = () => {
        URL.revokeObjectURL(url);
        setIsPlayingVoice(false);
        setPlayingQuestionId(null);
      };
      audioPreviewRef.current.onerror = () => {
        URL.revokeObjectURL(url);
        setIsPlayingVoice(false);
        setPlayingQuestionId(null);
      };
      await audioPreviewRef.current.play();
    } catch (e) {
      console.error('Voice preview error:', e);
      setIsPlayingVoice(false);
      setPlayingQuestionId(null);
      alert('Voice preview failed. Check your connection.');
    }
  };

  const [config, setConfig] = useState({
    // Basic
    name: '',
    type: '',
    languages: ['hi'],
    autoDetectLanguage: false,

    // Audience
    geography: 'national',
    states: [],
    sampleSize: 1000,
    targetAudience: '',
    demographics: {
      ageGroups: ['all'],
      gender: 'all',
      education: 'all',
      income: 'all',
      occupation: 'all',
      caste: 'all',
    },
    exclusions: '',

    // Goals
    purpose: '',
    keyQuestions: '',
    analysisGoals: '',

    // Settings
    duration: 10,
    tone: 'conversational',
    sensitivity: 'low',

    // NEW: Additional Metrics
    urgency: 'standard',
    deadline: '',
    budget: '',
    previousSurveyLink: '',
    brandNames: '',
    callTiming: ['morning', 'afternoon', 'evening'],
    retryPolicy: 3,
    incentive: '',
    qualityChecks: true,
    recordAudio: true,
  });

  const [questions, setQuestions] = useState([]);

  // Generate questions dynamically using Claude API
  const generateQuestions = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
        signal: AbortSignal.timeout(90000),
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = 'Failed to generate questions';
        try { msg = JSON.parse(text).message || msg; } catch {}
        throw new Error(msg);
      }

      const data = await response.json();
      let generated = data.questions;

      // Add demographics at end
      generated.push(
        { id: generated.length + 1, type: 'single', text: '\u0906\u092A\u0915\u0940 \u0909\u092E\u094D\u0930 \u0915\u094D\u092F\u093E \u0939\u0948?', textEn: 'What is your age?', options: ['18-25', '26-35', '36-45', '46-55', '55+'], required: true, category: 'Demographics', isDemographic: true },
        { id: generated.length + 2, type: 'single', text: '\u0906\u092A\u0915\u093E \u0932\u093F\u0902\u0917 \u0915\u094D\u092F\u093E \u0939\u0948?', textEn: 'What is your gender?', options: ['Male', 'Female', 'Other', 'Prefer not to say'], required: true, category: 'Demographics', isDemographic: true }
      );

      setQuestions(generated);
      setStep(5);
    } catch (error) {
      console.error('Question generation error:', error);
      const msg = error.name === 'TimeoutError'
        ? 'Request timed out. Please try again. The AI server may be under heavy load.'
        : 'Failed to generate questions: ' + error.message;
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (id, updates) => {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id) => {
    setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const moveQuestion = (id, dir) => {
    const idx = questions.findIndex(q => q.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === questions.length - 1)) return;
    const newQs = [...questions];
    [newQs[idx], newQs[idx + dir]] = [newQs[idx + dir], newQs[idx]];
    setQuestions(newQs);
  };

  const addQuestion = () => {
    const newQ = {
      id: Date.now(),
      type: 'single',
      text: '',
      textEn: '',
      options: ['Option 1', 'Option 2'],
      required: true,
      category: 'Custom'
    };
    setQuestions([...questions, newQ]);
    setEditingQuestion(newQ.id);
  };

  const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || 'http://localhost:3002';

  const initiateTestCall = async () => {
    if (!testPhoneNumber.trim()) return;
    setTestCallStatus('calling');
    setTestCallError(null);
    setTestCallResult(null);

    try {
      const response = await fetch(`${CALL_SERVER}/call/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhoneNumber.trim(),
          language: config.autoDetectLanguage ? 'en' : (config.languages[0] || 'hi'),
          gender: 'female',
          autoDetectLanguage: config.autoDetectLanguage,
          customSurvey: {
            name: config.name || 'Custom Survey',
            tone: config.tone || 'conversational',
            questions: questions.map(q => ({
              id: q.id,
              text: q.text,
              textEn: q.textEn || '',
              type: q.type,
              options: q.options || null,
              category: q.category || 'General',
            })),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Call initiation failed');

      setTestCallStatus('ringing');

      // Poll for status updates
      if (testCallPollRef.current) clearInterval(testCallPollRef.current);
      testCallPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${CALL_SERVER}/call/${data.callId}`);
          if (!res.ok) return;
          const callData = await res.json();
          if (callData.status === 'in-progress' || callData.status === 'surveying') {
            setTestCallStatus('connected');
          } else if (['completed', 'saved'].includes(callData.status)) {
            setTestCallStatus('completed');
            setTestCallResult(callData);
            clearInterval(testCallPollRef.current);
            testCallPollRef.current = null;
          } else if (['voicemail', 'voicemail-failed'].includes(callData.status)) {
            setTestCallStatus('voicemail');
            setTestCallResult(callData);
            clearInterval(testCallPollRef.current);
            testCallPollRef.current = null;
          } else if (callData.status === 'failed') {
            setTestCallStatus('error');
            setTestCallError(callData.error || 'Call failed');
            clearInterval(testCallPollRef.current);
            testCallPollRef.current = null;
          }
        } catch { /* ignore poll errors */ }
      }, 2000);

      // Stop polling after 10 minutes
      setTimeout(() => {
        if (testCallPollRef.current) {
          clearInterval(testCallPollRef.current);
          testCallPollRef.current = null;
        }
      }, 10 * 60 * 1000);
    } catch (err) {
      setTestCallStatus('error');
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
      setTestCallError(
        isNetworkError
          ? 'Call server is not reachable. Make sure the call server is running and VITE_CALL_SERVER_URL is set correctly.'
          : err.message
      );
    }
  };

  const estimatedDuration = Math.ceil(questions.length * 0.75);
  const estimatedCost = config.sampleSize * (config.urgency === 'urgent' ? 55 : config.urgency === 'express' ? 45 : 38);
  const marginOfError = (1.96 * Math.sqrt(0.5 * 0.5 / config.sampleSize) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-cream overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-cream-warm px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-cream-warm rounded-lg cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron to-saffron-deep flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <h1 className="font-display font-semibold text-earth">Survey Builder</h1>
            <p className="text-sm text-earth-mid">{config.name || 'Untitled Survey'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {questions.length > 0 && (
            <div className="text-sm text-earth-mid mr-4">
              {questions.length} questions • ~{estimatedDuration} min
            </div>
          )}
          <button
            onClick={() => setShowVoicePreview(true)}
            className="px-4 py-2 text-saffron border border-saffron rounded-lg hover:bg-saffron/5 cursor-pointer"
          >
            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" /></svg> Preview Voice
          </button>
          <button className="px-4 py-2 bg-cream-warm rounded-lg hover:bg-cream-warm/80 cursor-pointer">
            Save Draft
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-cream-warm px-6 py-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {['Setup', 'Audience', 'Timeline', 'Goals', 'Questions', 'Review'].map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i + 1 <= step && setStep(i + 1)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === i + 1 ? 'bg-saffron text-white'
                  : step > i + 1 ? 'bg-saffron/10 text-saffron cursor-pointer hover:bg-saffron/20'
                  : 'bg-cream-warm text-earth-mid/40'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step > i + 1 ? 'bg-saffron text-white' : ''}`}>
                  {step > i + 1 ? '\u2713' : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < 5 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-saffron' : 'bg-cream-warm'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Step 1: Setup */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-earth mb-2">Let's create your survey</h2>
                <p className="text-gray-600">Start with the basics.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Survey Name *</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="e.g., Bihar Assembly Election Poll 2025"
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20 focus:border-saffron"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-4">Survey Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SURVEY_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setConfig({ ...config, type: type.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        config.type === type.id ? 'border-saffron bg-saffron/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-earth block mb-1">{type.name}</span>
                      <span className="text-xs text-gray-500">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-4">Survey Languages *</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        const langs = config.languages.includes(lang.code)
                          ? config.languages.filter(l => l !== lang.code)
                          : [...config.languages, lang.code];
                        setConfig({ ...config, languages: langs.length ? langs : [lang.code] });
                      }}
                      className={`px-4 py-2 rounded-full border-2 text-sm transition-all ${
                        config.languages.includes(lang.code)
                          ? 'border-saffron bg-saffron text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {lang.native}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-earth">Auto-detect language</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Start in English, then automatically switch to whatever language the respondent speaks
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoDetectLanguage}
                    onChange={(e) => setConfig({ ...config, autoDetectLanguage: e.target.checked })}
                    className="w-5 h-5 accent-saffron"
                  />
                </label>
                {config.autoDetectLanguage && (
                  <div className="mt-3 p-3 bg-saffron/5 border border-saffron/20 rounded-lg text-xs text-earth/70">
                    The AI will greet in English and detect the respondent's language from their first reply.
                    Supports: Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, English.
                  </div>
                )}
              </div>

              {config.type === 'market' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                  <label className="block text-sm font-medium text-earth mb-2">Brand Names (comma-separated)</label>
                  <input
                    type="text"
                    value={config.brandNames}
                    onChange={(e) => setConfig({ ...config, brandNames: e.target.value })}
                    placeholder="e.g., Tata, Reliance, Adani, Mahindra"
                    className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20"
                  />
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!config.name || !config.type}
                className="w-full py-4 bg-saffron text-white rounded-xl font-medium hover:bg-saffron-deep disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Audience →
              </button>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-earth mb-2">Define your audience</h2>
                <p className="text-gray-600">Who should we survey?</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-4">Geographic Scope</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {GEOGRAPHIES.map((geo) => (
                    <button
                      key={geo.id}
                      onClick={() => setConfig({ ...config, geography: geo.id, states: [] })}
                      className={`p-3 rounded-xl border-2 text-sm transition-all ${
                        config.geography === geo.id ? 'border-saffron bg-saffron/5 font-medium' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {geo.name}
                    </button>
                  ))}
                </div>

                {['state', 'district', 'constituency'].includes(config.geography) && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Select State(s)</label>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                      {INDIAN_STATES.map(state => (
                        <button
                          key={state}
                          onClick={() => {
                            const states = config.states.includes(state)
                              ? config.states.filter(s => s !== state)
                              : [...config.states, state];
                            setConfig({ ...config, states });
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            config.states.includes(state)
                              ? 'bg-saffron text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Target Sample Size</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={config.sampleSize}
                    onChange={(e) => setConfig({ ...config, sampleSize: parseInt(e.target.value) })}
                    className="flex-1 accent-saffron"
                  />
                  <input
                    type="number"
                    value={config.sampleSize}
                    onChange={(e) => setConfig({ ...config, sampleSize: Math.max(100, parseInt(e.target.value) || 100) })}
                    className="w-24 px-3 py-2 border rounded-lg text-center font-medium"
                  />
                </div>
                <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm">
                  <strong>Margin of Error:</strong> ±{marginOfError}% at 95% confidence
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Target Audience Description</label>
                <textarea
                  value={config.targetAudience}
                  onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                  placeholder="e.g., Registered voters in rural Maharashtra, aged 25-55, primarily farmers..."
                  rows={3}
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Exclusion Criteria (Optional)</label>
                <textarea
                  value={config.exclusions}
                  onChange={(e) => setConfig({ ...config, exclusions: e.target.value })}
                  placeholder="e.g., Exclude anyone who has participated in a survey in the last 30 days, employees of political parties..."
                  rows={2}
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-cream-warm">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-saffron text-white rounded-xl font-medium hover:bg-saffron-deep">
                  Continue to Timeline →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Timeline & Budget (NEW) */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-earth mb-2">Timeline & Budget</h2>
                <p className="text-gray-600">When do you need results and what's your budget?</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-4">Urgency</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'standard', name: 'Standard', time: '5-7 days', price: '₹38/response', icon: '·' },
                    { id: 'express', name: 'Express', time: '2-3 days', price: '\u20B945/response', icon: '\u00BB' },
                    { id: 'urgent', name: 'Urgent', time: '24-48 hours', price: '\u20B955/response', icon: '!' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setConfig({ ...config, urgency: opt.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        config.urgency === opt.id ? 'border-saffron bg-saffron/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium block mb-1">{opt.name}</span>
                      <span className="text-sm text-gray-500 block">{opt.time}</span>
                      <span className="text-xs text-saffron">{opt.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Deadline (Optional)</label>
                <input
                  type="date"
                  value={config.deadline}
                  onChange={(e) => setConfig({ ...config, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Budget (Optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹</span>
                  <input
                    type="number"
                    value={config.budget}
                    onChange={(e) => setConfig({ ...config, budget: e.target.value })}
                    placeholder="e.g., 50000"
                    className="flex-1 px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Estimated: ₹{estimatedCost.toLocaleString()} for {config.sampleSize.toLocaleString()} responses
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-4">Call Timing Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'morning', label: 'AM Morning (8am-12pm)' },
                    { id: 'afternoon', label: 'PM Afternoon (12pm-5pm)' },
                    { id: 'evening', label: 'EVE Evening (5pm-9pm)' },
                  ].map(time => (
                    <button
                      key={time.id}
                      onClick={() => {
                        const times = config.callTiming.includes(time.id)
                          ? config.callTiming.filter(t => t !== time.id)
                          : [...config.callTiming, time.id];
                        setConfig({ ...config, callTiming: times.length ? times : [time.id] });
                      }}
                      className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                        config.callTiming.includes(time.id)
                          ? 'border-saffron bg-saffron text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Retry Policy</label>
                <p className="text-sm text-gray-500 mb-3">How many times should we retry non-responders?</p>
                <div className="flex items-center gap-4">
                  {[1, 2, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setConfig({ ...config, retryPolicy: n })}
                      className={`w-12 h-12 rounded-lg border-2 font-medium transition-all ${
                        config.retryPolicy === n
                          ? 'border-saffron bg-saffron text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Incentive for Respondents (Optional)</label>
                <input
                  type="text"
                  value={config.incentive}
                  onChange={(e) => setConfig({ ...config, incentive: e.target.value })}
                  placeholder="e.g., ₹50 mobile recharge, lottery entry..."
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-cream-warm">
                  ← Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-4 bg-saffron text-white rounded-xl font-medium hover:bg-saffron-deep">
                  Continue to Goals →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-earth mb-2">Research Goals</h2>
                <p className="text-gray-600">What do you want to learn? Better input = better questions.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Primary Purpose / Research Objective *</label>
                <p className="text-sm text-gray-500 mb-3">What decision will this survey inform?</p>
                <textarea
                  value={config.purpose}
                  onChange={(e) => setConfig({ ...config, purpose: e.target.value })}
                  placeholder="e.g., Understand voter sentiment before the 2025 Bihar elections, measure satisfaction with incumbent government, identify key issues driving vote choice..."
                  rows={4}
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Key Questions You Want Answered</label>
                <textarea
                  value={config.keyQuestions}
                  onChange={(e) => setConfig({ ...config, keyQuestions: e.target.value })}
                  placeholder={"1. Which party is leading in vote share?\n2. What are the top 3 issues for voters?\n3. How does the youth vote differ from older voters?\n4. Is there an urban-rural divide?"}
                  rows={5}
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20 resize-none font-mono text-sm"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-4">Survey Settings</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Target Duration</label>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map(d => (
                        <button
                          key={d}
                          onClick={() => setConfig({ ...config, duration: d })}
                          className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                            config.duration === d ? 'border-saffron bg-saffron text-white' : 'border-gray-200'
                          }`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {config.duration <= 10 ? '\u2713 Optimal for voice' : '! May reduce completion'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Voice Tone</label>
                    <div className="flex gap-2">
                      {['formal', 'conversational', 'friendly'].map(t => (
                        <button
                          key={t}
                          onClick={() => setConfig({ ...config, tone: t })}
                          className={`flex-1 py-2 rounded-lg border-2 capitalize transition-all ${
                            config.tone === t ? 'border-saffron bg-saffron text-white' : 'border-gray-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Topic Sensitivity</label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high'].map(s => (
                        <button
                          key={s}
                          onClick={() => setConfig({ ...config, sensitivity: s })}
                          className={`flex-1 py-2 rounded-lg border-2 capitalize transition-all ${
                            config.sensitivity === s ? 'border-saffron bg-saffron text-white' : 'border-gray-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Analysis Goals (Optional)</label>
                <textarea
                  value={config.analysisGoals}
                  onChange={(e) => setConfig({ ...config, analysisGoals: e.target.value })}
                  placeholder="e.g., Compare by age, urban vs rural, caste breakdown. Track against 2020 poll..."
                  rows={3}
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-warm">
                <label className="block text-sm font-medium text-earth mb-2">Link to Previous Survey (Optional)</label>
                <input
                  type="url"
                  value={config.previousSurveyLink}
                  onChange={(e) => setConfig({ ...config, previousSurveyLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-cream-warm rounded-xl focus:outline-none focus:ring-2 focus:ring-saffron/20"
                />
                <p className="text-xs text-gray-500 mt-2">For trend tracking, we'll use the same question wording</p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-cream-warm">
                  ← Back
                </button>
                <button
                  onClick={generateQuestions}
                  disabled={!config.purpose || isGenerating}
                  className="flex-1 py-4 bg-gradient-to-r from-saffron to-saffron-deep text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating Questions...
                    </>
                  ) : (
                    <>+ Generate Questions with AI</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Questions */}
          {step === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-earth mb-2">Edit Questions</h2>
                  <p className="text-gray-600">Reorder, edit, or add new questions.</p>
                </div>
                <button
                  onClick={addQuestion}
                  className="px-4 py-2 bg-saffron text-white rounded-lg hover:bg-saffron-deep flex items-center gap-2"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className={`bg-white rounded-xl border-2 transition-all ${
                      editingQuestion === q.id ? 'border-saffron shadow-lg' : 'border-gray-100 hover:border-gray-200'
                    } ${q.isDemographic ? 'opacity-60' : ''}`}
                  >
                    <div
                      className="p-4 flex items-start gap-3 cursor-pointer"
                      onClick={() => setEditingQuestion(editingQuestion === q.id ? null : q.id)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, -1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400" disabled={i === 0}>↑</button>
                        <span className="w-7 h-7 rounded-lg bg-saffron/10 flex items-center justify-center text-saffron font-medium text-sm">{i + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, 1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400" disabled={i === questions.length - 1}>↓</button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {QUESTION_TYPES.find(t => t.id === q.type)?.name}
                          </span>
                          <span className="px-2 py-0.5 bg-saffron/10 rounded text-xs text-saffron">{q.category}</span>
                          {q.required && <span className="text-red-500 text-xs">Required</span>}
                        </div>
                        <p className="font-medium text-earth truncate">{config.languages[0] === 'en' ? (q.textEn || q.text) : q.text || 'Untitled'}</p>
                        {q.textEn && config.languages[0] !== 'en' && <p className="text-sm text-gray-500 truncate">{q.textEn}</p>}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                    {editingQuestion === q.id && (
                      <div className="px-4 pb-4 border-t pt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                          <div className="flex flex-wrap gap-2">
                            {QUESTION_TYPES.map(type => (
                              <button
                                key={type.id}
                                onClick={() => updateQuestion(q.id, { type: type.id })}
                                className={`px-3 py-1.5 rounded-lg border text-sm ${
                                  q.type === type.id ? 'border-saffron bg-saffron text-white' : 'border-gray-200'
                                }`}
                              >
                                {type.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Question (Primary)</label>
                            <textarea
                              value={q.text}
                              onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-saffron"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">English</label>
                            <textarea
                              value={q.textEn}
                              onChange={(e) => updateQuestion(q.id, { textEn: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-saffron"
                            />
                          </div>
                        </div>

                        {['single', 'multiple', 'likert'].includes(q.type) && q.options && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Options</label>
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <span className="w-6 text-center text-gray-400">{q.type === 'multiple' ? '\u2610' : '\u25CB'}</span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...q.options];
                                      newOpts[oi] = e.target.value;
                                      updateQuestion(q.id, { options: newOpts });
                                    }}
                                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                                  />
                                  <button
                                    onClick={() => updateQuestion(q.id, { options: q.options.filter((_, i) => i !== oi) })}
                                    className="p-1 text-red-400 hover:text-red-600"
                                  >×</button>
                                </div>
                              ))}
                              <button
                                onClick={() => updateQuestion(q.id, { options: [...q.options, `Option ${q.options.length + 1}`] })}
                                className="text-sm text-saffron hover:underline"
                              >
                                + Add option
                              </button>
                            </div>
                          </div>
                        )}

                        {q.type === 'free_text' && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Answer Categories (optional)</label>
                            <p className="text-xs text-gray-400 mb-2">
                              Define expected categories so responses are automatically bucketed. Leave empty for open-ended answers.
                            </p>
                            <div className="space-y-2">
                              {(q.options || []).map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <span className="w-6 text-center text-gray-400 text-xs">#{oi + 1}</span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])];
                                      newOpts[oi] = e.target.value;
                                      updateQuestion(q.id, { options: newOpts });
                                    }}
                                    placeholder="e.g. Infrastructure, Healthcare..."
                                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                                  />
                                  <button
                                    onClick={() => updateQuestion(q.id, { options: (q.options || []).filter((_, i) => i !== oi) })}
                                    className="p-1 text-red-400 hover:text-red-600"
                                  >×</button>
                                </div>
                              ))}
                              <button
                                onClick={() => updateQuestion(q.id, { options: [...(q.options || []), ''] })}
                                className="text-sm text-saffron hover:underline"
                              >
                                + Add category
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2 border-t">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                              className="w-4 h-4 accent-saffron"
                            />
                            <span className="text-sm">Required</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Test Call Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-earth">Test Your Survey</h3>
                    <p className="text-sm text-gray-500">Receive a real AI call with your custom questions</p>
                  </div>
                  <button
                    onClick={() => setShowTestCall(!showTestCall)}
                    className="px-4 py-2 bg-saffron/10 text-saffron rounded-lg text-sm font-medium hover:bg-saffron/20"
                  >
                    {showTestCall ? 'Hide' : 'Test Call'}
                  </button>
                </div>

                {showTestCall && (
                  <div className="space-y-4 pt-4 border-t mt-4">
                    <div className="flex gap-3">
                      <input
                        type="tel"
                        value={testPhoneNumber}
                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-saffron/20 focus:border-saffron"
                        disabled={testCallStatus === 'calling' || testCallStatus === 'ringing' || testCallStatus === 'connected'}
                      />
                      <button
                        onClick={initiateTestCall}
                        disabled={!testPhoneNumber.trim() || testCallStatus === 'calling' || testCallStatus === 'ringing' || testCallStatus === 'connected'}
                        className={`px-6 py-3 rounded-xl text-sm font-medium whitespace-nowrap ${
                          testCallStatus === 'calling' || testCallStatus === 'ringing' || testCallStatus === 'connected'
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-saffron text-white hover:bg-saffron-deep'
                        }`}
                      >
                        {testCallStatus === 'calling' ? 'Initiating...'
                          : testCallStatus === 'ringing' ? 'Ringing...'
                          : testCallStatus === 'connected' ? 'In Progress...'
                          : 'Call Me'}
                      </button>
                    </div>

                    {testCallStatus === 'ringing' && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                        <span className="animate-pulse">{'\u25CF'}</span> Ringing your phone...
                      </div>
                    )}
                    {testCallStatus === 'connected' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                        <span className="animate-pulse">{'\u25CF'}</span> Survey in progress, answer the call!
                      </div>
                    )}
                    {testCallStatus === 'completed' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg font-medium">
                          {'\u2713'} Test call completed!
                          {testCallResult?.connectedAt && testCallResult?.endedAt && (
                            <span className="text-green-600 ml-1 font-normal">
                              ({Math.round((new Date(testCallResult.endedAt) - new Date(testCallResult.connectedAt)) / 1000)}s)
                            </span>
                          )}
                        </div>

                        {testCallResult && (
                          <div className="space-y-4">
                            {/* AI Summary */}
                            {testCallResult.extractedData?.summary && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700 italic">
                                "{testCallResult.extractedData.summary}"
                              </div>
                            )}

                            {/* Transcript */}
                            {Array.isArray(testCallResult.transcript) && testCallResult.transcript.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-earth mb-2">Conversation Transcript</h4>
                                <div className="bg-cream-warm rounded-xl p-3 space-y-2 max-h-72 overflow-y-auto">
                                  {testCallResult.transcript.map((msg, i) => (
                                    <div key={i} className={`flex ${msg?.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                                        msg?.role === 'assistant'
                                          ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                                          : 'bg-saffron text-white rounded-br-md'
                                      }`}>
                                        <div className="text-[9px] uppercase tracking-wider mb-0.5 opacity-60">
                                          {msg?.role === 'assistant' ? 'AI' : 'You'}
                                        </div>
                                        {msg?.content || ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Extracted Data */}
                            {testCallResult.extractedData && typeof testCallResult.extractedData === 'object' && (
                              <div>
                                <h4 className="text-sm font-semibold text-earth mb-2">Extracted Data</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Responses */}
                                  {(() => {
                                    const responses = testCallResult.extractedData.responses || testCallResult.extractedData.structured;
                                    if (!responses || typeof responses !== 'object') return null;
                                    return (
                                      <div className="bg-white border rounded-xl p-4">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-3 font-medium">Responses</div>
                                        <div className="space-y-3">
                                          {Object.entries(responses).map(([key, value]) => (
                                            <div key={key} className="border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                                              <div className="text-[11px] text-gray-400 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}</div>
                                              <div className="text-sm font-medium text-earth">{value !== null && value !== undefined ? String(value).replace(/_/g, ' ') : <span className="text-gray-300 italic">No response</span>}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Sentiment */}
                                  {(() => {
                                    const sentiment = testCallResult.extractedData.sentiment;
                                    if (!sentiment || typeof sentiment !== 'object') return null;
                                    return (
                                      <div className="bg-white border rounded-xl p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">Sentiment</div>
                                        <div className="space-y-1.5 text-xs">
                                          {Object.entries(sentiment).map(([key, value]) => (
                                            <div key={key} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                              <span className="text-gray-500 capitalize">{key}</span>
                                              <span className={`font-medium px-2 py-0.5 rounded-full text-[10px] ${
                                                value === 'positive' || value === 'high' ? 'bg-green-100 text-green-700' :
                                                value === 'neutral' || value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                              }`}>{value != null ? String(value) : '-'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* Raw JSON fallback if no structured data */}
                            {testCallResult && !testCallResult.extractedData && !testCallResult.transcript && (
                              <div>
                                <h4 className="text-sm font-semibold text-earth mb-2">Call Data</h4>
                                <pre className="bg-cream-warm rounded-xl p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap">
                                  {JSON.stringify(testCallResult, null, 2)}
                                </pre>
                              </div>
                            )}

                            <button
                              onClick={() => { setTestCallStatus(null); setTestCallResult(null); }}
                              className="text-xs text-saffron hover:underline"
                            >
                              Run another test call
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {testCallStatus === 'voicemail' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-lg font-medium">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          {testCallResult?.voicemailLeft
                            ? 'Voicemail detected. Left a message!'
                            : 'Voicemail detected. Could not leave a message.'}
                        </div>
                        <p className="text-xs text-gray-500">
                          The call went to voicemail. In production, the system will automatically retry later.
                        </p>
                        <button
                          onClick={() => { setTestCallStatus(null); setTestCallResult(null); }}
                          className="text-xs text-saffron hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    {testCallStatus === 'error' && (
                      <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                        Error: {testCallError || 'Something went wrong'}
                        <button
                          onClick={() => { setTestCallStatus(null); setTestCallError(null); }}
                          className="ml-2 underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Language: {LANGUAGES.find(l => l.code === config.languages[0])?.english || config.languages[0]} · {questions.length} questions · ~{estimatedDuration} min
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(4)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-cream-warm">
                  ← Back
                </button>
                <button onClick={() => setStep(6)} className="flex-1 py-4 bg-saffron text-white rounded-xl font-medium hover:bg-saffron-deep">
                  Review & Launch →
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="font-display text-2xl font-semibold text-earth mb-2">Review & Launch</h2>
                <p className="text-gray-600">Double-check everything before going live.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-saffron">{questions.length}</div>
                  <div className="text-sm text-gray-500">Questions</div>
                </div>
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-saffron-deep">~{estimatedDuration} min</div>
                  <div className="text-sm text-gray-500">Duration</div>
                </div>
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-earth">{config.sampleSize.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Responses</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold text-earth mb-4">Configuration Summary</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div><span className="text-gray-500">Name:</span> <span className="font-medium">{config.name}</span></div>
                  <div><span className="text-gray-500">Type:</span> <span className="font-medium">{SURVEY_TYPES.find(t => t.id === config.type)?.name}</span></div>
                  <div><span className="text-gray-500">Languages:</span> <span className="font-medium">{config.languages.map(l => LANGUAGES.find(lg => lg.code === l)?.english).join(', ')}</span></div>
                  <div><span className="text-gray-500">Geography:</span> <span className="font-medium">{GEOGRAPHIES.find(g => g.id === config.geography)?.name}</span></div>
                  <div><span className="text-gray-500">Urgency:</span> <span className="font-medium capitalize">{config.urgency}</span></div>
                  <div><span className="text-gray-500">Call Times:</span> <span className="font-medium capitalize">{config.callTiming.join(', ')}</span></div>
                  <div><span className="text-gray-500">Retries:</span> <span className="font-medium">{config.retryPolicy}x</span></div>
                  <div><span className="text-gray-500">Margin of Error:</span> <span className="font-medium">±{marginOfError}%</span></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold text-earth mb-3">Questions ({questions.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 p-2 bg-cream-warm rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-saffron/10 flex items-center justify-center text-xs text-saffron font-medium flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{config.languages[0] === 'en' ? (q.textEn || q.text) : q.text}</p>
                        {q.textEn && config.languages[0] !== 'en' && <p className="text-xs text-gray-400 truncate">{q.textEn}</p>}
                        <p className="text-xs text-gray-400">{q.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-saffron to-saffron-deep rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-white/70">Estimated Total Cost</div>
                    <div className="text-4xl font-bold">₹{estimatedCost.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/70">Delivery</div>
                    <div className="font-semibold">
                      {config.urgency === 'urgent' ? '24-48 hours' : config.urgency === 'express' ? '2-3 days' : '5-7 days'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/60">
                  {config.sampleSize.toLocaleString()} responses × ₹{config.urgency === 'urgent' ? 55 : config.urgency === 'express' ? 45 : 38}/response
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold text-earth mb-4">Quality Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Record all audio (for quality audit)</span>
                    <input
                      type="checkbox"
                      checked={config.recordAudio}
                      onChange={(e) => setConfig({ ...config, recordAudio: e.target.checked })}
                      className="w-5 h-5 accent-saffron"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Include attention checks</span>
                    <input
                      type="checkbox"
                      checked={config.qualityChecks}
                      onChange={(e) => setConfig({ ...config, qualityChecks: e.target.checked })}
                      className="w-5 h-5 accent-saffron"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(5)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-cream-warm">
                  ← Edit Questions
                </button>
                <button
                  onClick={() => onLaunch && onLaunch(config, questions)}
                  className="flex-1 py-4 bg-gradient-to-r from-saffron to-saffron-deep text-white rounded-xl font-medium hover:opacity-90"
                >
                  → Launch Survey
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Voice Preview Modal */}
      {showVoicePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-saffron to-saffron-deep text-white">
              <div>
                <h3 className="font-semibold">Voice Preview</h3>
                <p className="text-xs text-white/70">Test how your survey sounds</p>
              </div>
              <button onClick={() => { setShowVoicePreview(false); if (audioPreviewRef.current) audioPreviewRef.current.pause(); }} className="p-2 hover:bg-white/20 rounded-lg">\u2715</button>
            </div>

            <div className="p-4 border-b bg-cream-warm">
              {/* Voice Selection */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 whitespace-nowrap">Voice:</label>
                <select
                  value={selectedPreviewVoice}
                  onChange={(e) => setSelectedPreviewVoice(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-saffron focus:border-transparent"
                >
                  {PREVIEW_VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Test Custom Text */}
              <div className="bg-gradient-to-r from-saffron/10 to-saffron-deep/10 rounded-xl p-4 border border-saffron/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-earth"><svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>Try Custom Text</span>
                  <button
                    onClick={() => setShowCustomQuestionInput(!showCustomQuestionInput)}
                    className="text-xs text-saffron hover:underline"
                  >
                    {showCustomQuestionInput ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showCustomQuestionInput && (
                  <div className="space-y-2 mt-3">
                    <textarea
                      value={customTestText}
                      onChange={(e) => setCustomTestText(e.target.value)}
                      placeholder="Type any text in Hindi, Bengali, or English to hear it spoken..."
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-saffron focus:border-transparent"
                    />
                    <button
                      onClick={() => customTestText.trim() && playVoice(customTestText, 'custom')}
                      disabled={!customTestText.trim()}
                      className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        customTestText.trim()
                          ? 'bg-saffron text-white hover:bg-saffron-deep'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isPlayingVoice && playingQuestionId === 'custom' ? (
                        <><span className="inline-block w-3 h-3 bg-current mr-1" /> Stop</>
                      ) : (
                        <><svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" /></svg>Play Custom Text</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Introduction */}
              <div className="bg-cream-warm rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Intro</span>
                  <button
                    onClick={() => playVoice('\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 VoxBharat \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u0940 \u0939\u0942\u0902\u0964 \u0915\u094D\u092F\u093E \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u0941\u091B \u092E\u093F\u0928\u091F \u0939\u0948\u0902 \u090F\u0915 \u0938\u0930\u094D\u0935\u0947 \u0915\u0947 \u0932\u093F\u090F?', 'intro')}
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'intro' ? 'bg-red-100 text-red-600' : 'text-saffron hover:bg-saffron/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'intro' ? '\u25A0 Stop' : '\u266A Play'}
                  </button>
                </div>
                <p className="text-sm font-medium">{'\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 VoxBharat \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u0940 \u0939\u0942\u0902\u0964 \u0915\u094D\u092F\u093E \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u0941\u091B \u092E\u093F\u0928\u091F \u0939\u0948\u0902 \u090F\u0915 \u0938\u0930\u094D\u0935\u0947 \u0915\u0947 \u0932\u093F\u090F?'}</p>
                <p className="text-xs text-gray-500 mt-1">Hello! I'm calling from VoxBharat. Do you have a few minutes for a survey?</p>
              </div>

              {/* Survey Questions */}
              {questions.length > 0 ? (
                <>
                  {questions.map((q, i) => (
                    <div key={q.id} className="bg-cream-warm rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-saffron/10 text-saffron px-2 py-0.5 rounded">Q{i + 1}</span>
                          <span className="text-xs text-gray-400">{q.category}</span>
                        </div>
                        <button
                          onClick={() => playVoice(config.languages[0] === 'en' ? (q.textEn || q.text) : q.text, q.id)}
                          className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === q.id ? 'bg-red-100 text-red-600' : 'text-saffron hover:bg-saffron/10'}`}
                        >
                          {isPlayingVoice && playingQuestionId === q.id ? '\u25A0 Stop' : '\u266A Play'}
                        </button>
                      </div>
                      <p className="text-sm font-medium">{config.languages[0] === 'en' ? (q.textEn || q.text) : q.text}</p>
                      {q.textEn && config.languages[0] !== 'en' && <p className="text-xs text-gray-500 mt-1">{q.textEn}</p>}
                      {q.options && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {q.options.slice(0, 4).map((opt, j) => (
                            <span key={j} className="text-xs bg-white px-2 py-0.5 rounded border">{opt}</span>
                          ))}
                          {q.options.length > 4 && <span className="text-xs text-gray-400">+{q.options.length - 4} more</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No questions yet</p>
                  <p className="text-sm">Complete the survey setup to generate questions</p>
                </div>
              )}

              {/* Closing */}
              <div className="bg-cream-warm rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Closing</span>
                  <button
                    onClick={() => playVoice('\u0906\u092A\u0915\u093E \u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u0905\u092A\u0928\u093E \u0915\u0940\u092E\u0924\u0940 \u0938\u092E\u092F \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F\u0964 \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B!', 'closing')}
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'closing' ? 'bg-red-100 text-red-600' : 'text-saffron hover:bg-saffron/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'closing' ? '\u25A0 Stop' : '\u266A Play'}
                  </button>
                </div>
                <p className="text-sm font-medium">{'\u0906\u092A\u0915\u093E \u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u0905\u092A\u0928\u093E \u0915\u0940\u092E\u0924\u0940 \u0938\u092E\u092F \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F\u0964 \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B!'}</p>
                <p className="text-xs text-gray-500 mt-1">Thank you so much for your valuable time. Have a great day!</p>
              </div>
            </div>

            {/* Play All Button */}
            <div className="p-4 border-t bg-cream-warm">
              <button
                onClick={async () => {
                  const allTexts = [
                    '\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 VoxBharat \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u0940 \u0939\u0942\u0902\u0964 \u0915\u094D\u092F\u093E \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u0941\u091B \u092E\u093F\u0928\u091F \u0939\u0948\u0902 \u090F\u0915 \u0938\u0930\u094D\u0935\u0947 \u0915\u0947 \u0932\u093F\u090F?',
                    ...questions.slice(0, 3).map(q => q.text),
                    '\u0906\u092A\u0915\u093E \u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u0905\u092A\u0928\u093E \u0915\u0940\u092E\u0924\u0940 \u0938\u092E\u092F \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F\u0964'
                  ];
                  for (const text of allTexts) {
                    await playVoice(text, 'all');
                    await new Promise(r => setTimeout(r, 500));
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-saffron to-saffron-deep text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2"
              >
                \u25B6 Play Full Preview
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Plays intro + first 3 questions + closing
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default FullSurveyBuilder;
