import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const TOKEN_KEY = 'voxbharat_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function authFetch(url, opts = {}) {
  const token = getToken();
  return fetch(url, { ...opts, headers: { ...opts.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' } });
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

export default function InboundConfigForm({ onBack, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [name, setName] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [greetingText, setGreetingText] = useState('');
  const [language, setLanguage] = useState('hi');
  const [gender, setGender] = useState('female');
  const [autoDetect, setAutoDetect] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch(`${CALL_SERVER}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setProjects(Array.isArray(d) ? d : []); setLoadingProjects(false); })
      .catch(() => { setProjects([]); setLoadingProjects(false); });
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !selectedProject) {
      setError('Please provide a name and select a survey.');
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const res = await authFetch(`${CALL_SERVER}/api/inbound-configs`, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          surveyConfig: selectedProject,
          greetingText: greetingText.trim() || null,
          language,
          gender,
          autoDetectLanguage: autoDetect,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      const config = await res.json();
      onCreated(config.id);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-body text-earth-mid hover:text-saffron transition-colors mb-6 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Inbound Agents
      </button>

      <div className="bg-white border border-cream-warm rounded-xl p-8 max-w-2xl">
        <h2 className="font-display text-2xl font-bold text-earth mb-1">New Inbound Agent</h2>
        <p className="text-earth-mid text-sm font-body mb-8">
          Configure an AI voice agent to receive incoming calls on your Twilio number.
        </p>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-body font-medium text-earth mb-2">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Customer Feedback Agent"
            className="w-full px-4 py-2.5 border border-cream-warm rounded-lg font-body text-sm text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20"
          />
        </div>

        {/* Select Survey */}
        <div className="mb-6">
          <label className="block text-sm font-body font-medium text-earth mb-2">Survey</label>
          {loadingProjects ? (
            <div className="text-sm text-earth-mid font-body">Loading surveys...</div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-earth-mid font-body bg-cream-warm/50 rounded-lg p-4">
              No surveys found. Create a survey in the Survey Builder first.
            </div>
          ) : (
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {projects.map(p => (
                <button
                  key={p.project_name}
                  onClick={() => setSelectedProject(p.survey_config || { name: p.project_name, questions: [] })}
                  className={`text-left px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                    selectedProject?.name === (p.survey_config?.name || p.project_name)
                      ? 'border-saffron bg-saffron/5 text-saffron'
                      : 'border-cream-warm hover:border-saffron/30 text-earth'
                  }`}
                >
                  <span className="text-sm font-body font-medium">{p.project_name}</span>
                  <span className="text-xs text-earth-mid ml-2">({p.total_calls} calls)</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Greeting */}
        <div className="mb-6">
          <label className="block text-sm font-body font-medium text-earth mb-2">
            Custom Greeting <span className="text-earth-mid font-normal">(optional)</span>
          </label>
          <textarea
            value={greetingText}
            onChange={e => setGreetingText(e.target.value)}
            placeholder="Leave blank for the default greeting. e.g. Thank you for calling! I'm ready to help with our feedback survey..."
            rows={3}
            className="w-full px-4 py-2.5 border border-cream-warm rounded-lg font-body text-sm text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 resize-none"
          />
        </div>

        {/* Language & Gender */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-body font-medium text-earth mb-2">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              disabled={autoDetect}
              className="w-full px-4 py-2.5 border border-cream-warm rounded-lg font-body text-sm text-earth focus:outline-none focus:border-saffron/50 cursor-pointer disabled:opacity-50"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-body font-medium text-earth mb-2">Voice</label>
            <div className="flex gap-2">
              {['female', 'male'].map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-body capitalize transition-all cursor-pointer ${
                    gender === g
                      ? 'border-saffron bg-saffron/5 text-saffron font-medium'
                      : 'border-cream-warm text-earth-mid hover:border-saffron/30'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-detect toggle */}
        <div className="mb-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={e => setAutoDetect(e.target.checked)}
              className="w-4 h-4 rounded border-cream-warm text-saffron focus:ring-saffron/20 cursor-pointer"
            />
            <span className="text-sm font-body text-earth">
              Auto-detect language <span className="text-earth-mid">(greet in English, switch to caller's language)</span>
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-body">
            {error}
          </div>
        )}

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim() || !selectedProject}
          className="w-full py-3 bg-saffron text-white rounded-lg font-body font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Inbound Agent'}
        </button>
      </div>
    </motion.div>
  );
}
