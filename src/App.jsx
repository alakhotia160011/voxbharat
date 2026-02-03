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
  { id: 'political', name: 'Political Polling', icon: '🗳️', desc: 'Voting intent, leader approval, issues' },
  { id: 'market', name: 'Market Research', icon: '📊', desc: 'Brand awareness, purchase intent' },
  { id: 'customer', name: 'Customer Feedback', icon: '⭐', desc: 'Satisfaction, NPS, service quality' },
  { id: 'employee', name: 'Employee Survey', icon: '👥', desc: 'Engagement, culture, workplace' },
  { id: 'social', name: 'Social Research', icon: '🔬', desc: 'Attitudes, behaviors, social issues' },
  { id: 'custom', name: 'Custom Survey', icon: '✏️', desc: 'Build from scratch' },
];

const QUESTION_TYPES = [
  { id: 'single', name: 'Single Choice', icon: '○' },
  { id: 'multiple', name: 'Multiple Choice', icon: '☐' },
  { id: 'likert', name: 'Likert Scale', icon: '⊖' },
  { id: 'rating', name: 'Rating (1-10)', icon: '★' },
  { id: 'nps', name: 'NPS (0-10)', icon: '📈' },
  { id: 'open', name: 'Open Ended', icon: '💬' },
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

const VoiceWave = ({ active, color = '#0d6e6e' }) => {
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
            <span className="text-white text-xl">📋</span>
          </div>
          <div>
            <h1 className="font-semibold text-[#1e3a5f]">Survey Builder</h1>
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
            className="px-4 py-2 text-[#0d6e6e] border border-[#0d6e6e] rounded-lg hover:bg-[#0d6e6e]/5"
          >
            🔊 Preview Voice
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
                  step === i + 1 ? 'bg-[#0d6e6e] text-white' 
                  : step > i + 1 ? 'bg-[#0d6e6e]/10 text-[#0d6e6e] cursor-pointer hover:bg-[#0d6e6e]/20' 
                  : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step > i + 1 ? 'bg-[#0d6e6e] text-white' : ''}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < 5 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-[#0d6e6e]' : 'bg-gray-200'}`} />}
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
                <h2 className="text-2xl font-semibold text-[#1e3a5f] mb-2">Let's create your survey</h2>
                <p className="text-gray-600">Start with the basics.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Survey Name *</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="e.g., Bihar Assembly Election Poll 2025"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20 focus:border-[#0d6e6e]"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-4">Survey Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SURVEY_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setConfig({ ...config, type: type.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        config.type === type.id ? 'border-[#0d6e6e] bg-[#0d6e6e]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-2">{type.icon}</span>
                      <span className="font-medium text-[#1e3a5f] block">{type.name}</span>
                      <span className="text-xs text-gray-500">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-4">Survey Languages *</label>
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
                          ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white'
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
                  <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Brand Names (comma-separated)</label>
                  <input
                    type="text"
                    value={config.brandNames}
                    onChange={(e) => setConfig({ ...config, brandNames: e.target.value })}
                    placeholder="e.g., Tata, Reliance, Adani, Mahindra"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20"
                  />
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!config.name || !config.type}
                className="w-full py-4 bg-[#0d6e6e] text-white rounded-xl font-medium hover:bg-[#1e6f5c] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Audience →
              </button>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#1e3a5f] mb-2">Define your audience</h2>
                <p className="text-gray-600">Who should we survey?</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-4">Geographic Scope</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {GEOGRAPHIES.map((geo) => (
                    <button
                      key={geo.id}
                      onClick={() => setConfig({ ...config, geography: geo.id, states: [] })}
                      className={`p-3 rounded-xl border-2 text-sm transition-all ${
                        config.geography === geo.id ? 'border-[#0d6e6e] bg-[#0d6e6e]/5 font-medium' : 'border-gray-200 hover:border-gray-300'
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
                              ? 'bg-[#0d6e6e] text-white'
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
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Target Sample Size</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={config.sampleSize}
                    onChange={(e) => setConfig({ ...config, sampleSize: parseInt(e.target.value) })}
                    className="flex-1 accent-[#0d6e6e]"
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
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Target Audience Description</label>
                <textarea
                  value={config.targetAudience}
                  onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                  placeholder="e.g., Registered voters in rural Maharashtra, aged 25-55, primarily farmers..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Exclusion Criteria (Optional)</label>
                <textarea
                  value={config.exclusions}
                  onChange={(e) => setConfig({ ...config, exclusions: e.target.value })}
                  placeholder="e.g., Exclude anyone who has participated in a survey in the last 30 days, employees of political parties..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-[#0d6e6e] text-white rounded-xl font-medium hover:bg-[#1e6f5c]">
                  Continue to Timeline →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Timeline & Budget (NEW) */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#1e3a5f] mb-2">Timeline & Budget</h2>
                <p className="text-gray-600">When do you need results and what's your budget?</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-4">Urgency</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'standard', name: 'Standard', time: '5-7 days', price: '₹38/response', icon: '📅' },
                    { id: 'express', name: 'Express', time: '2-3 days', price: '₹45/response', icon: '⚡' },
                    { id: 'urgent', name: 'Urgent', time: '24-48 hours', price: '₹55/response', icon: '🚨' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setConfig({ ...config, urgency: opt.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        config.urgency === opt.id ? 'border-[#0d6e6e] bg-[#0d6e6e]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{opt.icon}</span>
                      <span className="font-medium block">{opt.name}</span>
                      <span className="text-sm text-gray-500 block">{opt.time}</span>
                      <span className="text-xs text-[#0d6e6e]">{opt.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Deadline (Optional)</label>
                <input
                  type="date"
                  value={config.deadline}
                  onChange={(e) => setConfig({ ...config, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Budget (Optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹</span>
                  <input
                    type="number"
                    value={config.budget}
                    onChange={(e) => setConfig({ ...config, budget: e.target.value })}
                    placeholder="e.g., 50000"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Estimated: ₹{estimatedCost.toLocaleString()} for {config.sampleSize.toLocaleString()} responses
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-4">Call Timing Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'morning', label: '🌅 Morning (8am-12pm)' },
                    { id: 'afternoon', label: '☀️ Afternoon (12pm-5pm)' },
                    { id: 'evening', label: '🌙 Evening (5pm-9pm)' },
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
                          ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Retry Policy</label>
                <p className="text-sm text-gray-500 mb-3">How many times should we retry non-responders?</p>
                <div className="flex items-center gap-4">
                  {[1, 2, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setConfig({ ...config, retryPolicy: n })}
                      className={`w-12 h-12 rounded-lg border-2 font-medium transition-all ${
                        config.retryPolicy === n
                          ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Incentive for Respondents (Optional)</label>
                <input
                  type="text"
                  value={config.incentive}
                  onChange={(e) => setConfig({ ...config, incentive: e.target.value })}
                  placeholder="e.g., ₹50 mobile recharge, lottery entry..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-4 bg-[#0d6e6e] text-white rounded-xl font-medium hover:bg-[#1e6f5c]">
                  Continue to Goals →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#1e3a5f] mb-2">Research Goals</h2>
                <p className="text-gray-600">What do you want to learn? Better input = better questions.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Primary Purpose / Research Objective *</label>
                <p className="text-sm text-gray-500 mb-3">What decision will this survey inform?</p>
                <textarea
                  value={config.purpose}
                  onChange={(e) => setConfig({ ...config, purpose: e.target.value })}
                  placeholder="e.g., Understand voter sentiment before the 2025 Bihar elections, measure satisfaction with incumbent government, identify key issues driving vote choice..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Key Questions You Want Answered</label>
                <textarea
                  value={config.keyQuestions}
                  onChange={(e) => setConfig({ ...config, keyQuestions: e.target.value })}
                  placeholder={"1. Which party is leading in vote share?\n2. What are the top 3 issues for voters?\n3. How does the youth vote differ from older voters?\n4. Is there an urban-rural divide?"}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20 resize-none font-mono text-sm"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-4">Survey Settings</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Target Duration</label>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map(d => (
                        <button
                          key={d}
                          onClick={() => setConfig({ ...config, duration: d })}
                          className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                            config.duration === d ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white' : 'border-gray-200'
                          }`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {config.duration <= 10 ? '✓ Optimal for voice' : '⚠️ May reduce completion'}
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
                            config.tone === t ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white' : 'border-gray-200'
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
                            config.sensitivity === s ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white' : 'border-gray-200'
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
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Analysis Goals (Optional)</label>
                <textarea
                  value={config.analysisGoals}
                  onChange={(e) => setConfig({ ...config, analysisGoals: e.target.value })}
                  placeholder="e.g., Compare by age, urban vs rural, caste breakdown. Track against 2020 poll..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20 resize-none"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-[#1e3a5f] mb-2">Link to Previous Survey (Optional)</label>
                <input
                  type="url"
                  value={config.previousSurveyLink}
                  onChange={(e) => setConfig({ ...config, previousSurveyLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20"
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
                    <>✨ Generate Questions with AI</>
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
                  <h2 className="text-2xl font-semibold text-[#1e3a5f] mb-2">Edit Questions</h2>
                  <p className="text-gray-600">Reorder, edit, or add new questions.</p>
                </div>
                <button
                  onClick={addQuestion}
                  className="px-4 py-2 bg-[#0d6e6e] text-white rounded-lg hover:bg-[#1e6f5c] flex items-center gap-2"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className={`bg-white rounded-xl border-2 transition-all ${
                      editingQuestion === q.id ? 'border-[#0d6e6e] shadow-lg' : 'border-gray-100 hover:border-gray-200'
                    } ${q.isDemographic ? 'opacity-60' : ''}`}
                  >
                    <div
                      className="p-4 flex items-start gap-3 cursor-pointer"
                      onClick={() => setEditingQuestion(editingQuestion === q.id ? null : q.id)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, -1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400" disabled={i === 0}>↑</button>
                        <span className="w-7 h-7 rounded-lg bg-[#0d6e6e]/10 flex items-center justify-center text-[#0d6e6e] font-medium text-sm">{i + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, 1); }} className="p-1 hover:bg-gray-100 rounded text-gray-400" disabled={i === questions.length - 1}>↓</button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {QUESTION_TYPES.find(t => t.id === q.type)?.name}
                          </span>
                          <span className="px-2 py-0.5 bg-[#0d6e6e]/10 rounded text-xs text-[#0d6e6e]">{q.category}</span>
                          {q.required && <span className="text-red-500 text-xs">Required</span>}
                        </div>
                        <p className="font-medium text-[#1e3a5f] truncate">{q.text || 'Untitled'}</p>
                        {q.textEn && <p className="text-sm text-gray-500 truncate">{q.textEn}</p>}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600"
                      >
                        🗑️
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
                                  q.type === type.id ? 'border-[#0d6e6e] bg-[#0d6e6e] text-white' : 'border-gray-200'
                                }`}
                              >
                                {type.icon} {type.name}
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
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0d6e6e]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">English</label>
                            <textarea
                              value={q.textEn}
                              onChange={(e) => updateQuestion(q.id, { textEn: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0d6e6e]"
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
                                className="text-sm text-[#0d6e6e] hover:underline"
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
                              className="w-4 h-4 accent-[#0d6e6e]"
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
                <button onClick={() => setStep(6)} className="flex-1 py-4 bg-[#0d6e6e] text-white rounded-xl font-medium hover:bg-[#1e6f5c]">
                  Review & Launch →
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-semibold text-[#1e3a5f] mb-2">Review & Launch</h2>
                <p className="text-gray-600">Double-check everything before going live.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-[#0d6e6e]">{questions.length}</div>
                  <div className="text-sm text-gray-500">Questions</div>
                </div>
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-[#e85d04]">~{estimatedDuration} min</div>
                  <div className="text-sm text-gray-500">Duration</div>
                </div>
                <div className="bg-white rounded-xl p-4 border text-center">
                  <div className="text-3xl font-bold text-[#1e3a5f]">{config.sampleSize.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Responses</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold text-[#1e3a5f] mb-4">Configuration Summary</h3>
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
                <h3 className="font-semibold text-[#1e3a5f] mb-3">Questions ({questions.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-[#0d6e6e]/10 flex items-center justify-center text-xs text-[#0d6e6e] font-medium flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{q.text}</p>
                        <p className="text-xs text-gray-400">{q.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#0d6e6e] to-[#1e6f5c] rounded-2xl p-6 text-white">
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
                <h3 className="font-semibold text-[#1e3a5f] mb-4">Quality Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Record all audio (for quality audit)</span>
                    <input
                      type="checkbox"
                      checked={config.recordAudio}
                      onChange={(e) => setConfig({ ...config, recordAudio: e.target.checked })}
                      className="w-5 h-5 accent-[#0d6e6e]"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Include attention checks</span>
                    <input
                      type="checkbox"
                      checked={config.qualityChecks}
                      onChange={(e) => setConfig({ ...config, qualityChecks: e.target.checked })}
                      className="w-5 h-5 accent-[#0d6e6e]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(5)} className="px-6 py-4 border border-gray-300 rounded-xl hover:bg-gray-50">
                  ← Edit Questions
                </button>
                <button
                  onClick={() => onLaunch && onLaunch(config, questions)}
                  className="flex-1 py-4 bg-gradient-to-r from-[#ff6b2c] to-[#e85d04] text-white rounded-xl font-medium hover:opacity-90"
                >
                  🚀 Launch Survey
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
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#0d6e6e] to-[#1e6f5c] text-white">
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
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0d6e6e] focus:border-transparent"
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
                  <span className="text-sm font-medium text-[#1e3a5f]">🎤 Try Custom Text</span>
                  <button
                    onClick={() => setShowCustomQuestionInput(!showCustomQuestionInput)}
                    className="text-xs text-[#0d6e6e] hover:underline"
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
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-[#0d6e6e] focus:border-transparent"
                    />
                    <button
                      onClick={() => customTestText.trim() && playVoice(customTestText, 'custom')}
                      disabled={!customTestText.trim()}
                      className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        customTestText.trim()
                          ? 'bg-[#0d6e6e] text-white hover:bg-[#1e6f5c]'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isPlayingVoice && playingQuestionId === 'custom' ? (
                        <>⏹️ Stop</>
                      ) : (
                        <>🔊 Play Custom Text</>
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
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'intro' ? 'bg-red-100 text-red-600' : 'text-[#0d6e6e] hover:bg-[#0d6e6e]/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'intro' ? '⏹️ Stop' : '🔊 Play'}
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
                          <span className="text-xs bg-[#0d6e6e]/10 text-[#0d6e6e] px-2 py-0.5 rounded">Q{i + 1}</span>
                          <span className="text-xs text-gray-400">{q.category}</span>
                        </div>
                        <button
                          onClick={() => playVoice(q.text, q.id)}
                          className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === q.id ? 'bg-red-100 text-red-600' : 'text-[#0d6e6e] hover:bg-[#0d6e6e]/10'}`}
                        >
                          {isPlayingVoice && playingQuestionId === q.id ? '⏹️ Stop' : '🔊 Play'}
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
                    className={`text-xs px-2 py-1 rounded ${isPlayingVoice && playingQuestionId === 'closing' ? 'bg-red-100 text-red-600' : 'text-[#0d6e6e] hover:bg-[#0d6e6e]/10'}`}
                  >
                    {isPlayingVoice && playingQuestionId === 'closing' ? '⏹️ Stop' : '🔊 Play'}
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
                className="w-full py-3 bg-gradient-to-r from-[#0d6e6e] to-[#1e6f5c] text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2"
              >
                ▶️ Play Full Preview
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
    const conversation = getSelectedLanguage() === 'bn' ? bengaliConversation : hindiConversation;
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

    const conversation = getSelectedLanguage() === 'bn' ? bengaliConversation : hindiConversation;
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
    const conversation = language === 'bn' ? bengaliConversation : hindiConversation;

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
          { label: 'Very important', pct: 73, color: '#0d6e6e' },
          { label: 'Somewhat important', pct: 19, color: '#1e6f5c' },
          { label: 'Not very important', pct: 6, color: '#94a3b8' },
          { label: 'Not at all important', pct: 2, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Religious Freedom',
        headline: '84% believe all religions can freely practice in India',
        breakdown: [
          { label: 'Yes, complete freedom', pct: 84, color: '#0d6e6e' },
          { label: 'Some restrictions', pct: 12, color: '#94a3b8' },
          { label: 'No, limited freedom', pct: 4, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Interfaith Neighbors',
        headline: '91% would accept neighbors from different religions',
        breakdown: [
          { label: 'Yes, no problem', pct: 91, color: '#0d6e6e' },
          { label: 'Depends on religion', pct: 6, color: '#94a3b8' },
          { label: 'Prefer same religion', pct: 3, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Interfaith Marriage',
        headline: 'Only 34% say family would accept interfaith marriage',
        breakdown: [
          { label: 'Would accept', pct: 34, color: '#0d6e6e' },
          { label: 'Difficult but possible', pct: 28, color: '#1e6f5c' },
          { label: 'Would not accept', pct: 31, color: '#94a3b8' },
          { label: 'Depends', pct: 7, color: '#cbd5e1' },
        ],
      },
      {
        metric: 'Diversity Opinion',
        headline: '89% view religious diversity as making India better',
        breakdown: [
          { label: 'Makes India better', pct: 89, color: '#0d6e6e' },
          { label: 'No effect', pct: 7, color: '#94a3b8' },
          { label: 'Makes India weaker', pct: 4, color: '#cbd5e1' },
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

  // Simple bar chart component
  const BarChart = ({ data, valueKey = 'pct', labelKey = 'label', color = '#0d6e6e', showValue = true }) => (
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#fff9f0] to-[#f5f0e8]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        .gradient-text {
          background: linear-gradient(135deg, #ff6b2c 0%, #e85d04 50%, #d4a84b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .gradient-text-teal {
          background: linear-gradient(135deg, #0d6e6e 0%, #1e6f5c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
              <span className="text-white text-lg">🎙️</span>
            </div>
            <span className="font-display text-2xl font-bold">
              <span className="gradient-text">Vox</span>Bharat
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#demo-section" className="font-body text-sm text-gray-600 hover:text-[#0d6e6e]">Demo</a>
            <a href="#features" className="font-body text-sm text-gray-600 hover:text-[#0d6e6e]">Features</a>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-5 py-2 bg-[#0d6e6e] text-white rounded-full font-body text-sm font-medium hover:bg-[#1e6f5c] transition-colors"
            >
              Create Survey →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d6e6e]/10 rounded-full mb-6">
              <span className="text-[#0d6e6e] text-sm font-body font-medium">🇮🇳 Voice AI for Bharat</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-[#1e3a5f] leading-tight mb-6">
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
                className="px-8 py-4 border-2 border-[#1e3a5f] text-[#1e3a5f] rounded-full font-body font-bold hover:bg-[#1e3a5f]/5 transition-colors flex items-center gap-2"
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
                    activeLang % 6 === i ? 'bg-[#0d6e6e] text-white' : 'bg-white text-gray-600'
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
              <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-6">
                Experience AI Voice
                <br />
                <span className="gradient-text-teal">In Action</span>
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
                      🔊 Cartesia API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#0d6e6e]/10 text-[#0d6e6e] px-2 py-0.5 rounded-full font-medium">Sonic 3</span>
                      <a 
                        href="https://cartesia.ai" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-[#0d6e6e] hover:underline"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6e6e]/20"
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
                            ? 'border-[#0d6e6e] bg-[#0d6e6e]/5 text-[#0d6e6e] font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {v.gender === 'Male' ? '👨' : '👩'} {v.name}
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
                  className="px-6 py-3 bg-[#0d6e6e] text-white rounded-full font-body font-medium hover:bg-[#1e6f5c] disabled:opacity-50 flex items-center gap-2"
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
                  📊 View Sample Report
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
                  <span className="text-white text-xl">🎙️</span>
                </div>
                <div>
                  <div className="font-body font-semibold text-[#1e3a5f]">VoxBharat AI</div>
                  <div className="font-body text-sm text-gray-400">
                    {isSpeaking ? '🔊 Speaking Hindi · Cartesia Sonic 3' : demoActive ? '● Live' : 'Voice Survey Demo'}
                  </div>
                </div>
                <div className="ml-auto">
                  <VoiceWave active={isSpeaking || demoActive} color={isSpeaking ? '#ff6b2c' : '#0d6e6e'} />
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
                          ? 'bg-[#0d6e6e] text-white rounded-br-md'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 text-[#1e3a5f] rounded-bl-md border'
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
                      <span className="text-4xl">📞</span>
                    </div>
                    <p>Click "Play Demo" to see a conversation</p>
                    <p className="text-sm mt-1">
                      {apiKey ? '🔊 Cartesia Sonic 3 · Hindi' : 'Add API key for voice'}
                    </p>
                  </div>
                )}

                {demoStep === 0 && demoActive && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-[#0d6e6e] font-body animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-[#0d6e6e]/10 flex items-center justify-center mb-4 animate-pulse">
                      <span className="text-3xl">📞</span>
                    </div>
                    <p className="font-medium">Calling respondent...</p>
                    <p className="text-sm text-gray-400 mt-1">Connecting in Hindi</p>
                  </div>
                )}

                {demoStep === demoConversation.length && !demoActive && callComplete && (
                  <div className="flex flex-col items-center justify-center py-6 text-[#0d6e6e] font-body">
                    <div className="w-16 h-16 rounded-full bg-[#0d6e6e]/10 flex items-center justify-center mb-3">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="font-semibold">Survey Complete!</p>
                    <p className="text-sm text-gray-500 mb-4">Response captured and analyzed</p>
                    <button
                      onClick={() => setShowTranscript(true)}
                      className="px-4 py-2 bg-[#0d6e6e] text-white rounded-lg text-sm font-medium hover:bg-[#1e6f5c] flex items-center gap-2"
                    >
                      📊 View Transcript & Summary
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
              Voice powered by <a href="https://cartesia.ai" target="_blank" rel="noopener noreferrer" className="text-[#0d6e6e] hover:underline">Cartesia Sonic 3</a> · 40ms latency · 9 Indian languages
            </span>
          </div>
        )}
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-transparent via-[#0d6e6e]/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
              Why Polls <span className="gradient-text">Get It Wrong</span>
            </h2>
            <p className="font-body text-lg text-gray-500">And how we fix it.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { problem: 'Urban sampling bias', solution: '73% rural reach via mobile', icon: '🏘️' },
              { problem: 'No caste census since 1931', solution: 'Real-time demographic weighting', icon: '📈' },
              { problem: 'Fear-based non-response', solution: 'AI builds trust in native language', icon: '🤝' },
              { problem: 'Weeks to get data', solution: 'Results in 24-48 hours', icon: '⚡' },
              { problem: '₹400/interview cost', solution: '10x cheaper at scale', icon: '💰' },
              { problem: 'Interviewer bias', solution: 'Consistent AI methodology', icon: '🎯' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-lg transition-shadow">
                <span className="text-3xl block mb-4">{item.icon}</span>
                <p className="font-body text-gray-400 line-through mb-1">{item.problem}</p>
                <p className="font-display text-xl text-[#0d6e6e] font-semibold">{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4 text-center">
            Every Language. <span className="gradient-text-teal">Every Dialect.</span>
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
                <div className="font-display text-xl text-[#0d6e6e] font-semibold">{lang.native}</div>
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
          <div className="bg-gradient-to-br from-[#ff6b2c] via-[#e85d04] to-[#d4a84b] rounded-3xl p-12 md:p-16 text-center">
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

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b2c] to-[#e85d04] flex items-center justify-center">
              <span className="text-white text-sm">🎙️</span>
            </div>
            <span className="font-display text-xl font-bold">
              <span className="gradient-text">Vox</span>Bharat
            </span>
          </div>
          <div className="font-body text-sm text-gray-400">
            © 2026 VoxBharat · Hearing every voice
          </div>
        </div>
      </footer>

      {/* Transcript & Summary Modal */}
      {showTranscript && surveyResults.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#0d6e6e] to-[#1e6f5c] text-white">
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
                        <div className="text-2xl font-bold text-[#0d6e6e]">{result.language}</div>
                        <div className="text-xs text-gray-500">Language</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-[#0d6e6e]">{Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}</div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">✓</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-[#0d6e6e]">{result.responses.length}</div>
                        <div className="text-xs text-gray-500">Questions</div>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="bg-gradient-to-br from-[#0d6e6e]/5 to-[#0d6e6e]/10 rounded-xl p-5 border border-[#0d6e6e]/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">🤖</span>
                        <h4 className="font-display text-lg font-semibold text-[#1e3a5f]">AI Summary</h4>
                      </div>
                      <p className="font-body text-gray-700 leading-relaxed">{result.summary}</p>
                    </div>

                    {/* Structured Data */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">📊</span>
                        <h4 className="font-display text-lg font-semibold text-[#1e3a5f]">Structured Data</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(result.structured).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="text-sm font-medium text-[#1e3a5f]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div className="bg-white rounded-xl border p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">💭</span>
                        <h4 className="font-display text-lg font-semibold text-[#1e3a5f]">Sentiment Analysis</h4>
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
                        <span className="text-xl">📝</span>
                        <h4 className="font-display text-lg font-semibold text-[#1e3a5f]">Full Transcript</h4>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {demoConversation.map((msg, i) => (
                          <div key={i} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl ${
                              msg.speaker === 'user'
                                ? 'bg-[#0d6e6e] text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              <div className="text-xs opacity-60 mb-1">
                                {msg.speaker === 'ai' ? '🤖 VoxBharat AI' : '👤 Respondent'}
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
                        className="flex-1 py-3 bg-[#0d6e6e] text-white rounded-xl font-medium hover:bg-[#1e6f5c] flex items-center justify-center gap-2"
                      >
                        📥 Export JSON
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
                        📄 Export CSV
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(result.summary);
                          alert('Summary copied to clipboard!');
                        }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                      >
                        📋 Copy Summary
                      </button>
                    </div>

                    {/* Sample Research Report Preview */}
                    <div className="bg-gradient-to-r from-[#ff6b2c]/10 to-[#e85d04]/10 rounded-xl p-5 border border-[#ff6b2c]/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">📊</span>
                        <h4 className="font-display text-lg font-semibold text-[#1e3a5f]">
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

      {/* Sample Research Report Modal */}
      {showSampleReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Report Header */}
            <div className="p-6 border-b bg-gradient-to-r from-[#1e3a5f] to-[#0d6e6e] text-white">
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
                <h3 className="font-display text-xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#0d6e6e]/10 flex items-center justify-center text-sm">1</span>
                  Executive Summary
                </h3>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  {sampleReportData.insights.map((insight, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#0d6e6e] mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-[#1e3a5f]">{insight.title}</div>
                        <div className="text-sm text-gray-600">{insight.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Demographics */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#0d6e6e]/10 flex items-center justify-center text-sm">2</span>
                  Sample Demographics
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#1e3a5f] mb-4">Age Distribution</h4>
                    <BarChart data={sampleReportData.demographics.byAge} labelKey="group" />
                  </div>
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#1e3a5f] mb-4">Religious Affiliation</h4>
                    <BarChart data={sampleReportData.demographics.byReligion} labelKey="group" />
                  </div>
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#1e3a5f] mb-4">Survey Language</h4>
                    <BarChart data={sampleReportData.demographics.byLanguage} labelKey="group" color="#1e6f5c" />
                  </div>
                  <div className="bg-white border rounded-xl p-5">
                    <h4 className="font-semibold text-[#1e3a5f] mb-4">Gender</h4>
                    <BarChart data={sampleReportData.demographics.byGender} labelKey="group" color="#e85d04" />
                  </div>
                </div>
              </section>

              {/* Key Findings */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#0d6e6e]/10 flex items-center justify-center text-sm">3</span>
                  Key Findings
                </h3>
                <div className="space-y-6">
                  {sampleReportData.keyFindings.map((finding, i) => (
                    <div key={i} className="bg-white border rounded-xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{finding.metric}</div>
                          <h4 className="font-semibold text-[#1e3a5f] text-lg">{finding.headline}</h4>
                        </div>
                      </div>
                      <BarChart data={finding.breakdown} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Cross-tabulations */}
              <section>
                <h3 className="font-display text-xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#0d6e6e]/10 flex items-center justify-center text-sm">4</span>
                  Cross-Tabulations
                </h3>

                {/* Age vs Interfaith Marriage */}
                <div className="bg-white border rounded-xl p-5 mb-6">
                  <h4 className="font-semibold text-[#1e3a5f] mb-4">Interfaith Marriage Acceptance by Age Group</h4>
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
                  <h4 className="font-semibold text-[#1e3a5f] mb-4">Interfaith Marriage Acceptance by Religion</h4>
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
                <h3 className="font-display text-xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#0d6e6e]/10 flex items-center justify-center text-sm">5</span>
                  Methodology
                </h3>
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {Object.entries(sampleReportData.methodology).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium text-[#1e3a5f]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* CTA */}
              <section className="bg-gradient-to-r from-[#0d6e6e] to-[#1e6f5c] rounded-xl p-6 text-white text-center">
                <h3 className="font-display text-xl font-bold mb-2">Ready to run your own voice survey?</h3>
                <p className="text-white/80 mb-4">Get results like this in days, not months. No enumerators needed.</p>
                <button
                  onClick={() => { setShowSampleReport(false); setShowBuilder(true); }}
                  className="px-6 py-3 bg-white text-[#0d6e6e] rounded-lg font-semibold hover:bg-gray-100"
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
                  className="px-3 py-1.5 text-sm bg-[#0d6e6e] text-white rounded-lg hover:bg-[#1e6f5c]"
                >
                  📥 Download Report
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
