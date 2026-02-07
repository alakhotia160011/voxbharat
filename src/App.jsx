import React, { useState, useEffect, useRef } from 'react';

// ============================================
// CONSTANTS & DATA
// ============================================

const LANGUAGES = [
  { code: 'hi', native: 'हिंदी', english: 'Hindi', speakers: '528M' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', speakers: '97M' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', speakers: '83M' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', speakers: '83M' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', speakers: '69M' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati', speakers: '55M' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', speakers: '44M' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam', speakers: '37M' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi', speakers: '33M' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia', speakers: '35M' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese', speakers: '15M' },
  { code: 'ur', native: 'اردو', english: 'Urdu', speakers: '51M' },
];

const SURVEY_TYPES = [
  { id: 'political', name: 'Political Polling', icon: 'P', desc: 'Voting intent, leader approval, issues' },
  { id: 'market', name: 'Market Research', icon: 'M', desc: 'Brand awareness, purchase intent' },
  { id: 'customer', name: 'Customer Feedback', icon: 'C', desc: 'Satisfaction, NPS, service quality' },
  { id: 'employee', name: 'Employee Survey', icon: 'E', desc: 'Engagement, culture, workplace' },
  { id: 'social', name: 'Social Research', icon: 'S', desc: 'Attitudes, behaviors, social issues' },
  { id: 'custom', name: 'Custom Survey', icon: '+', desc: 'Build from scratch' },
];

const QUESTION_TYPES = [
  { id: 'single', name: 'Single Choice', icon: '○' },
  { id: 'multiple', name: 'Multiple Choice', icon: '☐' },
  { id: 'likert', name: 'Likert Scale', icon: '—' },
  { id: 'rating', name: 'Rating (1-10)', icon: '★' },
  { id: 'nps', name: 'NPS (0-10)', icon: '#' },
  { id: 'open', name: 'Open Ended', icon: '...' },
  { id: 'yes_no', name: 'Yes / No', icon: '✓' },
];

const GEOGRAPHIES = [
  { id: 'national', name: 'National (All India)' },
  { id: 'state', name: 'State-level' },
  { id: 'district', name: 'District-level' },
  { id: 'constituency', name: 'Constituency-level' },
  { id: 'urban', name: 'Urban areas only' },
  { id: 'rural', name: 'Rural areas only' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

// ============================================
// SHARED COMPONENTS
// ============================================

const VoiceWave = ({ active, color = '#e8550f' }) => {
  const [heights, setHeights] = useState([4,4,4,4,4,4,4,4]);
  
  useEffect(() => {
    if (!active) {
      setHeights([4,4,4,4,4,4,4,4]);
      return;
    }
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => Math.random() * 20 + 8));
    }, 100);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-10">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-100"
          style={{ backgroundColor: color, height: `${active ? h : 4}px`, opacity: active ? 0.9 : 0.3 }}
        />
      ))}
    </div>
  );
};

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
        { id: 1, type: 'open', text: 'आपके क्षेत्र में सबसे बड़ी समस्या क्या है?', textEn: 'What is the biggest problem in your area?', required: true, category: 'Issues' },
        { id: 2, type: 'single', text: 'अगर आज चुनाव हों, तो आप किस पार्टी को वोट देंगे?', textEn: 'If elections were held today, which party would you vote for?', options: ['BJP', 'Congress', 'AAP', 'Regional Party', 'Other', 'Won\'t vote', 'Can\'t say'], required: true, category: 'Vote Intent' },
        { id: 3, type: 'likert', text: 'आप वर्तमान सरकार के काम से कितने संतुष्ट हैं?', textEn: 'How satisfied are you with the current government\'s work?', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], required: true, category: 'Satisfaction' },
        { id: 4, type: 'single', text: 'क्या आपको लगता है कि देश सही दिशा में जा रहा है?', textEn: 'Do you think the country is going in the right direction?', options: ['Right direction', 'Wrong direction', 'Can\'t say'], required: true, category: 'Direction' },
        { id: 5, type: 'rating', text: 'प्रधानमंत्री के काम को 1 से 10 में कितने अंक देंगे?', textEn: 'Rate the Prime Minister\'s work from 1-10', min: 1, max: 10, required: true, category: 'Leader Rating' },
      ];
    } else if (config.type === 'customer') {
      generated = [
        { id: 1, type: 'nps', text: 'आप हमें अपने दोस्तों को कितना recommend करेंगे?', textEn: 'How likely are you to recommend us?', min: 0, max: 10, required: true, category: 'NPS' },
        { id: 2, type: 'likert', text: 'आप हमारी सेवा से कितने संतुष्ट हैं?', textEn: 'How satisfied are you with our service?', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], required: true, category: 'CSAT' },
        { id: 3, type: 'open', text: 'हम अपनी सेवा कैसे बेहतर कर सकते हैं?', textEn: 'How can we improve?', required: false, category: 'Feedback' },
      ];
    } else if (config.type === 'market') {
      const brands = config.brandNames ? config.brandNames.split(',').map(b => b.trim()) : ['Brand A', 'Brand B', 'Brand C'];
      generated = [
        { id: 1, type: 'multiple', text: 'आप कौन से brands जानते हैं?', textEn: 'Which brands are you aware of?', options: [...brands, 'None'], required: true, category: 'Awareness' },
        { id: 2, type: 'single', text: 'पिछले 3 महीने में आपने कौन सा brand इस्तेमाल किया?', textEn: 'Which brand did you use in the last 3 months?', options: [...brands, 'None', 'Don\'t remember'], required: true, category: 'Usage' },
        { id: 3, type: 'likert', text: 'इस product को खरीदने की कितनी संभावना है?', textEn: 'How likely are you to purchase?', options: ['Very Unlikely', 'Unlikely', 'Neutral', 'Likely', 'Very Likely'], required: true, category: 'Purchase Intent' },
      ];
    } else {
      generated = [
        { id: 1, type: 'open', text: 'कृपया अपना फीडबैक साझा करें', textEn: 'Please share your feedback', required: true, category: 'General' },
      ];
    }
    
    // Add demographics at end
    generated.push(
      { id: generated.length + 1, type: 'single', text: 'आपकी उम्र क्या है?', textEn: 'What is your age?', options: ['18-25', '26-35', '36-45', '46-55', '55+'], required: true, category: 'Demographics', isDemographic: true },
      { id: generated.length + 2, type: 'single', text: 'आपका लिंग क्या है?', textEn: 'What is your gender?', options: ['Male', 'Female', 'Other', 'Prefer not to say'], required: true, category: 'Demographics', isDemographic: true }
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
          } else if (['completed', 'saved', 'extracting'].includes(callData.status)) {
            setTestCallStatus('completed');
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
                  {step > i + 1 ? '✓' : i + 1}
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
                    { id: 'standard', name: 'Standard', time: '5-7 days', price: '₹38/response', icon: '—' },
                    { id: 'express', name: 'Express', time: '2-3 days', price: '₹45/response', icon: '»' },
                    { id: 'urgent', name: 'Urgent', time: '24-48 hours', price: '₹55/response', icon: '!' },
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
                  <span className="text-gray-500">₹</span>
                  <input
                    type="number"
                    value={config.budget}
                    onChange={(e) => setConfig({ ...config, budget: e.target.value })}
                    placeholder="e.g., 50000"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Estimated: ₹{estimatedCost.toLocaleString()} for {config.sampleSize.toLocaleString()} responses
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
                  placeholder="e.g., ₹50 mobile recharge, lottery entry..."
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
                      {config.duration <= 10 ? '✓ Optimal for voice' : '! May reduce completion'}
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
                                  <span className="w-6 text-center text-gray-400">{q.type === 'multiple' ? '☐' : '○'}</span>
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
                        <span className="animate-pulse">●</span> Ringing your phone...
                      </div>
                    )}
                    {testCallStatus === 'connected' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                        <span className="animate-pulse">●</span> Survey in progress — answer the call!
                      </div>
                    )}
                    {testCallStatus === 'completed' && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                        ✓ Test call completed successfully!
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
              <button onClick={() => { setShowVoicePreview(false); if (audioPreviewRef.current) audioPreviewRef.current.pause(); }} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
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
                    onClick={() => playVoice('नमस्ते! मैं VoxBharat से बोल रही हूं। क्या आपके पास कुछ मिनट हैं एक सर्वे के लिए?', 'intro')}
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'intro' ? 'bg-red-100 text-red-600' : 'text-[#e8550f] hover:bg-[#e8550f]/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'intro' ? '\u25A0 Stop' : '\u266A Play'}
                  </button>
                </div>
                <p className="text-sm font-medium">नमस्ते! मैं VoxBharat से बोल रही हूं। क्या आपके पास कुछ मिनट हैं एक सर्वे के लिए?</p>
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
                    onClick={() => playVoice('आपका बहुत-बहुत धन्यवाद अपना कीमती समय देने के लिए। आपका दिन शुभ हो!', 'closing')}
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'closing' ? 'bg-red-100 text-red-600' : 'text-[#e8550f] hover:bg-[#e8550f]/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'closing' ? '\u25A0 Stop' : '\u266A Play'}
                  </button>
                </div>
                <p className="text-sm font-medium">आपका बहुत-बहुत धन्यवाद अपना कीमती समय देने के लिए। आपका दिन शुभ हो!</p>
                <p className="text-xs text-gray-500 mt-1">Thank you so much for your valuable time. Have a great day!</p>
              </div>
            </div>

            {/* Play All Button */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={async () => {
                  const allTexts = [
                    'नमस्ते! मैं VoxBharat से बोल रही हूं। क्या आपके पास कुछ मिनट हैं एक सर्वे के लिए?',
                    ...questions.slice(0, 3).map(q => q.text),
                    'आपका बहुत-बहुत धन्यवाद अपना कीमती समय देने के लिए।'
                  ];
                  for (const text of allTexts) {
                    await playVoice(text, 'all');
                    await new Promise(r => setTimeout(r, 500));
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-[#e8550f] to-[#cc4400] text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2"
              >
                ▶ Play Full Preview
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

// ============================================
// MAIN LANDING PAGE
// ============================================

export default function VoxBharat() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [activeLang, setActiveLang] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [apiKey, setApiKey] = useState('sk_car_Hamdih147oPiXJqLhbNs9w');
  const [showApiModal, setShowApiModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('7e8cb11d-37af-476b-ab8f-25da99b18644');
  const [showTranscript, setShowTranscript] = useState(false);
  const [callComplete, setCallComplete] = useState(false);
  const [surveyResults, setSurveyResults] = useState([]);
  const [showSampleReport, setShowSampleReport] = useState(false);
  const [showSampleCallLog, setShowSampleCallLog] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const audioRef = useRef(null);
  const abortRef = useRef(false);
  const timersRef = useRef([]);

  // Cartesia Indian language voices
  const CARTESIA_VOICES = [
    { id: '95d51f79-c397-46f9-b49a-23763d3eaa2d', name: 'Hindi Female', gender: 'Female', lang: 'hi' },
    { id: '7e8cb11d-37af-476b-ab8f-25da99b18644', name: 'Hindi Male', gender: 'Male', lang: 'hi' },
    { id: '59ba7dee-8f9a-432f-a6c0-ffb33666b654', name: 'Bengali Female', gender: 'Female', lang: 'bn' },
    { id: '2ba861ea-7cdc-43d1-8608-4045b5a41de5', name: 'Bengali Male', gender: 'Male', lang: 'bn' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLang(prev => (prev + 1) % LANGUAGES.length);
    }, 2500);
    return () => {
      clearInterval(interval);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Hindi conversation - Female voice version (रही, गई forms)
  const hindiConversationFemale = [
    { speaker: 'ai', text: 'नमस्ते! मैं VoxBharat से बोल रही हूं। हम भारत में धर्म और सामाजिक जीवन पर एक रिसर्च सर्वे कर रहे हैं। इसमें बस पांच मिनट लगेंगे और आपकी पहचान पूरी तरह गोपनीय रहेगी। क्या आप हिस्सा लेना चाहेंगे?', translation: 'Hello! I\'m calling from VoxBharat. We\'re conducting a research survey on religion and social life in India. It will only take 5 minutes and your identity will remain completely confidential. Would you like to participate?' },
    { speaker: 'user', text: 'हां, ठीक है, बताइए', translation: 'Yes, okay, go ahead' },
    { speaker: 'ai', text: 'बहुत अच्छा, धन्यवाद जी। तो चलिए शुरू करते हैं। सबसे पहले, क्या आप अपनी उम्र बता सकते हैं?', translation: 'Very good, thank you. So let\'s begin. First of all, can you tell me your age?' },
    { speaker: 'user', text: 'जी, मैं 42 साल का हूं', translation: 'Yes, I am 42 years old' },
    { speaker: 'ai', text: 'धन्यवाद जी। और आपका धर्म क्या है?', translation: 'Thank you. And what is your religion?' },
    { speaker: 'user', text: 'जी, मैं हिंदू हूं', translation: 'Yes, I am Hindu' },
    { speaker: 'ai', text: 'अच्छा जी। अब बताइए, आपके जीवन में धर्म कितना महत्वपूर्ण है - बहुत महत्वपूर्ण, कुछ महत्वपूर्ण, या ज़्यादा महत्वपूर्ण नहीं?', translation: 'Okay. Now tell me, how important is religion in your life - very important, somewhat important, or not very important?' },
    { speaker: 'user', text: 'बहुत महत्वपूर्ण है हमारे लिए', translation: 'Very important for us' },
    { speaker: 'ai', text: 'समझ गई। अगला सवाल - आप कितनी बार प्रार्थना या पूजा करते हैं?', translation: 'I understand. Next question - How often do you pray or worship?' },
    { speaker: 'user', text: 'मतलब? समझा नहीं', translation: 'Meaning? I didn\'t understand' },
    { speaker: 'ai', text: 'जी जी, कोई बात नहीं। मेरा मतलब है कि आप रोज़ाना पूजा करते हैं, हफ्ते में कुछ बार करते हैं, महीने में कभी-कभी, या बहुत कम?', translation: 'Yes yes, no problem. I mean do you worship daily, a few times a week, occasionally in a month, or rarely?' },
    { speaker: 'user', text: 'अच्छा अच्छा। हां, रोज़ सुबह-शाम करते हैं', translation: 'Oh okay. Yes, we do it every morning and evening' },
    { speaker: 'ai', text: 'बहुत अच्छा जी। अब थोड़ा अलग टॉपिक पर आते हैं। आपके हिसाब से, क्या भारत में दूसरे धर्मों के लोगों को अपना धर्म मानने की पूरी आज़ादी है?', translation: 'Very good. Now let\'s move to a slightly different topic. In your opinion, do people of other religions have complete freedom to practice their religion in India?' },
    { speaker: 'user', text: 'हां भई, सबको आज़ादी है यहां', translation: 'Yes, everyone has freedom here' },
    { speaker: 'ai', text: 'ठीक है जी। और अगर आपके पड़ोस में कोई मुसलमान या ईसाई परিवार रहने आ जाए, तो आपको कैसा लगेगा?', translation: 'Okay. And if a Muslim or Christian family moved into your neighborhood, how would you feel?' },
    { speaker: 'user', text: 'अरे, कोई दिक्कत नहीं, सब मिलजुल कर रहते हैं', translation: 'Oh, no problem, everyone lives together harmoniously' },
    { speaker: 'ai', text: 'बहुत अच्छा। और अगर आपके परिवार में कोई दूसरे धर्म के व्यक्ति से शादी करना चाहे, तो परिवार की क्या राय होगी?', translation: 'Very good. And if someone in your family wanted to marry a person from another religion, what would the family\'s opinion be?' },
    { speaker: 'user', text: 'अरे ये तो... देखो जी...', translation: 'Oh this is... well, see...' },
    { speaker: 'ai', text: 'जी जी, कोई बात नहीं, आप बेझिझक बोल सकते हैं। कोई सही या गलत जवाब नहीं है। क्या परिवार स्वीकार करेगा, नहीं करेगा, या ये बात पर निर्भर करता है?', translation: 'Yes yes, no worries, you can speak freely. There\'s no right or wrong answer. Would the family accept it, not accept it, or does it depend?' },
    { speaker: 'user', text: 'सच बताऊं तो... थोड़ा मुश्किल होगा हमारे यहां', translation: 'To be honest... it would be a bit difficult in our family' },
    { speaker: 'ai', text: 'आपकी ईमानदारी के लिए शुक्रिया जी। अब बस आख़िरी सवाल है। क्या आपको लगता है कि भारत की विविधता, मतलब अलग-अलग धर्म और संस्कृतियां, देश को बेहतर बनाती हैं या कमज़ोर करती हैं?', translation: 'Thank you for your honesty. Now just the last question. Do you think India\'s diversity, meaning different religions and cultures, makes the country better or weaker?' },
    { speaker: 'user', text: 'बेहतर बनाती है जी, यही तो भारत की असली पहचान है', translation: 'Makes it better, that\'s the true identity of India' },
    { speaker: 'ai', text: 'वाह, बहुत बढ़िया। आपका बहुत-बहुत धन्यवाद अपना कीमती समय देने के लिए। आपके जवाब हमारी रिसर्च के लिए बहुत महत्वपूर्ण हैं। आपका दिन शुभ हो, नमस्ते!', translation: 'Wonderful, very good. Thank you so much for your valuable time. Your responses are very important for our research. Have a great day, goodbye!' },
  ];

  // Hindi conversation - Male voice version (रहा, गया forms)
  const hindiConversationMale = [
    { speaker: 'ai', text: 'नमस्ते! मैं VoxBharat से बोल रहा हूं। हम भारत में धर्म और सामाजिक जीवन पर एक रिसर्च सर्वे कर रहे हैं। इसमें बस पांच मिनट लगेंगे और आपकी पहचान पूरी तरह गोपनीय रहेगी। क्या आप हिस्सा लेना चाहेंगे?', translation: 'Hello! I\'m calling from VoxBharat. We\'re conducting a research survey on religion and social life in India. It will only take 5 minutes and your identity will remain completely confidential. Would you like to participate?' },
    { speaker: 'user', text: 'हां, ठीक है, बताइए', translation: 'Yes, okay, go ahead' },
    { speaker: 'ai', text: 'बहुत अच्छा, धन्यवाद जी। तो चलिए शुरू करते हैं। सबसे पहले, क्या आप अपनी उम्र बता सकते हैं?', translation: 'Very good, thank you. So let\'s begin. First of all, can you tell me your age?' },
    { speaker: 'user', text: 'जी, मैं 42 साल का हूं', translation: 'Yes, I am 42 years old' },
    { speaker: 'ai', text: 'धन्यवाद जी। और आपका धर्म क्या है?', translation: 'Thank you. And what is your religion?' },
    { speaker: 'user', text: 'जी, मैं हिंदू हूं', translation: 'Yes, I am Hindu' },
    { speaker: 'ai', text: 'अच्छा जी। अब बताइए, आपके जीवन में धर्म कितना महत्वपूर्ण है - बहुत महत्वपूर्ण, कुछ महत्वपूर्ण, या ज़्यादा महत्वपूर्ण नहीं?', translation: 'Okay. Now tell me, how important is religion in your life - very important, somewhat important, or not very important?' },
    { speaker: 'user', text: 'बहुत महत्वपूर्ण है हमारे लिए', translation: 'Very important for us' },
    { speaker: 'ai', text: 'समझ गया। अगला सवाल - आप कितनी बार प्रार्थना या पूजा करते हैं?', translation: 'I understand. Next question - How often do you pray or worship?' },
    { speaker: 'user', text: 'मतलब? समझा नहीं', translation: 'Meaning? I didn\'t understand' },
    { speaker: 'ai', text: 'जी जी, कोई बात नहीं। मेरा मतलब है कि आप रोज़ाना पूजा करते हैं, हफ्ते में कुछ बार करते हैं, महीने में कभी-कभी, या बहुत कम?', translation: 'Yes yes, no problem. I mean do you worship daily, a few times a week, occasionally in a month, or rarely?' },
    { speaker: 'user', text: 'अच्छा अच्छा। हां, रोज़ सुबह-शाम करते हैं', translation: 'Oh okay. Yes, we do it every morning and evening' },
    { speaker: 'ai', text: 'बहुत अच्छा जी। अब थोड़ा अलग टॉपिक पर आते हैं। आपके हिसाब से, क्या भारत में दूसरे धर्मों के लोगों को अपना धर्म मानने की पूरी आज़ादी है?', translation: 'Very good. Now let\'s move to a slightly different topic. In your opinion, do people of other religions have complete freedom to practice their religion in India?' },
    { speaker: 'user', text: 'हां भई, सबको आज़ादी है यहां', translation: 'Yes, everyone has freedom here' },
    { speaker: 'ai', text: 'ठीक है जी। और अगर आपके पड़ोस में कोई मुसलमान या ईसाई परिवार रहने आ जाए, तो आपको कैसा लगेगा?', translation: 'Okay. And if a Muslim or Christian family moved into your neighborhood, how would you feel?' },
    { speaker: 'user', text: 'अरे, कोई दिक्कत नहीं, सब मिलजुल कर रहते हैं', translation: 'Oh, no problem, everyone lives together harmoniously' },
    { speaker: 'ai', text: 'बहुत अच्छा। और अगर आपके परिवार में कोई दूसरे धर्म के व्यक्ति से शादी करना चाहे, तो परिवार की क्या राय होगी?', translation: 'Very good. And if someone in your family wanted to marry a person from another religion, what would the family\'s opinion be?' },
    { speaker: 'user', text: 'अरे ये तो... देखो जी...', translation: 'Oh this is... well, see...' },
    { speaker: 'ai', text: 'जी जी, कोई बात नहीं, आप बेझिझक बोल सकते हैं। कोई सही या गलत जवाब नहीं है। क्या परिवार स्वीकार करेगा, नहीं करेगा, या ये बात पर निर्भर करता है?', translation: 'Yes yes, no worries, you can speak freely. There\'s no right or wrong answer. Would the family accept it, not accept it, or does it depend?' },
    { speaker: 'user', text: 'सच बताऊं तो... थोड़ा मुश्किल होगा हमारे यहां', translation: 'To be honest... it would be a bit difficult in our family' },
    { speaker: 'ai', text: 'आपकी ईमानदारी के लिए शुक्रिया जी। अब बस आख़िरी सवाल है। क्या आपको लगता है कि भारत की विविधता, मतलब अलग-अलग धर्म और संस्कृतियां, देश को बेहतर बनाती हैं या कमज़ोर करती हैं?', translation: 'Thank you for your honesty. Now just the last question. Do you think India\'s diversity, meaning different religions and cultures, makes the country better or weaker?' },
    { speaker: 'user', text: 'बेहतर बनाती है जी, यही तो भारत की असली पहचान है', translation: 'Makes it better, that\'s the true identity of India' },
    { speaker: 'ai', text: 'वाह, बहुत बढ़िया। आपका बहुत-बहुत धन्यवाद अपना कीमती समय देने के लिए। आपके जवाब हमारी रिसर्च के लिए बहुत महत्वपूर्ण हैं। आपका दिन शुभ हो, नमस्ते!', translation: 'Wonderful, very good. Thank you so much for your valuable time. Your responses are very important for our research. Have a great day, goodbye!' },
  ];

  // Bengali conversation - Female voice version
  const bengaliConversationFemale = [
    { speaker: 'ai', text: 'নমস্কার! আমি VoxBharat থেকে বলছি। আমরা ভারতে ধর্ম এবং সামাজিক জীবন নিয়ে একটি গবেষণা সমীক্ষা করছি। এতে মাত্র পাঁচ মিনিট লাগবে এবং আপনার পরিচয় সম্পূর্ণ গোপন থাকবে। আপনি কি অংশ নিতে চান?', translation: 'Hello! I\'m calling from VoxBharat. We\'re conducting a research survey on religion and social life in India. It will only take 5 minutes and your identity will remain completely confidential. Would you like to participate?' },
    { speaker: 'user', text: 'হ্যাঁ, ঠিক আছে, বলুন', translation: 'Yes, okay, go ahead' },
    { speaker: 'ai', text: 'খুব ভালো, ধন্যবাদ। তাহলে শুরু করা যাক। প্রথমে, আপনার বয়স কত বলবেন?', translation: 'Very good, thank you. So let\'s begin. First, can you tell me your age?' },
    { speaker: 'user', text: 'জি, আমার বয়স 42', translation: 'Yes, I am 42 years old' },
    { speaker: 'ai', text: 'ধন্যবাদ। আর আপনার ধর্ম কী?', translation: 'Thank you. And what is your religion?' },
    { speaker: 'user', text: 'জি, আমি হিন্দু', translation: 'Yes, I am Hindu' },
    { speaker: 'ai', text: 'আচ্ছা। এখন বলুন, আপনার জীবনে ধর্ম কতটা গুরুত্বপূর্ণ - খুব গুরুত্বপূর্ণ, কিছুটা গুরুত্বপূর্ণ, নাকি বেশি গুরুত্বপূর্ণ নয়?', translation: 'Okay. Now tell me, how important is religion in your life - very important, somewhat important, or not very important?' },
    { speaker: 'user', text: 'আমাদের জন্য খুব গুরুত্বপূর্ণ', translation: 'Very important for us' },
    { speaker: 'ai', text: 'বুঝলাম। পরের প্রশ্ন - আপনি কতবার প্রার্থনা বা পূজা করেন?', translation: 'I understand. Next question - How often do you pray or worship?' },
    { speaker: 'user', text: 'মানে কী? বুঝলাম না', translation: 'Meaning? I didn\'t understand' },
    { speaker: 'ai', text: 'জি জি, কোনো সমস্যা নেই। আমি বলতে চাইছি আপনি কি প্রতিদিন পূজা করেন, সপ্তাহে কয়েকবার করেন, মাসে মাঝে মাঝে, নাকি খুব কম?', translation: 'Yes yes, no problem. I mean do you worship daily, a few times a week, occasionally in a month, or rarely?' },
    { speaker: 'user', text: 'আচ্ছা আচ্ছা। হ্যাঁ, রোজ সকাল-সন্ধ্যা করি', translation: 'Oh okay. Yes, we do it every morning and evening' },
    { speaker: 'ai', text: 'খুব ভালো। এখন একটু অন্য বিষয়ে আসি। আপনার মতে, ভারতে অন্য ধর্মের মানুষদের কি তাদের ধর্ম পালনের পূর্ণ স্বাধীনতা আছে?', translation: 'Very good. Now let\'s move to a slightly different topic. In your opinion, do people of other religions have complete freedom to practice their religion in India?' },
    { speaker: 'user', text: 'হ্যাঁ, সবার স্বাধীনতা আছে এখানে', translation: 'Yes, everyone has freedom here' },
    { speaker: 'ai', text: 'ঠিক আছে। আর যদি আপনার পাড়ায় কোনো মুসলিম বা খ্রিস্টান পরিবার থাকতে আসে, তাহলে আপনার কেমন লাগবে?', translation: 'Okay. And if a Muslim or Christian family moved into your neighborhood, how would you feel?' },
    { speaker: 'user', text: 'আরে, কোনো সমস্যা নেই, সবাই মিলেমিশে থাকে', translation: 'Oh, no problem, everyone lives together harmoniously' },
    { speaker: 'ai', text: 'খুব ভালো। আর যদি আপনার পরিবারে কেউ অন্য ধর্মের কাউকে বিয়ে করতে চায়, তাহলে পরিবারের মতামত কী হবে?', translation: 'Very good. And if someone in your family wanted to marry a person from another religion, what would the family\'s opinion be?' },
    { speaker: 'user', text: 'এটা তো... দেখুন...', translation: 'Oh this is... well, see...' },
    { speaker: 'ai', text: 'জি জি, কোনো সমস্যা নেই, আপনি নির্দ্বিধায় বলতে পারেন। কোনো সঠিক বা ভুল উত্তর নেই। পরিবার কি মেনে নেবে, নেবে না, নাকি পরিস্থিতির উপর নির্ভর করে?', translation: 'Yes yes, no worries, you can speak freely. There\'s no right or wrong answer. Would the family accept it, not accept it, or does it depend?' },
    { speaker: 'user', text: 'সত্যি বলতে... আমাদের এখানে একটু কঠিন হবে', translation: 'To be honest... it would be a bit difficult in our family' },
    { speaker: 'ai', text: 'আপনার সততার জন্য ধন্যবাদ। এখন শুধু শেষ প্রশ্ন। আপনার কি মনে হয় ভারতের বৈচিত্র্য, মানে বিভিন্ন ধর্ম ও সংস্কৃতি, দেশকে ভালো করে নাকি দুর্বল করে?', translation: 'Thank you for your honesty. Now just the last question. Do you think India\'s diversity, meaning different religions and cultures, makes the country better or weaker?' },
    { speaker: 'user', text: 'ভালো করে, এটাই তো ভারতের আসল পরিচয়', translation: 'Makes it better, that\'s the true identity of India' },
    { speaker: 'ai', text: 'বাহ, খুব ভালো। আপনার মূল্যবান সময় দেওয়ার জন্য অনেক অনেক ধন্যবাদ। আপনার উত্তরগুলি আমাদের গবেষণার জন্য খুবই গুরুত্বপূর্ণ। আপনার দিন শুভ হোক, নমস্কার!', translation: 'Wonderful, very good. Thank you so much for your valuable time. Your responses are very important for our research. Have a great day, goodbye!' },
  ];

  // Bengali conversation - Male voice version (Bengali verbs are mostly gender-neutral)
  const bengaliConversationMale = [
    { speaker: 'ai', text: 'নমস্কার! আমি VoxBharat থেকে বলছি। আমরা ভারতে ধর্ম এবং সামাজিক জীবন নিয়ে একটি গবেষণা সমীক্ষা করছি। এতে মাত্র পাঁচ মিনিট লাগবে এবং আপনার পরিচয় সম্পূর্ণ গোপন থাকবে। আপনি কি অংশ নিতে চান?', translation: 'Hello! I\'m calling from VoxBharat. We\'re conducting a research survey on religion and social life in India. It will only take 5 minutes and your identity will remain completely confidential. Would you like to participate?' },
    { speaker: 'user', text: 'হ্যাঁ, ঠিক আছে, বলুন', translation: 'Yes, okay, go ahead' },
    { speaker: 'ai', text: 'খুব ভালো, ধন্যবাদ। তাহলে শুরু করা যাক। প্রথমে, আপনার বয়স কত বলবেন?', translation: 'Very good, thank you. So let\'s begin. First, can you tell me your age?' },
    { speaker: 'user', text: 'জি, আমার বয়স 42', translation: 'Yes, I am 42 years old' },
    { speaker: 'ai', text: 'ধন্যবাদ। আর আপনার ধর্ম কী?', translation: 'Thank you. And what is your religion?' },
    { speaker: 'user', text: 'জি, আমি হিন্দু', translation: 'Yes, I am Hindu' },
    { speaker: 'ai', text: 'আচ্ছা। এখন বলুন, আপনার জীবনে ধর্ম কতটা গুরুত্বপূর্ণ - খুব গুরুত্বপূর্ণ, কিছুটা গুরুত্বপূর্ণ, নাকি বেশি গুরুত্বপূর্ণ নয়?', translation: 'Okay. Now tell me, how important is religion in your life - very important, somewhat important, or not very important?' },
    { speaker: 'user', text: 'আমাদের জন্য খুব গুরুত্বপূর্ণ', translation: 'Very important for us' },
    { speaker: 'ai', text: 'বুঝলাম। পরের প্রশ্ন - আপনি কতবার প্রার্থনা বা পূজা করেন?', translation: 'I understand. Next question - How often do you pray or worship?' },
    { speaker: 'user', text: 'মানে কী? বুঝলাম না', translation: 'Meaning? I didn\'t understand' },
    { speaker: 'ai', text: 'জি জি, কোনো সমস্যা নেই। আমি বলতে চাইছি আপনি কি প্রতিদিন পূজা করেন, সপ্তাহে কয়েকবার করেন, মাসে মাঝে মাঝে, নাকি খুব কম?', translation: 'Yes yes, no problem. I mean do you worship daily, a few times a week, occasionally in a month, or rarely?' },
    { speaker: 'user', text: 'আচ্ছা আচ্ছা। হ্যাঁ, রোজ সকাল-সন্ধ্যা করি', translation: 'Oh okay. Yes, we do it every morning and evening' },
    { speaker: 'ai', text: 'খুব ভালো। এখন একটু অন্য বিষয়ে আসি। আপনার মতে, ভারতে অন্য ধর্মের মানুষদের কি তাদের ধর্ম পালনের পূর্ণ স্বাধীনতা আছে?', translation: 'Very good. Now let\'s move to a slightly different topic. In your opinion, do people of other religions have complete freedom to practice their religion in India?' },
    { speaker: 'user', text: 'হ্যাঁ, সবার স্বাধীনতা আছে এখানে', translation: 'Yes, everyone has freedom here' },
    { speaker: 'ai', text: 'ঠিক আছে। আর যদি আপনার পাড়ায় কোনো মুসলিম বা খ্রিস্টান পরিবার থাকতে আসে, তাহলে আপনার কেমন লাগবে?', translation: 'Okay. And if a Muslim or Christian family moved into your neighborhood, how would you feel?' },
    { speaker: 'user', text: 'আরে, কোনো সমস্যা নেই, সবাই মিলেমিশে থাকে', translation: 'Oh, no problem, everyone lives together harmoniously' },
    { speaker: 'ai', text: 'খুব ভালো। আর যদি আপনার পরিবারে কেউ অন্য ধর্মের কাউকে বিয়ে করতে চায়, তাহলে পরিবারের মতামত কী হবে?', translation: 'Very good. And if someone in your family wanted to marry a person from another religion, what would the family\'s opinion be?' },
    { speaker: 'user', text: 'এটা তো... দেখুন...', translation: 'Oh this is... well, see...' },
    { speaker: 'ai', text: 'জি জি, কোনো সমস্যা নেই, আপনি নির্দ্বিধায় বলতে পারেন। কোনো সঠিক বা ভুল উত্তর নেই। পরিবার কি মেনে নেবে, নেবে না, নাকি পরিস্থিতির উপর নির্ভর করে?', translation: 'Yes yes, no worries, you can speak freely. There\'s no right or wrong answer. Would the family accept it, not accept it, or does it depend?' },
    { speaker: 'user', text: 'সত্যি বলতে... আমাদের এখানে একটু কঠিন হবে', translation: 'To be honest... it would be a bit difficult in our family' },
    { speaker: 'ai', text: 'আপনার সততার জন্য ধন্যবাদ। এখন শুধু শেষ প্রশ্ন। আপনার কি মনে হয় ভারতের বৈচিত্র্য, মানে বিভিন্ন ধর্ম ও সংস্কৃতি, দেশকে ভালো করে নাকি দুর্বল করে?', translation: 'Thank you for your honesty. Now just the last question. Do you think India\'s diversity, meaning different religions and cultures, makes the country better or weaker?' },
    { speaker: 'user', text: 'ভালো করে, এটাই তো ভারতের আসল পরিচয়', translation: 'Makes it better, that\'s the true identity of India' },
    { speaker: 'ai', text: 'বাহ, খুব ভালো। আপনার মূল্যবান সময় দেওয়ার জন্য অনেক অনেক ধন্যবাদ। আপনার উত্তরগুলি আমাদের গবেষণার জন্য খুবই গুরুত্বপূর্ণ। আপনার দিন শুভ হোক, নমস্কার!', translation: 'Wonderful, very good. Thank you so much for your valuable time. Your responses are very important for our research. Have a great day, goodbye!' },
  ];

  // Get conversation based on selected voice language AND gender
  const getConversation = () => {
    const voice = CARTESIA_VOICES.find(v => v.id === selectedVoice);
    if (voice?.lang === 'bn') {
      return voice?.gender === 'Male' ? bengaliConversationMale : bengaliConversationFemale;
    }
    return voice?.gender === 'Male' ? hindiConversationMale : hindiConversationFemale;
  };

  const demoConversation = getConversation();

  // Extract structured data from conversation
  const extractSurveyData = (conversation) => {
    const lang = getSelectedLanguage();
    const timestamp = new Date().toISOString();
    const duration = Math.floor(Math.random() * 60) + 180; // 3-4 minutes

    // Extract Q&A pairs (AI questions followed by user responses)
    const qaItems = [];
    for (let i = 0; i < conversation.length - 1; i++) {
      if (conversation[i].speaker === 'ai' && conversation[i + 1].speaker === 'user') {
        // Skip intro/outro and clarification prompts
        if (!conversation[i].translation.includes('participate') &&
            !conversation[i].translation.includes('goodbye') &&
            !conversation[i].translation.includes('no problem. I mean')) {
          qaItems.push({
            question: conversation[i].translation,
            questionOriginal: conversation[i].text,
            answer: conversation[i + 1].translation,
            answerOriginal: conversation[i + 1].text,
          });
        }
      }
    }

    return {
      id: `call_${Date.now()}`,
      timestamp,
      duration,
      language: lang === 'bn' ? 'Bengali' : 'Hindi',
      status: 'completed',
      responses: qaItems,
      structured: {
        age: 42,
        ageGroup: '36-45',
        religion: 'Hindu',
        religionImportance: 'Very important',
        prayerFrequency: 'Daily (morning and evening)',
        religiousFreedom: 'Yes, complete freedom',
        interfaithNeighbor: 'Accepting',
        interfaithMarriage: 'Difficult/hesitant',
        diversityOpinion: 'Positive - makes India better',
      },
      demographics: {
        age: 42,
        ageGroup: '36-45',
        religion: 'Hindu',
        language: lang === 'bn' ? 'Bengali' : 'Hindi',
      },
      sentiment: {
        overall: 'Positive',
        openness: 'Moderate',
        religiosity: 'High',
      },
      summary: `Respondent is a 42-year-old Hindu (age group 36-45) who considers religion very important in daily life, practicing prayers every morning and evening. They believe India offers religious freedom to all communities and would accept neighbors from different faiths. However, they expressed hesitation about interfaith marriage within their family, suggesting traditional family values. Overall positive view of India's religious diversity, seeing it as the country's defining characteristic.`,
    };
  };

  // API base URL
  const API_URL = 'http://localhost:3001/api';

  // Save survey to backend
  const saveSurveyToBackend = async (data) => {
    try {
      const response = await fetch(`${API_URL}/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        console.log('Survey saved to database:', data.id);
      }
    } catch (error) {
      console.log('Backend not available, storing locally only:', error.message);
    }
  };

  // Complete the call and extract data
  const completeCall = () => {
    const conversation = getConversation();
    const result = extractSurveyData(conversation);
    setSurveyResults(prev => [...prev, result]);
    setCallComplete(true);
    // Save to backend
    saveSurveyToBackend(result);
  };

  // ---- DEMO LOGIC ----

  const clearTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  // Text-only demo — always works, no network needed
  const runTextDemo = () => {
    if (demoActive) return;
    clearTimers();
    setDemoActive(true);
    setDemoStep(0);
    setCallComplete(false);

    const conversation = getConversation();
    const gaps = [500, 1800, 1500, 1800, 1500, 1200, 1500];
    let elapsed = 0;
    for (let i = 0; i < conversation.length; i++) {
      elapsed += gaps[i] || 1500;
      const step = i + 1;
      timersRef.current.push(setTimeout(() => setDemoStep(step), elapsed));
    }
    timersRef.current.push(setTimeout(() => {
      setDemoActive(false);
      completeCall();
    }, elapsed + 2000));
  };

  // Stop any running demo
  const stopDemo = () => {
    clearTimers();
    abortRef.current = true;
    setDemoActive(false);
    setIsSpeaking(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Hero button: scroll to demo area then auto-play text demo
  const handleWatchDemo = () => {
    setTimeout(() => {
      const el = document.getElementById('demo-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    setTimeout(() => runTextDemo(), 900);
  };

  // Get a contrasting voice for the respondent (different gender, same language)
  const getRespondentVoice = () => {
    const selectedVoiceData = CARTESIA_VOICES.find(v => v.id === selectedVoice);
    const oppositeGender = selectedVoiceData?.gender === 'Female' ? 'Male' : 'Female';
    const sameLang = selectedVoiceData?.lang || 'hi';
    const respondentVoice = CARTESIA_VOICES.find(v => v.gender === oppositeGender && v.lang === sameLang);
    return respondentVoice?.id || selectedVoice;
  };

  // Get language code for selected voice
  const getSelectedLanguage = () => {
    const voice = CARTESIA_VOICES.find(v => v.id === selectedVoice);
    return voice?.lang || 'hi';
  };

  // Cartesia voice demo (async, graceful fallback on failure)
  const runVoiceDemo = async () => {
    if (demoActive) return;
    clearTimers();
    setDemoActive(true);
    setDemoStep(0);
    setCallComplete(false);
    abortRef.current = false;

    const respondentVoiceId = getRespondentVoice();
    const language = getSelectedLanguage();
    const conversation = getConversation();

    for (let i = 0; i < conversation.length; i++) {
      if (abortRef.current) break;
      setDemoStep(i + 1);
      const msg = conversation[i];

      if (apiKey) {
        setIsSpeaking(true);
        // Use selected voice for AI, contrasting voice for user responses
        const voiceId = msg.speaker === 'ai' ? selectedVoice : respondentVoiceId;
        try {
          const resp = await fetch('https://api.cartesia.ai/tts/bytes', {
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
              output_format: { container: 'wav', encoding: 'pcm_f32le', sample_rate: 44100 },
            }),
          });
          if (resp.ok && audioRef.current && !abortRef.current) {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            audioRef.current.src = url;
            await new Promise((resolve) => {
              audioRef.current.onended = () => { URL.revokeObjectURL(url); resolve(); };
              audioRef.current.onerror = () => { URL.revokeObjectURL(url); resolve(); };
              audioRef.current.play().catch(() => resolve());
            });
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
        } catch (e) {
          console.error('Cartesia:', e);
          await new Promise(r => setTimeout(r, 2000));
        }
        setIsSpeaking(false);
      } else {
        await new Promise(r => setTimeout(r, msg.speaker === 'user' ? 1200 : 1800));
      }
      if (abortRef.current) break;
      await new Promise(r => setTimeout(r, 300));
    }
    if (!abortRef.current) {
      setDemoActive(false);
      completeCall();
    }
    setIsSpeaking(false);
  };

  // Sample Report Data (simulating 512 survey responses)
  const sampleReportData = {
    metadata: {
      title: 'Religion and Social Attitudes in India',
      subtitle: 'A Voice-Based Survey Study',
      conductedBy: 'VoxBharat Research',
      dateRange: 'January 15-22, 2026',
      totalResponses: 512,
      completionRate: 78.4,
      avgDuration: '4m 32s',
      marginOfError: 4.3,
      confidenceLevel: 95,
    },
    demographics: {
      byAge: [
        { group: '18-25', count: 89, pct: 17.4 },
        { group: '26-35', count: 142, pct: 27.7 },
        { group: '36-45', count: 118, pct: 23.0 },
        { group: '46-55', count: 97, pct: 19.0 },
        { group: '55+', count: 66, pct: 12.9 },
      ],
      byReligion: [
        { group: 'Hindu', count: 398, pct: 77.7 },
        { group: 'Muslim', count: 72, pct: 14.1 },
        { group: 'Christian', count: 21, pct: 4.1 },
        { group: 'Sikh', count: 12, pct: 2.3 },
        { group: 'Other', count: 9, pct: 1.8 },
      ],
      byLanguage: [
        { group: 'Hindi', count: 287, pct: 56.1 },
        { group: 'Bengali', count: 98, pct: 19.1 },
        { group: 'Telugu', count: 52, pct: 10.2 },
        { group: 'Marathi', count: 41, pct: 8.0 },
        { group: 'Tamil', count: 34, pct: 6.6 },
      ],
      byGender: [
        { group: 'Male', count: 276, pct: 53.9 },
        { group: 'Female', count: 231, pct: 45.1 },
        { group: 'Other', count: 5, pct: 1.0 },
      ],
    },
    keyFindings: [
      {
        metric: 'Religion Importance',
        headline: '73% say religion is "very important" in their lives',
        breakdown: [
          { label: 'Very', pct: 73, color: '#e8550f' },
          { label: 'Somewhat', pct: 19, color: '#cc4400' },
          { label: 'Not very', pct: 6, color: '#94a3b8' },
          { label: 'Not at all', pct: 2, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Religious Freedom',
        headline: '84% believe all religions can freely practice in India',
        breakdown: [
          { label: 'Yes, freely', pct: 84, color: '#e8550f' },
          { label: 'Restricted', pct: 12, color: '#94a3b8' },
          { label: 'No, limited', pct: 4, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Interfaith Neighbors',
        headline: '91% would accept neighbors from different religions',
        breakdown: [
          { label: 'Yes', pct: 91, color: '#e8550f' },
          { label: 'Depends', pct: 6, color: '#94a3b8' },
          { label: 'Same only', pct: 3, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Interfaith Marriage',
        headline: 'Only 34% say family would accept interfaith marriage',
        breakdown: [
          { label: 'Accept', pct: 34, color: '#e8550f' },
          { label: 'Difficult', pct: 28, color: '#cc4400' },
          { label: 'Reject', pct: 31, color: '#94a3b8' },
          { label: 'Depends', pct: 7, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Diversity Opinion',
        headline: '89% view religious diversity as making India better',
        breakdown: [
          { label: 'Better', pct: 89, color: '#e8550f' },
          { label: 'No effect', pct: 7, color: '#94a3b8' },
          { label: 'Weaker', pct: 4, color: '#cbd5e1' },
        ],
      },
    ],
    crosstabs: {
      ageVsInterfaithMarriage: [
        { age: '18-25', accept: 52, difficult: 26, reject: 18, depends: 4 },
        { age: '26-35', accept: 41, difficult: 31, reject: 22, depends: 6 },
        { age: '36-45', accept: 32, difficult: 29, reject: 32, depends: 7 },
        { age: '46-55', accept: 24, difficult: 27, reject: 41, depends: 8 },
        { age: '55+', accept: 18, difficult: 24, reject: 48, depends: 10 },
      ],
      religionVsInterfaithMarriage: [
        { religion: 'Hindu', accept: 32, difficult: 29, reject: 32, depends: 7 },
        { religion: 'Muslim', accept: 28, difficult: 25, reject: 40, depends: 7 },
        { religion: 'Christian', accept: 48, difficult: 28, reject: 19, depends: 5 },
        { religion: 'Sikh', accept: 42, difficult: 33, reject: 17, depends: 8 },
      ],
    },
    insights: [
      {
        type: 'key',
        title: 'Generational Divide on Interfaith Marriage',
        text: 'Younger respondents (18-25) are nearly 3x more likely to say their family would accept interfaith marriage compared to those 55+. This suggests significant generational shift in attitudes.',
      },
      {
        type: 'key',
        title: 'High Tolerance for Interfaith Neighbors',
        text: 'Despite hesitation about interfaith marriage, 91% express comfort with neighbors from different religions, indicating acceptance in public sphere but traditional views in family matters.',
      },
      {
        type: 'key',
        title: 'Strong Consensus on Diversity',
        text: 'Across all demographics, overwhelming majority (89%) view religious diversity positively. This finding is consistent across age, religion, and language groups.',
      },
    ],
    methodology: {
      sampleSize: 512,
      samplingMethod: 'Stratified random sampling across 5 states',
      dataCollection: 'AI-powered voice calls in 5 languages',
      fieldDates: 'January 15-22, 2026',
      avgCallDuration: '4 minutes 32 seconds',
      completionRate: '78.4%',
      qualityChecks: 'Audio review of 10% random sample, attention check questions',
      weighting: 'Post-stratification weighting by age, gender, religion, and state',
      marginOfError: '±4.3 percentage points at 95% confidence',
      limitations: 'Mobile phone users only; excludes populations without phone access',
    },
  };

  // Sample call log data (based on a real completed survey call)
  const sampleCallLog = {
    id: '7e334fbf-b929-4147-8d6d-da2e8bfbfcc6',
    timestamp: '2026-02-07T17:45:50.006Z',
    duration: 141,
    language: 'Hindi',
    gender: 'Female voice',
    status: 'completed',
    phone: '+91 98XXX XXXXX',
    summary: '24-year-old Hindu respondent who prays daily and values religion highly. Shows strong openness to religious diversity and welcomes interfaith neighbors, believing religious diversity makes India better.',
    transcript: [
      { role: 'assistant', content: 'नमस्ते! मैं VoxBharat से बोल रही हूँ। क्या मैं आपसे धार्मिक सद्भाव पर एक छोटा सा सर्वे कर सकती हूँ? बस 5 मिनट लगेंगे।' },
      { role: 'user', content: 'अच्छा बताइए क्या जानना है आपको' },
      { role: 'assistant', content: 'बहुत अच्छा! सबसे पहले, क्या आप अपनी उम्र बता सकते हैं?' },
      { role: 'user', content: 'जी मैं 24 साल का हूँ' },
      { role: 'assistant', content: 'धन्यवाद! आप किस धर्म को मानते हैं?' },
      { role: 'user', content: 'मैं हिंदू हूँ' },
      { role: 'assistant', content: 'ठीक है। आपके दैनिक जीवन में धर्म कितना महत्वपूर्ण है?' },
      { role: 'user', content: 'काफी महत्वपूर्ण है मेरे लिए' },
      { role: 'assistant', content: 'जी समझ गई। आप कितनी बार प्रार्थना या पूजा करते हैं?' },
      { role: 'user', content: 'मैं रोज़ सुबह पूजा करता हूँ' },
      { role: 'assistant', content: 'बहुत अच्छा। क्या आपको लगता है कि भारत में सभी धर्मों के लोगों को अपने धर्म का पालन करने की पूरी स्वतंत्रता है?' },
      { role: 'user', content: 'हाँ जी ज़रूर, कोई दिक्कत नहीं है' },
      { role: 'assistant', content: 'अच्छा। अगर आपके पड़ोस में किसी दूसरे धर्म का परिवार आए, तो आपको कैसा लगेगा?' },
      { role: 'user', content: 'मुझे कोई दिक्कत नहीं है, आने दीजिए' },
      { role: 'assistant', content: 'बहुत बढ़िया! अंतर-धार्मिक विवाह के बारे में आपकी क्या राय है?' },
      { role: 'user', content: 'मुझे लगता है कि यह ठीक है, प्यार मायने रखता है' },
      { role: 'assistant', content: 'ठीक है। आपके विचार में, धार्मिक विविधता भारत को बेहतर बनाती है या चुनौतीपूर्ण?' },
      { role: 'user', content: 'बेहतर बनाती है जी' },
      { role: 'assistant', content: 'बहुत-बहुत धन्यवाद! आपके जवाब हमारे लिए बहुत कीमती हैं। आपका दिन शुभ हो!' },
    ],
    extractedData: {
      demographics: { age: 24, ageGroup: '18-24', religion: 'Hindu', language: 'Hindi' },
      structured: {
        age: 24,
        ageGroup: '18-24',
        religion: 'Hindu',
        religionImportance: 'very_important',
        prayerFrequency: 'daily',
        religiousFreedom: 'yes_fully',
        interfaithNeighbor: 'welcome',
        interfaithMarriage: 'fully_support',
        diversityOpinion: 'makes_better',
      },
      sentiment: { overall: 'positive', openness: 'high', religiosity: 'high' },
    },
  };

  // Simple bar chart component
  const BarChart = ({ data, valueKey = 'pct', labelKey = 'label', color = '#e8550f', showValue = true }) => (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 text-sm text-gray-600 truncate">{item[labelKey] || item.group}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${item[valueKey]}%`, backgroundColor: item.color || color }}
            >
              {showValue && item[valueKey] > 10 && (
                <span className="text-xs text-white font-medium">{item[valueKey]}%</span>
              )}
            </div>
          </div>
          {showValue && item[valueKey] <= 10 && (
            <span className="text-xs text-gray-500 w-10">{item[valueKey]}%</span>
          )}
        </div>
      ))}
    </div>
  );

  const handleLaunch = (config, questions) => {
    console.log('Launching survey:', config, questions);
    alert(`Survey "${config.name}" launched!\n${questions.length} questions\n${config.sampleSize} target responses`);
    setShowBuilder(false);
  };

  if (showBuilder) {
    return <FullSurveyBuilder onClose={() => setShowBuilder(false)} onLaunch={handleLaunch} />;
  }

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Shared nav component
  const NavBar = () => (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>
          </div>
          <span className="font-display text-2xl font-bold">
            <span className="gradient-text">Vox</span>Bharat
          </span>
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('how-it-works')} className={`font-body text-sm hover:text-[#e8550f] ${currentPage === 'how-it-works' ? 'text-[#e8550f] font-medium' : 'text-gray-600'}`}>How It Works</button>
          <button onClick={() => navigateTo('about')} className={`font-body text-sm hover:text-[#e8550f] ${currentPage === 'about' ? 'text-[#e8550f] font-medium' : 'text-gray-600'}`}>About</button>
          <button onClick={() => navigateTo('faqs')} className={`font-body text-sm hover:text-[#e8550f] ${currentPage === 'faqs' ? 'text-[#e8550f] font-medium' : 'text-gray-600'}`}>FAQs</button>
          <button onClick={() => navigateTo('data-policy')} className={`font-body text-sm hover:text-[#e8550f] ${currentPage === 'data-policy' ? 'text-[#e8550f] font-medium' : 'text-gray-600'}`}>Data Policy</button>
          <button
            onClick={() => setShowBuilder(true)}
            className="px-5 py-2 bg-[#e8550f] text-white rounded-full font-body text-sm font-medium hover:bg-[#cc4400] transition-colors"
          >
            Create Survey →
          </button>
        </div>
      </div>
    </nav>
  );

  // Shared footer component
  const Footer = () => (
    <footer className="py-16 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <button onClick={() => navigateTo('home')} className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>
              </div>
              <span className="font-display text-xl font-bold">
                <span className="gradient-text">Vox</span>Bharat
              </span>
            </button>
            <p className="font-body text-sm text-gray-400 leading-relaxed">
              AI-powered voice surveys for Bharat. Hearing every voice, in every language.
            </p>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-[#3d2314] mb-3">Product</h4>
            <div className="space-y-2">
              <button onClick={() => navigateTo('home')} className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">Home</button>
              <button onClick={() => navigateTo('how-it-works')} className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">How It Works</button>
            </div>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-[#3d2314] mb-3">Company</h4>
            <div className="space-y-2">
              <button onClick={() => navigateTo('about')} className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">About</button>
              <button onClick={() => navigateTo('faqs')} className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">FAQs</button>
              <button onClick={() => navigateTo('data-policy')} className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">Data Policy</button>
            </div>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold text-[#3d2314] mb-3">Get Started</h4>
            <div className="space-y-2">
              <button onClick={() => setShowBuilder(true)} className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">Create Survey</button>
              <a href="https://cartesia.ai" target="_blank" rel="noopener noreferrer" className="block font-body text-sm text-gray-400 hover:text-[#e8550f]">Cartesia Voice</a>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-body text-sm text-gray-400">
            © 2026 VoxBharat · Hearing every voice
          </div>
          <div className="flex gap-6">
            <button onClick={() => navigateTo('data-policy')} className="font-body text-xs text-gray-400 hover:text-[#e8550f]">Privacy</button>
            <button onClick={() => navigateTo('faqs')} className="font-body text-xs text-gray-400 hover:text-[#e8550f]">Support</button>
          </div>
        </div>
      </div>
    </footer>
  );

  // Shared page shell
  const PageShell = ({ children }) => (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#fff9f0] to-[#f5f0e8]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .gradient-text {
          background: linear-gradient(135deg, #ff6b2c 0%, #e85d04 50%, #ffaa80 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .gradient-text-warm {
          background: linear-gradient(135deg, #e8550f 0%, #cc4400 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
      <NavBar />
      <div className="pt-24">
        {children}
      </div>
      <Footer />
    </div>
  );

  // ===== SUBPAGES =====

  if (currentPage === 'how-it-works') {
    return (
      <PageShell>
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-4">
                How It <span className="gradient-text-warm">Works</span>
              </h1>
              <p className="font-body text-lg text-gray-500 max-w-2xl mx-auto">
                From survey creation to actionable insights in four simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 mb-24">
              {[
                {
                  step: '01',
                  title: 'Design Your Survey',
                  desc: 'Choose your topic, audience, and languages. Our builder helps you craft culturally appropriate questions.',
                  icon: (
                    <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  ),
                },
                {
                  step: '02',
                  title: 'AI Calls Respondents',
                  desc: 'Our voice AI places calls in the respondent\'s native language, conducting natural conversations.',
                  icon: (
                    <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  ),
                },
                {
                  step: '03',
                  title: 'Responses Analyzed',
                  desc: 'Every response is transcribed, translated, and structured automatically with sentiment analysis.',
                  icon: (
                    <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  ),
                },
                {
                  step: '04',
                  title: 'Get Your Report',
                  desc: 'Receive a comprehensive report with demographics, cross-tabulations, and exportable datasets.',
                  icon: (
                    <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  ),
                },
              ].map((item, i) => (
                <div key={i} className="relative">
                  {i < 3 && (
                    <div className="hidden md:block absolute top-10 left-full w-full h-px border-t-2 border-dashed border-[#e8550f]/20 -translate-x-4" />
                  )}
                  <div className="bg-white rounded-2xl p-6 border hover:shadow-lg transition-shadow h-full">
                    <div className="w-14 h-14 rounded-xl bg-[#e8550f]/10 flex items-center justify-center mb-4">
                      {item.icon}
                    </div>
                    <div className="font-body text-xs font-bold text-[#e8550f] tracking-widest uppercase mb-2">Step {item.step}</div>
                    <h3 className="font-display text-xl font-bold text-[#3d2314] mb-2">{item.title}</h3>
                    <p className="font-body text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed breakdown */}
            <div className="max-w-3xl mx-auto space-y-12">
              <div>
                <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-4">Survey Design</h2>
                <p className="font-body text-gray-600 leading-relaxed mb-4">
                  Start by choosing from our template library or build from scratch. Select your target audience by geography, demographics, and language. Our builder supports multiple question types including single choice, Likert scales, open-ended questions, and NPS scores.
                </p>
                <p className="font-body text-gray-600 leading-relaxed">
                  Questions are automatically adapted for cultural context — phrasing that works in Hindi may not translate directly to Tamil. Our AI handles these nuances so you get natural, unbiased conversations.
                </p>
              </div>
              <div>
                <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-4">Voice AI Conversations</h2>
                <p className="font-body text-gray-600 leading-relaxed mb-4">
                  Our AI uses Cartesia Sonic 3 for ultra-low-latency speech synthesis. Calls sound natural and human-like, with support for code-switching (mixing languages mid-sentence), regional accents, and conversational flow.
                </p>
                <p className="font-body text-gray-600 leading-relaxed">
                  The AI adapts in real-time — if a respondent gives a short answer, it probes further. If they go off-topic, it gently redirects. Every conversation feels personal, not scripted.
                </p>
              </div>
              <div>
                <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-4">Analysis & Reports</h2>
                <p className="font-body text-gray-600 leading-relaxed mb-4">
                  Every response is transcribed and translated to English in real-time. Our pipeline extracts structured data, runs sentiment analysis, and flags key themes automatically.
                </p>
                <p className="font-body text-gray-600 leading-relaxed">
                  You get a live dashboard with demographic breakdowns, cross-tabulations, and exportable datasets in CSV and JSON formats. Reports include AI-generated summaries with confidence intervals and margin of error calculations.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-24 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-[#ff6b2c] via-[#e85d04] to-[#ffaa80] rounded-3xl p-12 text-center">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to get started?
                </h2>
                <button
                  onClick={() => setShowBuilder(true)}
                  className="px-10 py-4 bg-white text-[#e85d04] rounded-full font-body font-bold text-lg hover:bg-[#faf8f5] transition-colors shadow-lg"
                >
                  Create Your First Survey
                </button>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  if (currentPage === 'about') {
    return (
      <PageShell>
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
              <div>
                <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-6">
                  About <span className="gradient-text-warm">VoxBharat</span>
                </h1>
                <div className="space-y-4 font-body text-gray-600 leading-relaxed">
                  <p>
                    India is the world's largest democracy, yet traditional polling consistently fails to capture
                    the true voice of its 1.4 billion people. Language barriers, rural inaccessibility, and
                    cultural hesitance leave hundreds of millions unheard.
                  </p>
                  <p>
                    VoxBharat changes that. Using advanced voice AI, we conduct natural phone conversations
                    in 12 Indian languages, reaching respondents where they are — from Mumbai high-rises
                    to villages in Bihar. No apps to download, no literacy required.
                  </p>
                  <p>
                    Our AI doesn't just ask questions — it listens. It handles code-switching between languages,
                    understands regional idioms, and adapts its tone to build genuine rapport. The result:
                    higher response rates, richer data, and insights that actually represent Bharat.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Languages Supported', value: '12', sub: 'and growing' },
                  { label: 'Response Rate', value: '68%', sub: 'vs 12% traditional' },
                  { label: 'Cost Per Interview', value: '~40', sub: 'rupees average' },
                  { label: 'Average Call Duration', value: '4:30', sub: 'minutes' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border text-center">
                    <div className="font-display text-3xl font-bold gradient-text">{stat.value}</div>
                    <div className="font-body text-sm font-medium text-[#3d2314] mt-1">{stat.label}</div>
                    <div className="font-body text-xs text-gray-400 mt-0.5">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mission */}
            <div className="max-w-3xl mx-auto mb-24">
              <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-6">Our Mission</h2>
              <p className="font-body text-gray-600 leading-relaxed mb-4">
                Traditional polling in India has a fundamental problem: it can't reach the people who matter most.
                The farmer in rural Madhya Pradesh, the fisherwoman in coastal Kerala, the daily-wage worker in
                Kolkata's lanes — their voices shape elections, markets, and policy, yet they're systematically excluded
                from the data that drives decisions.
              </p>
              <p className="font-body text-gray-600 leading-relaxed mb-4">
                We built VoxBharat to close this gap. Our AI conducts thousands of natural voice conversations
                simultaneously across 12 languages, reaching respondents on the only device they carry —
                their mobile phone. No internet needed, no app to install, no literacy required.
              </p>
              <p className="font-body text-gray-600 leading-relaxed">
                The result is data that finally represents all of India — not just the English-speaking,
                urban, online minority. Better data means better decisions, and better decisions mean
                a more representative democracy.
              </p>
            </div>

            {/* What sets us apart */}
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-8">What Sets Us Apart</h2>
              <div className="space-y-6">
                {[
                  { title: 'True Multilingual AI', desc: 'Not just translation — our voice models understand cultural context, code-switching, and regional idioms across 12 Indian languages.' },
                  { title: 'Rural-First Design', desc: 'Works on basic feature phones over 2G networks. 73% of our respondents are from rural areas that traditional polls miss entirely.' },
                  { title: 'Bias-Free Methodology', desc: 'No interviewer bias, no leading questions, no social desirability effects. Every respondent gets the same consistent, empathetic AI interviewer.' },
                  { title: 'Real-Time Analysis', desc: 'Responses are transcribed, translated, structured, and analyzed as they come in. No weeks-long processing — see results as calls complete.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#e8550f]/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#e8550f]" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-[#3d2314] mb-1">{item.title}</h3>
                      <p className="font-body text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  if (currentPage === 'faqs') {
    return (
      <PageShell>
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-4">
                Frequently Asked <span className="gradient-text-warm">Questions</span>
              </h1>
              <p className="font-body text-lg text-gray-500">
                Everything you need to know about VoxBharat.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: 'How does the AI handle different dialects within a language?',
                  a: 'Our voice models are trained on diverse regional speech patterns. The AI recognizes dialectal variations in pronunciation, vocabulary, and grammar — whether it\'s Bhojpuri-influenced Hindi or Sylheti Bengali. It adapts its responses to match the respondent\'s natural speech.',
                },
                {
                  q: 'What happens if the respondent doesn\'t want to participate?',
                  a: 'The AI always introduces itself and asks for consent before proceeding. If the respondent declines, the call ends politely and their number is flagged to avoid re-contact. Participation is entirely voluntary.',
                },
                {
                  q: 'How accurate are the survey results compared to traditional methods?',
                  a: 'In benchmark studies, our AI-conducted surveys have shown comparable accuracy to in-person interviews, with significantly better reach into underrepresented demographics. The consistent methodology eliminates interviewer bias — a major issue in traditional Indian polling.',
                },
                {
                  q: 'Can I customize the survey questions and flow?',
                  a: 'Yes. Our survey builder lets you design custom questionnaires with multiple question types (single choice, Likert scale, open-ended, etc.). You can set branching logic, choose target demographics, and select which languages to deploy in.',
                },
                {
                  q: 'What languages are currently supported?',
                  a: 'We currently support 12 languages: Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, and Urdu. Together these cover over 95% of India\'s population. More languages are being added regularly.',
                },
                {
                  q: 'How long does it take to get results?',
                  a: 'Most surveys are completed within 24-48 hours. The AI can conduct thousands of calls simultaneously, so even large sample sizes (10,000+) are typically done within two days. Results are available in real-time as calls complete.',
                },
                {
                  q: 'Is respondent data kept private?',
                  a: 'Absolutely. All data is encrypted in transit and at rest. Phone numbers are hashed and never stored in plain text. Individual responses are anonymized before analysis. We comply with India\'s Digital Personal Data Protection Act.',
                },
                {
                  q: 'How does pricing work?',
                  a: 'Pricing is based on the number of completed interviews and languages used. Our per-interview cost is roughly 10x cheaper than traditional in-person polling. Contact us for a custom quote based on your survey needs.',
                },
                {
                  q: 'Can the AI handle interruptions or off-topic responses?',
                  a: 'Yes. The AI is designed for natural conversation flow. If a respondent goes off-topic, it gently redirects. If they interrupt, it pauses and lets them speak. If they need a question repeated, it rephrases naturally rather than reading the same script.',
                },
                {
                  q: 'What kind of reports do I get?',
                  a: 'You receive a full dashboard with demographic breakdowns, sentiment analysis, cross-tabulations, and AI-generated summaries. Data is exportable in CSV and JSON formats. Each completed call also generates an individual transcript with translation.',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border hover:shadow-md transition-shadow">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 cursor-pointer font-body font-medium text-[#3d2314] text-left"
                  >
                    <span>{item.q}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 font-body text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Still have questions? */}
            <div className="mt-16 text-center bg-white rounded-2xl border p-8">
              <h3 className="font-display text-2xl font-bold text-[#3d2314] mb-2">Still have questions?</h3>
              <p className="font-body text-gray-500 mb-4">We're happy to help with anything else.</p>
              <a
                href="mailto:hello@voxbharat.com"
                className="inline-block px-6 py-3 bg-[#e8550f] text-white rounded-full font-body font-medium hover:bg-[#cc4400] transition-colors"
              >
                Get in Touch
              </a>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  if (currentPage === 'data-policy') {
    return (
      <PageShell>
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-4">
                Data <span className="gradient-text-warm">& Privacy</span>
              </h1>
              <p className="font-body text-lg text-gray-500 max-w-2xl mx-auto">
                Trust is the foundation of good research. Here's how we protect every respondent.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-24">
              {[
                {
                  title: 'Informed Consent',
                  desc: 'Every call begins with a clear disclosure that the respondent is speaking with an AI. Participation is voluntary and can be ended at any time.',
                  icon: (
                    <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  ),
                },
                {
                  title: 'Data Encryption',
                  desc: 'All voice data and survey responses are encrypted using AES-256 in transit and at rest. Audio recordings are processed and deleted — never stored permanently.',
                  icon: (
                    <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ),
                },
                {
                  title: 'Anonymization',
                  desc: 'Phone numbers are hashed before storage. Individual responses cannot be traced back to specific individuals. All analysis uses aggregated, de-identified data.',
                  icon: (
                    <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  ),
                },
                {
                  title: 'Regulatory Compliance',
                  desc: 'We comply with India\'s Digital Personal Data Protection Act (DPDPA) 2023, TRAI guidelines for automated calls, and international standards including GDPR principles.',
                  icon: (
                    <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                  ),
                },
                {
                  title: 'Data Retention',
                  desc: 'Survey data is retained only for the duration agreed upon with the client. Respondents can request deletion of their data at any time through our support channels.',
                  icon: (
                    <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ),
                },
                {
                  title: 'No Selling of Data',
                  desc: 'Respondent data is never sold, shared with third parties, or used for purposes beyond the commissioned research. Your data belongs to you.',
                  icon: (
                    <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  ),
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-[#e8550f]/10 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#3d2314] mb-2">{item.title}</h3>
                  <p className="font-body text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Detailed policy text */}
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Data Collection</h2>
                <p className="font-body text-gray-600 leading-relaxed">
                  We collect only the data necessary for the commissioned survey: voice responses (temporarily for transcription),
                  demographic information voluntarily provided by respondents, and call metadata (duration, language, completion status).
                  Phone numbers provided by clients are used solely for outreach and are hashed immediately upon call completion.
                </p>
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Data Processing</h2>
                <p className="font-body text-gray-600 leading-relaxed">
                  Voice recordings are transcribed in real-time and deleted immediately after transcription. Transcripts are
                  translated, analyzed for sentiment, and structured into quantitative data points. All processing happens on
                  encrypted infrastructure. No human listens to recordings unless explicitly authorized for quality assurance.
                </p>
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Your Rights</h2>
                <p className="font-body text-gray-600 leading-relaxed">
                  Respondents may request access to their data, correction of inaccurate information, or complete deletion
                  of their records at any time. Clients retain full ownership of aggregated survey data. We do not claim any
                  intellectual property rights over the insights generated from your surveys.
                </p>
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Contact</h2>
                <p className="font-body text-gray-600 leading-relaxed">
                  For any data-related inquiries, deletion requests, or privacy concerns, reach us at{' '}
                  <a href="mailto:privacy@voxbharat.com" className="text-[#e8550f] hover:underline">privacy@voxbharat.com</a>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  // ===== HOME PAGE =====

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#fff9f0] to-[#f5f0e8]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .gradient-text {
          background: linear-gradient(135deg, #ff6b2c 0%, #e85d04 50%, #ffaa80 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .gradient-text-warm {
          background: linear-gradient(135deg, #e8550f 0%, #cc4400 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>

      <NavBar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8550f]/10 rounded-full mb-6">
              <span className="text-[#e8550f] text-sm font-body font-medium">Voice AI for Bharat</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-[#3d2314] leading-tight mb-6">
              Hear Every Voice.
              <br />
              <span className="gradient-text">In Every Language.</span>
            </h1>
            <p className="font-body text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
              AI-powered voice polling that reaches 900M+ Indians in their native language. 
              Get accurate, representative insights in hours, not weeks.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowBuilder(true)}
                className="px-8 py-4 bg-gradient-to-r from-[#ff6b2c] to-[#e85d04] text-white rounded-full font-body font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
              >
                Create Your First Survey
              </button>
              <button
                onClick={handleWatchDemo}
                disabled={demoActive}
                className="px-8 py-4 border-2 border-[#3d2314] text-[#3d2314] rounded-full font-body font-bold hover:bg-[#3d2314]/5 transition-colors flex items-center gap-2"
              >
                <span>▶</span> Watch Demo
              </button>
            </div>
          </div>

          {/* Language ticker */}
          <div className="mt-16 flex items-center gap-4">
            <span className="font-body text-sm text-gray-400">Supported:</span>
            <div className="flex gap-3 overflow-hidden">
              {LANGUAGES.slice(0, 6).map((lang, i) => (
                <span
                  key={lang.code}
                  className={`px-4 py-2 rounded-full font-body text-sm transition-all ${
                    activeLang % 6 === i ? 'bg-[#e8550f] text-white' : 'bg-white text-gray-600'
                  }`}
                >
                  {lang.native}
                </span>
              ))}
              <span className="px-4 py-2 text-gray-400">+6 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '12', label: 'Languages' },
              { value: '73%', label: 'Rural Reach' },
              { value: '10x', label: 'Cheaper' },
              { value: '48hr', label: 'Turnaround' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-4xl md:text-5xl font-bold gradient-text">{stat.value}</div>
                <div className="font-body text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo-section" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-[#3d2314] mb-6">
                Experience AI Voice
                <br />
                <span className="gradient-text-warm">In Action</span>
              </h2>
              <p className="font-body text-lg text-gray-600 mb-8">
                Our AI conducts natural conversations in any Indian language. 
                It understands context, handles interruptions, and captures nuanced responses.
              </p>
              
              {/* Cartesia API Key + Voice Picker */}
              <div className="bg-white rounded-xl p-4 border mb-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-body text-sm font-medium text-gray-700">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" /></svg> Cartesia API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#e8550f]/10 text-[#e8550f] px-2 py-0.5 rounded-full font-medium">Sonic 3</span>
                      <a 
                        href="https://cartesia.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-[#e8550f] hover:underline"
                      >
                        Get key →
                      </a>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk_car_..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#e8550f]/20"
                  />
                </div>

                <div>
                  <label className="font-body text-xs text-gray-600 mb-2 block">Voice</label>
                  <div className="flex gap-2">
                    {CARTESIA_VOICES.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVoice(v.id)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                          selectedVoice === v.id
                            ? 'border-[#e8550f] bg-[#e8550f]/5 text-[#e8550f] font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {v.gender === 'Male' ? 'M' : 'F'} {v.name}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  {apiKey ? '✓ Voice enabled · Sonic 3 · Hindi · 40ms latency' : 'Add key to hear AI voice in Hindi'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={apiKey ? runVoiceDemo : runTextDemo}
                  disabled={demoActive}
                  className="px-6 py-3 bg-[#e8550f] text-white rounded-full font-body font-medium hover:bg-[#cc4400] disabled:opacity-50 flex items-center gap-2"
                >
                  {demoActive ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {isSpeaking ? 'Speaking...' : 'Playing...'}
                    </>
                  ) : (
                    <>▶ {apiKey ? 'Play with Cartesia Voice' : 'Play Demo'}</>
                  )}
                </button>
                {demoActive && (
                  <button
                    onClick={stopDemo}
                    className="px-4 py-3 border border-gray-300 rounded-full font-body text-gray-600 hover:bg-gray-50"
                  >
                    ■ Stop
                  </button>
                )}
                <button
                  onClick={() => setShowSampleReport(true)}
                  className="px-6 py-3 bg-gradient-to-r from-[#ff6b2c] to-[#e85d04] text-white rounded-full font-body font-medium hover:opacity-90 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> View Sample Report
                </button>
                <button
                  onClick={() => setShowSampleCallLog(true)}
                  className="px-6 py-3 border-2 border-[#e8550f] text-[#e8550f] rounded-full font-body font-medium hover:bg-[#e8550f]/5 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> Sample Call Log
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>
                </div>
                <div>
                  <div className="font-body font-semibold text-[#3d2314]">VoxBharat AI</div>
                  <div className="font-body text-sm text-gray-400">
                    {isSpeaking ? 'Speaking Hindi · Cartesia Sonic 3' : demoActive ? '● Live' : 'Voice Survey Demo'}
                  </div>
                </div>
                <div className="ml-auto">
                  <VoiceWave active={isSpeaking || demoActive} color={isSpeaking ? '#ff6b2c' : '#e8550f'} />
                </div>
              </div>

              <div className="space-y-4 min-h-[350px] max-h-[400px] overflow-y-auto">
                {demoStep >= 1 && demoConversation.slice(0, demoStep).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.speaker === 'user'
                          ? 'bg-[#e8550f] text-white rounded-br-md'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 text-[#3d2314] rounded-bl-md border'
                      }`}
                    >
                      <p className="font-body text-base">{msg.text}</p>
                      <p className={`font-body text-xs mt-2 ${msg.speaker === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                        {msg.translation}
                      </p>
                    </div>
                  </div>
                ))}
                
                {demoStep < 1 && !demoActive && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 font-body">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <p>Click "Play Demo" to see a conversation</p>
                    <p className="text-sm mt-1">
                      {apiKey ? 'Cartesia Sonic 3 · Hindi' : 'Add API key for voice'}
                    </p>
                  </div>
                )}

                {demoStep === 0 && demoActive && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-[#e8550f] font-body animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-[#e8550f]/10 flex items-center justify-center mb-4 animate-pulse">
                      <svg className="w-8 h-8 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <p className="font-medium">Calling respondent...</p>
                    <p className="text-sm text-gray-400 mt-1">Connecting in Hindi</p>
                  </div>
                )}

                {demoStep === demoConversation.length && !demoActive && callComplete && (
                  <div className="flex flex-col items-center justify-center py-6 text-[#e8550f] font-body">
                    <div className="w-16 h-16 rounded-full bg-[#e8550f]/10 flex items-center justify-center mb-3">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="font-semibold">Survey Complete!</p>
                    <p className="text-sm text-gray-500 mb-4">Response captured and analyzed</p>
                    <button
                      onClick={() => setShowTranscript(true)}
                      className="px-4 py-2 bg-[#e8550f] text-white rounded-lg text-sm font-medium hover:bg-[#cc4400] flex items-center gap-2"
                    >
                      View Transcript & Summary
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Hidden audio element */}
        <audio ref={audioRef} />
        
        {/* Powered by */}
        {apiKey && (
          <div className="text-center mt-8">
            <span className="font-body text-xs text-gray-400">
              Voice powered by <a href="https://cartesia.ai" target="_blank" rel="noopener noreferrer" className="text-[#e8550f] hover:underline">Cartesia Sonic 3</a> · 40ms latency · 9 Indian languages
            </span>
          </div>
        )}
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-transparent via-[#e8550f]/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#3d2314] mb-4">
              Why Polls <span className="gradient-text">Get It Wrong</span>
            </h2>
            <p className="font-body text-lg text-gray-500">And how we fix it.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { problem: 'Urban sampling bias', solution: '73% rural reach via mobile' },
              { problem: 'No caste census since 1931', solution: 'Real-time demographic weighting' },
              { problem: 'Fear-based non-response', solution: 'AI builds trust in native language' },
              { problem: 'Weeks to get data', solution: 'Results in 24-48 hours' },
              { problem: '₹400/interview cost', solution: '10x cheaper at scale' },
              { problem: 'Interviewer bias', solution: 'Consistent AI methodology' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-lg transition-shadow">
                <p className="font-body text-gray-400 line-through mb-2">{item.problem}</p>
                <p className="font-display text-xl text-[#e8550f] font-semibold">{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#3d2314] mb-4 text-center">
            Every Language. <span className="gradient-text-warm">Every Dialect.</span>
          </h2>
          <p className="font-body text-lg text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            India's diversity is its strength. Our AI handles code-switching, regional idioms, and cultural nuances.
          </p>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                className="bg-white rounded-xl p-4 text-center hover:shadow-md hover:-translate-y-1 transition-all border"
              >
                <div className="font-display text-xl text-[#e8550f] font-semibold">{lang.native}</div>
                <div className="font-body text-sm text-gray-500">{lang.english}</div>
                <div className="font-body text-xs text-gray-300 mt-1">{lang.speakers}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#ff6b2c] via-[#e85d04] to-[#ffaa80] rounded-3xl p-12 md:p-16 text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Hear Bharat?
            </h2>
            <p className="font-body text-xl text-white/80 mb-8 max-w-xl mx-auto">
              Create your first voice survey in minutes. No coding required.
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-10 py-5 bg-white text-[#e85d04] rounded-full font-body font-bold text-lg hover:bg-[#faf8f5] transition-colors shadow-lg"
            >
              Create Survey — Free Trial
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Transcript & Summary Modal */}
      {showTranscript && surveyResults.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#e8550f] to-[#cc4400] text-white">
              <div>
                <h3 className="font-display text-xl font-bold">Call Analysis</h3>
                <p className="text-sm text-white/70">Survey response #{surveyResults.length}</p>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const result = surveyResults[surveyResults.length - 1];
                return (
                  <div className="space-y-6">
                    {/* Call Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-[#e8550f]">{result.language}</div>
                        <div className="text-xs text-gray-500">Language</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-[#e8550f]">{Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}</div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">✓</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-[#e8550f]">{result.responses.length}</div>
                        <div className="text-xs text-gray-500">Questions</div>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="bg-gradient-to-br from-[#e8550f]/5 to-[#e8550f]/10 rounded-xl p-5 border border-[#e8550f]/20">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <h4 className="font-display text-lg font-semibold text-[#3d2314]">AI Summary</h4>
                      </div>
                      <p className="font-body text-gray-700 leading-relaxed">{result.summary}</p>
                    </div>

                    {/* Structured Data */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <h4 className="font-display text-lg font-semibold text-[#3d2314]">Structured Data</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(result.structured).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="text-sm font-medium text-[#3d2314]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <h4 className="font-display text-lg font-semibold text-[#3d2314]">Sentiment Analysis</h4>
                      </div>
                      <div className="flex gap-4">
                        {Object.entries(result.sentiment).map(([key, value]) => (
                          <div key={key} className="flex-1 text-center py-3 bg-gray-50 rounded-lg">
                            <div className={`text-lg font-bold ${
                              value === 'Positive' || value === 'High' ? 'text-green-600' :
                              value === 'Moderate' ? 'text-yellow-600' : 'text-gray-600'
                            }`}>{value}</div>
                            <div className="text-xs text-gray-500 capitalize">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Full Transcript */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        <h4 className="font-display text-lg font-semibold text-[#3d2314]">Full Transcript</h4>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {demoConversation.map((msg, i) => (
                          <div key={i} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl ${
                              msg.speaker === 'user'
                                ? 'bg-[#e8550f] text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              <div className="text-xs opacity-60 mb-1">
                                {msg.speaker === 'ai' ? 'VoxBharat AI' : 'Respondent'}
                              </div>
                              <p className="text-sm">{msg.text}</p>
                              <p className="text-xs opacity-60 mt-1 italic">{msg.translation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Export Options */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `survey-${result.id}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 py-3 bg-[#e8550f] text-white rounded-xl font-medium hover:bg-[#cc4400] flex items-center justify-center gap-2"
                      >
                        ↓ Export JSON
                      </button>
                      <button
                        onClick={() => {
                          const headers = ['id', 'timestamp', 'language', 'age', 'religion', 'religion_importance', 'prayer_frequency', 'interfaith_marriage', 'diversity_opinion', 'sentiment'];
                          const row = [result.id, result.timestamp, result.language, result.structured.age, result.structured.religion, result.structured.religionImportance, result.structured.prayerFrequency, result.structured.interfaithMarriage, result.structured.diversityOpinion, result.sentiment.overall];
                          const csv = headers.join(',') + '\n' + row.map(v => `"${v}"`).join(',');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `survey-${result.id}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                      >
                        ↓ Export CSV
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(result.summary);
                          alert('Summary copied to clipboard!');
                        }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                      >
                        Copy Summary
                      </button>
                    </div>

                    {/* Sample Research Report Preview */}
                    <div className="bg-gradient-to-r from-[#ff6b2c]/10 to-[#e85d04]/10 rounded-xl p-5 border border-[#ff6b2c]/20">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <h4 className="font-display text-lg font-semibold text-[#3d2314]">
                          See What 500+ Responses Look Like
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        View a sample research report showing the kind of analysis you can generate from hundreds of voice surveys - demographics, crosstabs, key findings, and more.
                      </p>
                      <button
                        onClick={() => { setShowTranscript(false); setShowSampleReport(true); }}
                        className="px-4 py-2 bg-gradient-to-r from-[#ff6b2c] to-[#e85d04] text-white rounded-lg text-sm font-medium hover:opacity-90"
                      >
                        View Sample Report →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sample Call Log Modal */}
      {showSampleCallLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-[#3d2314] to-[#e8550f] text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Sample Call Log</div>
                  <h2 className="font-display text-2xl font-bold">AI Voice Survey - Single Call</h2>
                  <p className="text-white/80 mt-1">What each completed call produces</p>
                </div>
                <button
                  onClick={() => setShowSampleCallLog(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/20 text-sm">
                <div>
                  <div className="text-lg font-bold">{Math.floor(sampleCallLog.duration / 60)}m {sampleCallLog.duration % 60}s</div>
                  <div className="text-xs text-white/60">Duration</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{sampleCallLog.language}</div>
                  <div className="text-xs text-white/60">Language</div>
                </div>
                <div>
                  <div className="text-lg font-bold capitalize">{sampleCallLog.status}</div>
                  <div className="text-xs text-white/60">Status</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{sampleCallLog.phone}</div>
                  <div className="text-xs text-white/60">Phone</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* AI Summary */}
              <section>
                <h3 className="font-display text-lg font-bold text-[#3d2314] mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-xs font-bold">1</span>
                  AI Summary
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700 italic">
                  "{sampleCallLog.summary}"
                </div>
              </section>

              {/* Conversation Transcript */}
              <section>
                <h3 className="font-display text-lg font-bold text-[#3d2314] mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-xs font-bold">2</span>
                  Conversation Transcript
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                  {sampleCallLog.transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'assistant'
                          ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                          : 'bg-[#e8550f] text-white rounded-br-md'
                      }`}>
                        <div className="text-[10px] uppercase tracking-wider mb-1 opacity-60">
                          {msg.role === 'assistant' ? 'AI Interviewer' : 'Respondent'}
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Extracted Data */}
              <section>
                <h3 className="font-display text-lg font-bold text-[#3d2314] mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-xs font-bold">3</span>
                  Extracted Structured Data
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Demographics */}
                  <div className="bg-white border rounded-xl p-4">
                    <h4 className="font-semibold text-[#3d2314] mb-3 text-sm uppercase tracking-wider">Demographics</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(sampleCallLog.extractedData.demographics).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-medium text-[#3d2314]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div className="bg-white border rounded-xl p-4">
                    <h4 className="font-semibold text-[#3d2314] mb-3 text-sm uppercase tracking-wider">Sentiment Analysis</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(sampleCallLog.extractedData.sentiment).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-gray-500 capitalize">{key}</span>
                          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                            value === 'positive' || value === 'high' ? 'bg-green-100 text-green-700' :
                            value === 'neutral' || value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Structured Survey Responses */}
                <div className="bg-white border rounded-xl p-4 mt-4">
                  <h4 className="font-semibold text-[#3d2314] mb-3 text-sm uppercase tracking-wider">Survey Responses</h4>
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-0 text-sm">
                    {Object.entries(sampleCallLog.extractedData.structured).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                        <span className="font-medium text-[#3d2314]">{value !== null ? String(value).replace(/_/g, ' ') : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Call ID: {sampleCallLog.id} &middot; {new Date(sampleCallLog.timestamp).toLocaleString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(sampleCallLog, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'voxbharat-sample-call-log.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 text-sm bg-[#e8550f] text-white rounded-lg hover:bg-[#cc4400]"
                >
                  ↓ Download JSON
                </button>
                <button
                  onClick={() => setShowSampleCallLog(false)}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Research Report Modal */}
      {showSampleReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Report Header */}
            <div className="p-6 border-b bg-gradient-to-r from-[#3d2314] to-[#e8550f] text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Sample Research Report</div>
                  <h2 className="font-display text-2xl font-bold">{sampleReportData.metadata.title}</h2>
                  <p className="text-white/80 mt-1">{sampleReportData.metadata.subtitle}</p>
                </div>
                <button
                  onClick={() => setShowSampleReport(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
              {/* Key Stats Bar */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
                <div>
                  <div className="text-2xl font-bold">{sampleReportData.metadata.totalResponses}</div>
                  <div className="text-xs text-white/60">Responses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">±{sampleReportData.metadata.marginOfError}%</div>
                  <div className="text-xs text-white/60">Margin of Error</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{sampleReportData.metadata.completionRate}%</div>
                  <div className="text-xs text-white/60">Completion Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{sampleReportData.metadata.avgDuration}</div>
                  <div className="text-xs text-white/60">Avg Duration</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-xs text-white/60">Languages</div>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* Executive Summary */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">1</span>
                  Executive Summary
                </h3>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  {sampleReportData.insights.map((insight, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#e8550f] mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-[#3d2314]">{insight.title}</div>
                        <div className="text-sm text-gray-600">{insight.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Demographics */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">2</span>
                  Sample Demographics
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#3d2314] mb-4">Age Distribution</h4>
                    <BarChart data={sampleReportData.demographics.byAge} labelKey="group" />
                  </div>
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#3d2314] mb-4">Religious Affiliation</h4>
                    <BarChart data={sampleReportData.demographics.byReligion} labelKey="group" />
                  </div>
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#3d2314] mb-4">Survey Language</h4>
                    <BarChart data={sampleReportData.demographics.byLanguage} labelKey="group" color="#cc4400" />
                  </div>
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#3d2314] mb-4">Gender</h4>
                    <BarChart data={sampleReportData.demographics.byGender} labelKey="group" color="#e85d04" />
                  </div>
                </div>
              </section>

              {/* Key Findings */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">3</span>
                  Key Findings
                </h3>
                <div className="space-y-6">
                  {sampleReportData.keyFindings.map((finding, i) => (
                    <div key={i} className="bg-white border rounded-xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{finding.metric}</div>
                          <h4 className="font-semibold text-[#3d2314] text-lg">{finding.headline}</h4>
                        </div>
                      </div>
                      <BarChart data={finding.breakdown} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Cross-tabulations */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">4</span>
                  Cross-Tabulations
                </h3>

                {/* Age vs Interfaith Marriage */}
                <div className="bg-white border rounded-xl p-5 mb-6">
                  <h4 className="font-semibold text-[#3d2314] mb-4">Interfaith Marriage Acceptance by Age Group</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Age Group</th>
                          <th className="text-center py-2 px-3 font-medium text-green-600">Would Accept</th>
                          <th className="text-center py-2 px-3 font-medium text-yellow-600">Difficult</th>
                          <th className="text-center py-2 px-3 font-medium text-red-600">Would Reject</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-500">Depends</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleReportData.crosstabs.ageVsInterfaithMarriage.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-3 px-3 font-medium">{row.age}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-green-100 text-green-700 font-medium">{row.accept}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">{row.difficult}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-red-100 text-red-700 font-medium">{row.reject}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-gray-100 text-gray-700 font-medium">{row.depends}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 italic">
                    Note: Younger respondents show significantly higher acceptance rates for interfaith marriage
                  </p>
                </div>

                {/* Religion vs Interfaith Marriage */}
                <div className="bg-white border rounded-xl p-5">
                  <h4 className="font-semibold text-[#3d2314] mb-4">Interfaith Marriage Acceptance by Religion</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Religion</th>
                          <th className="text-center py-2 px-3 font-medium text-green-600">Would Accept</th>
                          <th className="text-center py-2 px-3 font-medium text-yellow-600">Difficult</th>
                          <th className="text-center py-2 px-3 font-medium text-red-600">Would Reject</th>
                          <th className="text-center py-2 px-3 font-medium text-gray-500">Depends</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleReportData.crosstabs.religionVsInterfaithMarriage.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-3 px-3 font-medium">{row.religion}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-green-100 text-green-700 font-medium">{row.accept}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">{row.difficult}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-red-100 text-red-700 font-medium">{row.reject}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-gray-100 text-gray-700 font-medium">{row.depends}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Methodology */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">5</span>
                  Methodology
                </h3>
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-0 text-sm">
                    {Object.entries(sampleReportData.methodology).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[140px_1fr] gap-3 py-3 border-b border-gray-200 last:border-0">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium text-[#3d2314] text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* CTA */}
              <section className="bg-gradient-to-r from-[#e8550f] to-[#cc4400] rounded-xl p-6 text-white text-center">
                <h3 className="font-display text-xl font-bold mb-2">Ready to run your own voice survey?</h3>
                <p className="text-white/80 mb-4">Get results like this in days, not months. No enumerators needed.</p>
                <button
                  onClick={() => { setShowSampleReport(false); setShowBuilder(true); }}
                  className="px-6 py-3 bg-white text-[#e8550f] rounded-lg font-semibold hover:bg-gray-100"
                >
                  Create Your Survey →
                </button>
              </section>

            </div>

            {/* Report Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {sampleReportData.metadata.conductedBy} • {sampleReportData.metadata.dateRange}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(sampleReportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'voxbharat-sample-report.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 text-sm bg-[#e8550f] text-white rounded-lg hover:bg-[#cc4400]"
                >
                  ↓ Download Report
                </button>
                <button
                  onClick={() => setShowSampleReport(false)}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
