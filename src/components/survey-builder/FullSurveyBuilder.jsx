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
  const [testCallStatus, setTestCallStatus] = useState(null); // null | 'calling' | 'ringing' | 'connected' | 'completed' | 'error'
  const [testCallError, setTestCallError] = useState(null);
  const [testCallResult, setTestCallResult] = useState(null);
  const testCallPollRef = useRef(null);
  const audioPreviewRef = useRef(null);

  const PREVIEW_VOICES = [
    { id: '95d51f79-c397-46f9-b49a-23763d3eaa2d', name: 'Hindi Female', lang: 'hi' },
    { id: '7e8cb11d-37af-476b-ab8f-25da99b18644', name: 'Hindi Male', lang: 'hi' },
    { id: '59ba7dee-8f9a-432f-a6c0-ffb33666b654', name: 'Bengali Female', lang: 'bn' },
    { id: '2ba861ea-7cdc-43d1-8608-4045b5a41de5', name: 'Bengali Male', lang: 'bn' },
  ];

  const CARTESIA_API_KEY = 'sk_car_Hamdih147oPiXJqLhbNs9w';

  // Play text using Cartesia TTS
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
      const resp = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CARTESIA_API_KEY}`,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-3',
          transcript: text,
          voice: { mode: 'id', id: selectedPreviewVoice },
          language: voice?.lang || 'hi',
          output_format: { container: 'wav', encoding: 'pcm_f32le', sample_rate: 44100 },
        }),
      });

      if (resp.ok) {
        const blob = await resp.blob();
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
      } else {
        throw new Error('API error');
      }
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

  // Generate questions based on config (mock - would use Claude API)
  const generateQuestions = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));

    let generated = [];

    if (config.type === 'political') {
      generated = [
        { id: 1, type: 'open', text: '\u0906\u092A\u0915\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u0938\u092C\u0938\u0947 \u092C\u0921\u093C\u0940 \u0938\u092E\u0938\u094D\u092F\u093E \u0915\u094D\u092F\u093E \u0939\u0948?', textEn: 'What is the biggest problem in your area?', required: true, category: 'Issues' },
        { id: 2, type: 'single', text: '\u0905\u0917\u0930 \u0906\u091C \u091A\u0941\u0928\u093E\u0935 \u0939\u094B\u0902, \u0924\u094B \u0906\u092A \u0915\u093F\u0938 \u092A\u093E\u0930\u094D\u091F\u0940 \u0915\u094B \u0935\u094B\u091F \u0926\u0947\u0902\u0917\u0947?', textEn: 'If elections were held today, which party would you vote for?', options: ['BJP', 'Congress', 'AAP', 'Regional Party', 'Other', 'Won\'t vote', 'Can\'t say'], required: true, category: 'Vote Intent' },
        { id: 3, type: 'likert', text: '\u0906\u092A \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u0930\u0915\u093E\u0930 \u0915\u0947 \u0915\u093E\u092E \u0938\u0947 \u0915\u093F\u0924\u0928\u0947 \u0938\u0902\u0924\u0941\u0937\u094D\u091F \u0939\u0948\u0902?', textEn: 'How satisfied are you with the current government\'s work?', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], required: true, category: 'Satisfaction' },
        { id: 4, type: 'single', text: '\u0915\u094D\u092F\u093E \u0906\u092A\u0915\u094B \u0932\u0917\u0924\u093E \u0939\u0948 \u0915\u093F \u0926\u0947\u0936 \u0938\u0939\u0940 \u0926\u093F\u0936\u093E \u092E\u0947\u0902 \u091C\u093E \u0930\u0939\u093E \u0939\u0948?', textEn: 'Do you think the country is going in the right direction?', options: ['Right direction', 'Wrong direction', 'Can\'t say'], required: true, category: 'Direction' },
        { id: 5, type: 'rating', text: '\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0902\u0924\u094D\u0930\u0940 \u0915\u0947 \u0915\u093E\u092E \u0915\u094B 1 \u0938\u0947 10 \u092E\u0947\u0902 \u0915\u093F\u0924\u0928\u0947 \u0905\u0902\u0915 \u0926\u0947\u0902\u0917\u0947?', textEn: 'Rate the Prime Minister\'s work from 1-10', min: 1, max: 10, required: true, category: 'Leader Rating' },
      ];
    } else if (config.type === 'customer') {
      generated = [
        { id: 1, type: 'nps', text: '\u0906\u092A \u0939\u092E\u0947\u0902 \u0905\u092A\u0928\u0947 \u0926\u094B\u0938\u094D\u0924\u094B\u0902 \u0915\u094B \u0915\u093F\u0924\u0928\u093E recommend \u0915\u0930\u0947\u0902\u0917\u0947?', textEn: 'How likely are you to recommend us?', min: 0, max: 10, required: true, category: 'NPS' },
        { id: 2, type: 'likert', text: '\u0906\u092A \u0939\u092E\u093E\u0930\u0940 \u0938\u0947\u0935\u093E \u0938\u0947 \u0915\u093F\u0924\u0928\u0947 \u0938\u0902\u0924\u0941\u0937\u094D\u091F \u0939\u0948\u0902?', textEn: 'How satisfied are you with our service?', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], required: true, category: 'CSAT' },
        { id: 3, type: 'open', text: '\u0939\u092E \u0905\u092A\u0928\u0940 \u0938\u0947\u0935\u093E \u0915\u0948\u0938\u0947 \u092C\u0947\u0939\u0924\u0930 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902?', textEn: 'How can we improve?', required: false, category: 'Feedback' },
      ];
    } else if (config.type === 'market') {
      const brands = config.brandNames ? config.brandNames.split(',').map(b => b.trim()) : ['Brand A', 'Brand B', 'Brand C'];
      generated = [
        { id: 1, type: 'multiple', text: '\u0906\u092A \u0915\u094C\u0928 \u0938\u0947 brands \u091C\u093E\u0928\u0924\u0947 \u0939\u0948\u0902?', textEn: 'Which brands are you aware of?', options: [...brands, 'None'], required: true, category: 'Awareness' },
        { id: 2, type: 'single', text: '\u092A\u093F\u091B\u0932\u0947 3 \u092E\u0939\u0940\u0928\u0947 \u092E\u0947\u0902 \u0906\u092A\u0928\u0947 \u0915\u094C\u0928 \u0938\u093E brand \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u093F\u092F\u093E?', textEn: 'Which brand did you use in the last 3 months?', options: [...brands, 'None', 'Don\'t remember'], required: true, category: 'Usage' },
        { id: 3, type: 'likert', text: '\u0907\u0938 product \u0915\u094B \u0916\u0930\u0940\u0926\u0928\u0947 \u0915\u0940 \u0915\u093F\u0924\u0928\u0940 \u0938\u0902\u092D\u093E\u0935\u0928\u093E \u0939\u0948?', textEn: 'How likely are you to purchase?', options: ['Very Unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very Likely'], required: true, category: 'Purchase Intent' },
      ];
    } else {
      generated = [
        { id: 1, type: 'open', text: '\u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u092B\u0940\u0921\u092C\u0948\u0915 \u0938\u093E\u091D\u093E \u0915\u0930\u0947\u0902', textEn: 'Please share your feedback', required: true, category: 'General' },
      ];
    }

    // Add demographics at end
    generated.push(
      { id: generated.length + 1, type: 'single', text: '\u0906\u092A\u0915\u0940 \u0909\u092E\u094D\u0930 \u0915\u094D\u092F\u093E \u0939\u0948?', textEn: 'What is your age?', options: ['18-25', '26-35', '36-45', '46-55', '55+'], required: true, category: 'Demographics', isDemographic: true },
      { id: generated.length + 2, type: 'single', text: '\u0906\u092A\u0915\u093E \u0932\u093F\u0902\u0917 \u0915\u094D\u092F\u093E \u0939\u0948?', textEn: 'What is your gender?', options: ['Male', 'Female', 'Other', 'Prefer not to say'], required: true, category: 'Demographics', isDemographic: true }
    );

    setQuestions(generated);
    setIsGenerating(false);
    setStep(5);
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

  const initiateTestCall = async () => {
    if (!testPhoneNumber.trim()) return;
    setTestCallStatus('calling');
    setTestCallError(null);
    setTestCallResult(null);

    try {
      const response = await fetch('http://localhost:3002/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhoneNumber.trim(),
          language: config.languages[0] || 'hi',
          gender: 'female',
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
          const res = await fetch(`http://localhost:3002/call/${data.callId}`);
          const callData = await res.json();
          if (callData.status === 'in-progress' || callData.status === 'surveying') {
            setTestCallStatus('connected');
          } else if (['completed', 'saved'].includes(callData.status)) {
            setTestCallStatus('completed');
            setTestCallResult(callData);
            clearInterval(testCallPollRef.current);
          } else if (callData.status === 'failed') {
            setTestCallStatus('error');
            setTestCallError(callData.error || 'Call failed');
            clearInterval(testCallPollRef.current);
          }
        } catch { /* ignore poll errors */ }
      }, 2000);

      // Stop polling after 10 minutes
      setTimeout(() => { if (testCallPollRef.current) clearInterval(testCallPollRef.current); }, 10 * 60 * 1000);
    } catch (err) {
      setTestCallStatus('error');
      setTestCallError(err.message);
    }
  };

  const estimatedDuration = Math.ceil(questions.length * 0.75);
  const estimatedCost = config.sampleSize * (config.urgency === 'urgent' ? 55 : config.urgency === 'express' ? 45 : 38);
  const marginOfError = (1.96 * Math.sqrt(0.5 * 0.5 / config.sampleSize) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-[#faf8f5] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <h1 className="font-semibold text-[#3d2314]">Survey Builder</h1>
            <p className="text-sm text-gray-500">{config.name || 'Untitled Survey'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {questions.length > 0 && (
            <div className="text-sm text-gray-500 mr-4">
              {questions.length} questions • ~{estimatedDuration} min
            </div>
          )}
          <button
            onClick={() => setShowVoicePreview(true)}
            className="px-4 py-2 text-[#e8550f] border border-[#e8550f] rounded-lg hover:bg-[#e8550f]/5"
          >
            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" /></svg> Preview Voice
          </button>
          <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            Save Draft
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b px-6 py-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {['Setup', 'Audience', 'Timeline', 'Goals', 'Questions', 'Review'].map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i + 1 <= step && setStep(i + 1)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === i + 1 ? 'bg-[#e8550f] text-white'
                  : step > i + 1 ? 'bg-[#e8550f]/10 text-[#e8550f] cursor-pointer hover:bg-[#e8550f]/20'
                  : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step > i + 1 ? 'bg-[#e8550f] text-white' : ''}`}>
                  {step > i + 1 ? '\u2713' : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < 5 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-[#e8550f]' : 'bg-gray-200'}`} />}
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
                <h2 className="text-2xl font-semibold text-[#3d2314] mb-2">Let's create your survey</h2>
                <p className="text-gray-600">Start with the basics.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Survey Name *</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="e.g., Bihar Assembly Election Poll 2025"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20 focus:border-[#e8550f]"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-4">Survey Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SURVEY_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setConfig({ ...config, type: type.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        config.type === type.id ? 'border-[#e8550f] bg-[#e8550f]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-[#3d2314] block mb-1">{type.name}</span>
                      <span className="text-xs text-gray-500">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-4">Survey Languages *</label>
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
                          ? 'border-[#e8550f] bg-[#e8550f] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {lang.native}
                    </button>
                  ))}
                </div>
              </div>

              {config.type === 'market' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <label className="block text-sm font-medium text-[#3d2314] mb-2">Brand Names (comma-separated)</label>
                  <input
                    type="text"
                    value={config.brandNames}
                    onChange={(e) => setConfig({ ...config, brandNames: e.target.value })}
                    placeholder="e.g., Tata, Reliance, Adani, Mahindra"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                  />
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!config.name || !config.type}
                className="w-full py-4 bg-[#e8550f] text-white rounded-xl font-medium hover:bg-[#cc4400] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Audience →
              </button>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#3d2314] mb-2">Define your audience</h2>
                <p className="text-gray-600">Who should we survey?</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-4">Geographic Scope</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {GEOGRAPHIES.map((geo) => (
                    <button
                      key={geo.id}
                      onClick={() => setConfig({ ...config, geography: geo.id, states: [] })}
                      className={`p-3 rounded-xl border-2 text-sm transition-all ${
                        config.geography === geo.id ? 'border-[#e8550f] bg-[#e8550f]/5 font-medium' : 'border-gray-200 hover:border-gray-300'
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
                              ? 'bg-[#e8550f] text-white'
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

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Target Sample Size</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={config.sampleSize}
                    onChange={(e) => setConfig({ ...config, sampleSize: parseInt(e.target.value) })}
                    className="flex-1 accent-[#e8550f]"
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

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Target Audience Description</label>
                <textarea
                  value={config.targetAudience}
                  onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                  placeholder="e.g., Registered voters in rural Maharashtra, aged 25-55, primarily farmers..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Exclusion Criteria (Optional)</label>
                <textarea
                  value={config.exclusions}
                  onChange={(e) => setConfig({ ...config, exclusions: e.target.value })}
                  placeholder="e.g., Exclude anyone who has participated in a survey in the last 30 days, employees of political parties..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-[#e8550f] text-white rounded-xl font-medium hover:bg-[#cc4400]">
                  Continue to Timeline →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Timeline & Budget (NEW) */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#3d2314] mb-2">Timeline & Budget</h2>
                <p className="text-gray-600">When do you need results and what's your budget?</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-4">Urgency</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'standard', name: 'Standard', time: '5-7 days', price: '\u20B938/response', icon: '\u2014' },
                    { id: 'express', name: 'Express', time: '2-3 days', price: '\u20B945/response', icon: '\u00BB' },
                    { id: 'urgent', name: 'Urgent', time: '24-48 hours', price: '\u20B955/response', icon: '!' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setConfig({ ...config, urgency: opt.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        config.urgency === opt.id ? 'border-[#e8550f] bg-[#e8550f]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium block mb-1">{opt.name}</span>
                      <span className="text-sm text-gray-500 block">{opt.time}</span>
                      <span className="text-xs text-[#e8550f]">{opt.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Deadline (Optional)</label>
                <input
                  type="date"
                  value={config.deadline}
                  onChange={(e) => setConfig({ ...config, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Budget (Optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">\u20B9</span>
                  <input
                    type="number"
                    value={config.budget}
                    onChange={(e) => setConfig({ ...config, budget: e.target.value })}
                    placeholder="e.g., 50000"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Estimated: \u20B9{estimatedCost.toLocaleString()} for {config.sampleSize.toLocaleString()} responses
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-4">Call Timing Preferences</label>
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
                          ? 'border-[#e8550f] bg-[#e8550f] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Retry Policy</label>
                <p className="text-sm text-gray-500 mb-3">How many times should we retry non-responders?</p>
                <div className="flex items-center gap-4">
                  {[1, 2, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setConfig({ ...config, retryPolicy: n })}
                      className={`w-12 h-12 rounded-lg border-2 font-medium transition-all ${
                        config.retryPolicy === n
                          ? 'border-[#e8550f] bg-[#e8550f] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Incentive for Respondents (Optional)</label>
                <input
                  type="text"
                  value={config.incentive}
                  onChange={(e) => setConfig({ ...config, incentive: e.target.value })}
                  placeholder="e.g., \u20B950 mobile recharge, lottery entry..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-4 bg-[#e8550f] text-white rounded-xl font-medium hover:bg-[#cc4400]">
                  Continue to Goals →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#3d2314] mb-2">Research Goals</h2>
                <p className="text-gray-600">What do you want to learn? Better input = better questions.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Primary Purpose / Research Objective *</label>
                <p className="text-sm text-gray-500 mb-3">What decision will this survey inform?</p>
                <textarea
                  value={config.purpose}
                  onChange={(e) => setConfig({ ...config, purpose: e.target.value })}
                  placeholder="e.g., Understand voter sentiment before the 2025 Bihar elections, measure satisfaction with incumbent government, identify key issues driving vote choice..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Key Questions You Want Answered</label>
                <textarea
                  value={config.keyQuestions}
                  onChange={(e) => setConfig({ ...config, keyQuestions: e.target.value })}
                  placeholder={"1. Which party is leading in vote share?\n2. What are the top 3 issues for voters?\n3. How does the youth vote differ from older voters?\n4. Is there an urban-rural divide?"}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20 resize-none font-mono text-sm"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-4">Survey Settings</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Target Duration</label>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map(d => (
                        <button
                          key={d}
                          onClick={() => setConfig({ ...config, duration: d })}
                          className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                            config.duration === d ? 'border-[#e8550f] bg-[#e8550f] text-white' : 'border-gray-200'
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
                            config.tone === t ? 'border-[#e8550f] bg-[#e8550f] text-white' : 'border-gray-200'
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
                            config.sensitivity === s ? 'border-[#e8550f] bg-[#e8550f] text-white' : 'border-gray-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Analysis Goals (Optional)</label>
                <textarea
                  value={config.analysisGoals}
                  onChange={(e) => setConfig({ ...config, analysisGoals: e.target.value })}
                  placeholder="e.g., Compare by age, urban vs rural, caste breakdown. Track against 2020 poll..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#3d2314] mb-2">Link to Previous Survey (Optional)</label>
                <input
                  type="url"
                  value={config.previousSurveyLink}
                  onChange={(e) => setConfig({ ...config, previousSurveyLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                />
                <p className="text-xs text-gray-500 mt-2">For trend tracking, we'll use the same question wording</p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={generateQuestions}
                  disabled={!config.purpose || isGenerating}
                  className="flex-1 py-4 bg-gradient-to-r from-[#ff6b2c] to-[#e85d04] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
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
                  <h2 className="text-2xl font-semibold text-[#3d2314] mb-2">Edit Questions</h2>
                  <p className="text-gray-600">Reorder, edit, or add new questions.</p>
                </div>
                <button
                  onClick={addQuestion}
                  className="px-4 py-2 bg-[#e8550f] text-white rounded-lg hover:bg-[#cc4400] flex items-center gap-2"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className={`bg-white rounded-xl border-2 transition-all ${
                      editingQuestion === q.id ? 'border-[#e8550f] shadow-lg' : 'border-gray-100 hover:border-gray-200'
                    } ${q.isDemographic ? 'opacity-60' : ''}`}
                  >
                    <div
                      className="p-4 flex items-start gap-3 cursor-pointer"
                      onClick={() => setEditingQuestion(editingQuestion === q.id ? null : q.id)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, -1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400" disabled={i === 0}>↑</button>
                        <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-[#e8550f] font-medium text-sm">{i + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, 1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400" disabled={i === questions.length - 1}>↓</button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {QUESTION_TYPES.find(t => t.id === q.type)?.name}
                          </span>
                          <span className="px-2 py-0.5 bg-[#e8550f]/10 rounded text-xs text-[#e8550f]">{q.category}</span>
                          {q.required && <span className="text-red-500 text-xs">Required</span>}
                        </div>
                        <p className="font-medium text-[#3d2314] truncate">{q.text || 'Untitled'}</p>
                        {q.textEn && <p className="text-sm text-gray-500 truncate">{q.textEn}</p>}
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
                                  q.type === type.id ? 'border-[#e8550f] bg-[#e8550f] text-white' : 'border-gray-200'
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
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#e8550f]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">English</label>
                            <textarea
                              value={q.textEn}
                              onChange={(e) => updateQuestion(q.id, { textEn: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#e8550f]"
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
                                className="text-sm text-[#e8550f] hover:underline"
                              >
                                + Add option
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
                              className="w-4 h-4 accent-[#e8550f]"
                            />
                            <span className="text-sm">Required</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(4)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(6)} className="flex-1 py-4 bg-[#e8550f] text-white rounded-xl font-medium hover:bg-[#cc4400]">
                  Review & Launch →
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#3d2314] mb-2">Review & Launch</h2>
                <p className="text-gray-600">Double-check everything before going live.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-[#e8550f]">{questions.length}</div>
                  <div className="text-sm text-gray-500">Questions</div>
                </div>
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-[#e85d04]">~{estimatedDuration} min</div>
                  <div className="text-sm text-gray-500">Duration</div>
                </div>
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-[#3d2314]">{config.sampleSize.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Responses</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold text-[#3d2314] mb-4">Configuration Summary</h3>
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
                <h3 className="font-semibold text-[#3d2314] mb-3">Questions ({questions.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-[#e8550f]/10 flex items-center justify-center text-xs text-[#e8550f] font-medium flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{q.text}</p>
                        <p className="text-xs text-gray-400">{q.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e8550f] to-[#cc4400] rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-white/70">Estimated Total Cost</div>
                    <div className="text-4xl font-bold">\u20B9{estimatedCost.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/70">Delivery</div>
                    <div className="font-semibold">
                      {config.urgency === 'urgent' ? '24-48 hours' : config.urgency === 'express' ? '2-3 days' : '5-7 days'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/60">
                  {config.sampleSize.toLocaleString()} responses × \u20B9{config.urgency === 'urgent' ? 55 : config.urgency === 'express' ? 45 : 38}/response
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold text-[#3d2314] mb-4">Quality Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Record all audio (for quality audit)</span>
                    <input
                      type="checkbox"
                      checked={config.recordAudio}
                      onChange={(e) => setConfig({ ...config, recordAudio: e.target.checked })}
                      className="w-5 h-5 accent-[#e8550f]"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Include attention checks</span>
                    <input
                      type="checkbox"
                      checked={config.qualityChecks}
                      onChange={(e) => setConfig({ ...config, qualityChecks: e.target.checked })}
                      className="w-5 h-5 accent-[#e8550f]"
                    />
                  </label>
                </div>
              </div>

              {/* Test Call Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-[#3d2314]">Test Your Survey</h3>
                    <p className="text-sm text-gray-500">Receive a real AI call with your custom questions</p>
                  </div>
                  <button
                    onClick={() => setShowTestCall(!showTestCall)}
                    className="px-4 py-2 bg-[#e8550f]/10 text-[#e8550f] rounded-lg text-sm font-medium hover:bg-[#e8550f]/20"
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
                        className="flex-1 px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-[#e8550f]/20 focus:border-[#e8550f]"
                        disabled={testCallStatus === 'calling' || testCallStatus === 'ringing' || testCallStatus === 'connected'}
                      />
                      <button
                        onClick={initiateTestCall}
                        disabled={!testPhoneNumber.trim() || testCallStatus === 'calling' || testCallStatus === 'ringing' || testCallStatus === 'connected'}
                        className={`px-6 py-3 rounded-xl text-sm font-medium whitespace-nowrap ${
                          testCallStatus === 'calling' || testCallStatus === 'ringing' || testCallStatus === 'connected'
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#e8550f] text-white hover:bg-[#cc4400]'
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
                        <span className="animate-pulse">\u25CF</span> Ringing your phone...
                      </div>
                    )}
                    {testCallStatus === 'connected' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                        <span className="animate-pulse">\u25CF</span> Survey in progress — answer the call!
                      </div>
                    )}
                    {testCallStatus === 'completed' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                          \u2713 Test call completed!
                          {testCallResult?.connectedAt && testCallResult?.endedAt && (
                            <span className="text-green-600 ml-1">
                              ({Math.round((new Date(testCallResult.endedAt) - new Date(testCallResult.connectedAt)) / 1000)}s)
                            </span>
                          )}
                        </div>

                        {testCallResult && (
                          <div className="space-y-4">
                            {/* AI Summary */}
                            {testCallResult.extractedData?.summary && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-gray-700 italic">
                                "{testCallResult.extractedData.summary}"
                              </div>
                            )}

                            {/* Transcript */}
                            <div>
                              <h4 className="text-sm font-semibold text-[#3d2314] mb-2">Conversation Transcript</h4>
                              <div className="bg-gray-50 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                                {(testCallResult.transcript || []).map((msg, i) => (
                                  <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                                      msg.role === 'assistant'
                                        ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                                        : 'bg-[#e8550f] text-white rounded-br-md'
                                    }`}>
                                      <div className="text-[9px] uppercase tracking-wider mb-0.5 opacity-60">
                                        {msg.role === 'assistant' ? 'AI' : 'You'}
                                      </div>
                                      {msg.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Extracted Data */}
                            {testCallResult.extractedData && (
                              <div>
                                <h4 className="text-sm font-semibold text-[#3d2314] mb-2">Extracted Data</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Responses */}
                                  <div className="bg-white border rounded-xl p-4">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-3 font-medium">Responses</div>
                                    <div className="space-y-3">
                                      {Object.entries(testCallResult.extractedData.responses || testCallResult.extractedData.structured || {}).map(([key, value]) => (
                                        <div key={key} className="border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                                          <div className="text-[11px] text-gray-400 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}</div>
                                          <div className="text-sm font-medium text-[#3d2314]">{value !== null ? String(value).replace(/_/g, ' ') : <span className="text-gray-300 italic">No response</span>}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Sentiment */}
                                  <div className="bg-white border rounded-xl p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-medium">Sentiment</div>
                                    <div className="space-y-1.5 text-xs">
                                      {Object.entries(testCallResult.extractedData.sentiment || {}).map(([key, value]) => (
                                        <div key={key} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                          <span className="text-gray-500 capitalize">{key}</span>
                                          <span className={`font-medium px-2 py-0.5 rounded-full text-[10px] ${
                                            value === 'positive' || value === 'high' ? 'bg-green-100 text-green-700' :
                                            value === 'neutral' || value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                          }`}>{value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => { setTestCallStatus(null); setTestCallResult(null); }}
                              className="text-xs text-[#e8550f] hover:underline"
                            >
                              Run another test call
                            </button>
                          </div>
                        )}
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
                      Language: {config.languages[0] === 'bn' ? 'Bengali' : 'Hindi'} · {questions.length} questions · ~{estimatedDuration} min
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(5)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Edit Questions
                </button>
                <button
                  onClick={() => onLaunch && onLaunch(config, questions)}
                  className="flex-1 py-4 bg-gradient-to-r from-[#ff6b2c] to-[#e85d04] text-white rounded-xl font-medium hover:opacity-90"
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
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#e8550f] to-[#cc4400] text-white">
              <div>
                <h3 className="font-semibold">Voice Preview</h3>
                <p className="text-xs text-white/70">Test how your survey sounds</p>
              </div>
              <button onClick={() => { setShowVoicePreview(false); if (audioPreviewRef.current) audioPreviewRef.current.pause(); }} className="p-2 hover:bg-white/20 rounded-lg">\u2715</button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              {/* Voice Selection */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 whitespace-nowrap">Voice:</label>
                <select
                  value={selectedPreviewVoice}
                  onChange={(e) => setSelectedPreviewVoice(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#e8550f] focus:border-transparent"
                >
                  {PREVIEW_VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Test Custom Text */}
              <div className="bg-gradient-to-r from-[#ff6b2c]/10 to-[#e85d04]/10 rounded-xl p-4 border border-[#ff6b2c]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#3d2314]"><svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>Try Custom Text</span>
                  <button
                    onClick={() => setShowCustomQuestionInput(!showCustomQuestionInput)}
                    className="text-xs text-[#e8550f] hover:underline"
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
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-[#e8550f] focus:border-transparent"
                    />
                    <button
                      onClick={() => customTestText.trim() && playVoice(customTestText, 'custom')}
                      disabled={!customTestText.trim()}
                      className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        customTestText.trim()
                          ? 'bg-[#e8550f] text-white hover:bg-[#cc4400]'
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
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Intro</span>
                  <button
                    onClick={() => playVoice('\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 VoxBharat \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u0940 \u0939\u0942\u0902\u0964 \u0915\u094D\u092F\u093E \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u0941\u091B \u092E\u093F\u0928\u091F \u0939\u0948\u0902 \u090F\u0915 \u0938\u0930\u094D\u0935\u0947 \u0915\u0947 \u0932\u093F\u090F?', 'intro')}
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'intro' ? 'bg-red-100 text-red-600' : 'text-[#e8550f] hover:bg-[#e8550f]/10'}`}
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
                    <div key={q.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-[#e8550f]/10 text-[#e8550f] px-2 py-0.5 rounded">Q{i + 1}</span>
                          <span className="text-xs text-gray-400">{q.category}</span>
                        </div>
                        <button
                          onClick={() => playVoice(q.text, q.id)}
                          className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === q.id ? 'bg-red-100 text-red-600' : 'text-[#e8550f] hover:bg-[#e8550f]/10'}`}
                        >
                          {isPlayingVoice && playingQuestionId === q.id ? '\u25A0 Stop' : '\u266A Play'}
                        </button>
                      </div>
                      <p className="text-sm font-medium">{q.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{q.textEn}</p>
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
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Closing</span>
                  <button
                    onClick={() => playVoice('\u0906\u092A\u0915\u093E \u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u0905\u092A\u0928\u093E \u0915\u0940\u092E\u0924\u0940 \u0938\u092E\u092F \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F\u0964 \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B!', 'closing')}
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'closing' ? 'bg-red-100 text-red-600' : 'text-[#e8550f] hover:bg-[#e8550f]/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'closing' ? '\u25A0 Stop' : '\u266A Play'}
                  </button>
                </div>
                <p className="text-sm font-medium">{'\u0906\u092A\u0915\u093E \u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u0905\u092A\u0928\u093E \u0915\u0940\u092E\u0924\u0940 \u0938\u092E\u092F \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F\u0964 \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B!'}</p>
                <p className="text-xs text-gray-500 mt-1">Thank you so much for your valuable time. Have a great day!</p>
              </div>
            </div>

            {/* Play All Button */}
            <div className="p-4 border-t bg-gray-50">
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
                className="w-full py-3 bg-gradient-to-r from-[#e8550f] to-[#cc4400] text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2"
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
