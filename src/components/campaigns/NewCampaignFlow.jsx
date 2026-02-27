import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const TOKEN_KEY = 'voxbharat_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function authFetch(url, opts = {}) {
  const token = getToken();
  return fetch(url, { ...opts, headers: { ...opts.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

const LANGUAGES = [
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'en', label: 'English' },
];

const stepSlide = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

function parsePhoneNumbers(raw) {
  const lines = raw.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
  const valid = [];
  const invalid = [];

  for (const line of lines) {
    let num = line.replace(/[\s\-().]/g, '');
    // If just 10 digits starting with 6-9, assume Indian mobile
    if (/^[6-9]\d{9}$/.test(num)) {
      num = '+91' + num;
    }
    // Accept E.164: + followed by 8-15 digits
    if (/^\+\d{8,15}$/.test(num)) {
      valid.push(num);
    } else {
      invalid.push(line);
    }
  }

  // Deduplicate
  const unique = [...new Set(valid)];
  return { valid: unique, invalid, duplicatesRemoved: valid.length - unique.length };
}

export default function NewCampaignFlow({ onBack, onCreated }) {
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Step 1
  const [campaignName, setCampaignName] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [surveyConfig, setSurveyConfig] = useState(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  // Step 2
  const [phoneInput, setPhoneInput] = useState('');
  const [parsedNumbers, setParsedNumbers] = useState({ valid: [], invalid: [], duplicatesRemoved: 0 });
  const fileInputRef = useRef(null);

  // Step 3
  const [concurrency, setConcurrency] = useState(2);
  const [language, setLanguage] = useState('hi');
  const [gender, setGender] = useState('female');
  const [autoDetect, setAutoDetect] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);
  const [callTiming, setCallTiming] = useState(['morning', 'afternoon', 'evening']);

  // Step 4
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Fetch projects on mount
  useEffect(() => {
    authFetch(`${CALL_SERVER}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setProjects(Array.isArray(d) ? d : []); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
  }, []);

  // Parse phone numbers whenever input changes
  useEffect(() => {
    if (phoneInput.trim()) {
      setParsedNumbers(parsePhoneNumbers(phoneInput));
    } else {
      setParsedNumbers({ valid: [], invalid: [], duplicatesRemoved: 0 });
    }
  }, [phoneInput]);

  const handleSelectProject = async (project) => {
    setSelectedProject(project.project_name);
    setCampaignName(prev => prev || project.project_name + ' Campaign');
    setLoadingSurvey(true);

    try {
      const res = await authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(project.project_name)}/calls`);
      const calls = await res.json();
      if (calls.length > 0) {
        // Fetch first call detail to get custom_survey
        const detail = await authFetch(`${CALL_SERVER}/api/surveys/${calls[0].id}`).then(r => r.json());
        const cfg = detail.custom_survey || null;
        setSurveyConfig(cfg);
        // Initialize retry/timing from survey config
        if (cfg?.retryPolicy) setMaxRetries(cfg.retryPolicy);
        if (cfg?.callTiming?.length) setCallTiming(cfg.callTiming);
      }
    } catch { /* ignore */ }
    setLoadingSurvey(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setPhoneInput(prev => prev ? prev + '\n' + text : text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');

    try {
      const res = await authFetch(`${CALL_SERVER}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          surveyConfig,
          phoneNumbers: parsedNumbers.valid,
          language,
          gender,
          autoDetectLanguage: autoDetect,
          concurrency,
          maxRetries,
          callTiming,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create campaign');
      }

      const { id } = await res.json();
      onCreated(id);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const STEPS = ['Select Survey', 'Phone Numbers', 'Settings', 'Review'];

  const canProceed = () => {
    if (step === 1) return selectedProject && campaignName.trim();
    if (step === 2) return parsedNumbers.valid.length > 0;
    if (step === 3) return true;
    return true;
  };

  const inputClass = 'w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors';
  const labelClass = 'block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5';

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-body text-sm text-earth-mid hover:text-saffron transition-colors cursor-pointer group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
        Campaigns
      </button>

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-earth">New Campaign</h2>
        <p className="text-earth-mid font-body text-sm mt-1">Deploy your survey at scale.</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white border border-cream-warm rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i + 1 < step && setStep(i + 1)}
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
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-saffron' : 'bg-cream-warm'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" variants={stepSlide} initial="enter" animate="center" exit="exit" className="space-y-5">
            <div>
              <label className={labelClass}>Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. Delhi Urban Survey - Batch 1"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Select a Survey Project</label>
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="bg-cream-warm rounded-xl p-6 text-center">
                  <p className="text-earth-mid text-sm font-body">No survey projects found. Create and test a survey first.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {projects.map(project => (
                    <button
                      key={project.project_name}
                      onClick={() => handleSelectProject(project)}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedProject === project.project_name
                          ? 'border-saffron bg-saffron/5 shadow-sm'
                          : 'border-cream-warm bg-white hover:border-saffron/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-display font-bold text-earth text-base">{project.project_name}</div>
                          <div className="flex items-center gap-4 mt-1 text-xs font-body text-earth-mid">
                            <span>{project.call_count} {parseInt(project.call_count, 10) === 1 ? 'call' : 'calls'}</span>
                            {(project.languages || []).map(lang => (
                              <span key={lang} className="px-2 py-0.5 rounded-full bg-saffron/8 text-saffron font-medium border border-saffron/15">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                        {selectedProject === project.project_name && (
                          <div className="w-6 h-6 rounded-full bg-saffron flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {loadingSurvey && (
                <div className="flex items-center gap-2 mt-2 text-xs font-body text-earth-mid">
                  <div className="w-3 h-3 border border-saffron/30 border-t-saffron rounded-full animate-spin" />
                  Loading survey configuration...
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" variants={stepSlide} initial="enter" animate="center" exit="exit" className="space-y-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-earth mb-1">Add Phone Numbers</h3>
              <p className="text-earth-mid text-sm font-body">Enter one phone number per line. Indian 10-digit numbers will be auto-prefixed with +91.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Phone Numbers</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-body text-saffron hover:text-saffron-deep transition-colors cursor-pointer"
                >
                  Upload CSV/TXT
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
              </div>
              <textarea
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder={"+919876543210\n9876543211\n+919876543212"}
                rows={10}
                className={inputClass + ' font-mono resize-y'}
              />
            </div>

            {phoneInput.trim() && (
              <div className="bg-white border border-cream-warm rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-4 text-sm font-body">
                  <span className="text-green-700 font-medium">{parsedNumbers.valid.length} valid</span>
                  {parsedNumbers.invalid.length > 0 && (
                    <span className="text-red-500 font-medium">{parsedNumbers.invalid.length} invalid</span>
                  )}
                  {parsedNumbers.duplicatesRemoved > 0 && (
                    <span className="text-earth-mid">{parsedNumbers.duplicatesRemoved} duplicates removed</span>
                  )}
                </div>
                {parsedNumbers.invalid.length > 0 && (
                  <div className="text-xs font-body text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    Invalid: {parsedNumbers.invalid.join(', ')}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" variants={stepSlide} initial="enter" animate="center" exit="exit" className="space-y-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-earth mb-1">Campaign Settings</h3>
              <p className="text-earth-mid text-sm font-body">Configure how calls are placed.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Concurrency</label>
                <div className="flex gap-3">
                  {[1, 2].map(n => (
                    <button
                      key={n}
                      onClick={() => setConcurrency(n)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-body font-medium transition-all cursor-pointer ${
                        concurrency === n
                          ? 'border-saffron bg-saffron/5 text-saffron'
                          : 'border-cream-warm bg-white text-earth-mid hover:border-saffron/30'
                      }`}
                    >
                      {n} call{n > 1 ? 's' : ''} at a time
                    </button>
                  ))}
                </div>
                <p className="text-xs text-earth-mid/60 font-body mt-1.5">Max 2 simultaneous calls (TTS provider limit).</p>
              </div>

              <div>
                <label className={labelClass}>Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className={inputClass + ' cursor-pointer'}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Voice Gender</label>
                <div className="flex gap-3">
                  {['female', 'male'].map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-body font-medium capitalize transition-all cursor-pointer ${
                        gender === g
                          ? 'border-saffron bg-saffron/5 text-saffron'
                          : 'border-cream-warm bg-white text-earth-mid hover:border-saffron/30'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Auto-Detect Language</label>
                <button
                  onClick={() => setAutoDetect(!autoDetect)}
                  className={`w-full py-3 rounded-xl border text-sm font-body font-medium transition-all cursor-pointer ${
                    autoDetect
                      ? 'border-saffron bg-saffron/5 text-saffron'
                      : 'border-cream-warm bg-white text-earth-mid hover:border-saffron/30'
                  }`}
                >
                  {autoDetect ? 'Enabled: agent will detect and switch' : 'Disabled: use selected language'}
                </button>
              </div>
            </div>

            {/* Call Timing */}
            <div>
              <label className={labelClass}>Call Timing (IST)</label>
              <p className="text-xs text-earth-mid/60 font-body mb-2">When should calls be placed? Retries get a random time within the selected windows.</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'morning', label: 'Morning (8am–12pm)' },
                  { id: 'afternoon', label: 'Afternoon (12pm–5pm)' },
                  { id: 'evening', label: 'Evening (5pm–9pm)' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const next = callTiming.includes(t.id)
                        ? callTiming.filter(x => x !== t.id)
                        : [...callTiming, t.id];
                      if (next.length > 0) setCallTiming(next);
                    }}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-body font-medium transition-all cursor-pointer ${
                      callTiming.includes(t.id)
                        ? 'border-saffron bg-saffron/5 text-saffron'
                        : 'border-cream-warm bg-white text-earth-mid hover:border-saffron/30'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Retry Policy */}
            <div>
              <label className={labelClass}>Retry Policy</label>
              <p className="text-xs text-earth-mid/60 font-body mb-2">How many times to retry if no answer, voicemail, or failure?</p>
              <div className="flex gap-3">
                {[1, 2, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setMaxRetries(n)}
                    className={`w-14 py-3 rounded-xl border text-sm font-body font-medium transition-all cursor-pointer ${
                      maxRetries === n
                        ? 'border-saffron bg-saffron/5 text-saffron'
                        : 'border-cream-warm bg-white text-earth-mid hover:border-saffron/30'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" variants={stepSlide} initial="enter" animate="center" exit="exit" className="space-y-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-earth mb-1">Review Campaign</h3>
              <p className="text-earth-mid text-sm font-body">Confirm everything looks good before launching.</p>
            </div>

            <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Campaign Name</span>
                  <span className="text-sm font-body font-medium text-earth">{campaignName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Survey</span>
                  <span className="text-sm font-body font-medium text-earth">{selectedProject}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Phone Numbers</span>
                  <span className="text-sm font-body font-medium text-earth">{parsedNumbers.valid.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Concurrency</span>
                  <span className="text-sm font-body font-medium text-earth">{concurrency} simultaneous call{concurrency > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Language</span>
                  <span className="text-sm font-body font-medium text-earth capitalize">
                    {LANGUAGES.find(l => l.code === language)?.label || language}
                    {autoDetect && ' (auto-detect)'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Voice</span>
                  <span className="text-sm font-body font-medium text-earth capitalize">{gender}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-sm font-body text-earth-mid">Call Window</span>
                  <span className="text-sm font-body font-medium text-earth capitalize">
                    {callTiming.join(', ')} IST
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm font-body text-earth-mid">Retries</span>
                  <span className="text-sm font-body font-medium text-earth">{maxRetries}x per number</span>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-body text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-2">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="px-6 py-2.5 border border-cream-warm rounded-lg font-body text-sm text-earth-mid hover:bg-cream-warm transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-60"
          >
            {creating ? 'Creating\u2026' : 'Create Campaign'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
