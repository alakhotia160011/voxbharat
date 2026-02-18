import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BarChart from '../shared/BarChart';
import { fadeInUp, staggerContainer } from '../../styles/animations';
import CampaignList from '../campaigns/CampaignList';
import CampaignDetail from '../campaigns/CampaignDetail';
import NewCampaignFlow from '../campaigns/NewCampaignFlow';
import InboundList from '../inbound/InboundList';
import InboundDetail from '../inbound/InboundDetail';
import InboundConfigForm from '../inbound/InboundConfigForm';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const TOKEN_KEY = 'voxbharat_token';
const sectionNumerals = ['१', '२', '३'];

// ─── Auth helpers ───────────────────────────────────────────

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(r => {
    if (r.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('voxbharat-logout'));
    }
    return r;
  });
}

// ─── Shared UI ──────────────────────────────────────────────

function sentimentBadge(value) {
  const v = (value || '').toLowerCase();
  if (v === 'positive' || v === 'high') return 'bg-green-100 text-green-700';
  if (v === 'neutral' || v === 'medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function SectionTitle({ numeral, title }) {
  return (
    <h3 className="font-display text-lg font-bold text-earth mb-3 flex items-center gap-3">
      <span className="text-xl font-serif-indic text-gold leading-none">{numeral}</span>
      <div className="flex-1 h-px bg-gold/30" />
      <span className="text-sm font-body text-earth-mid font-normal">{title}</span>
    </h3>
  );
}

function formatDuration(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatMinutes(sec) {
  if (!sec) return '0';
  return Math.round(sec / 60).toLocaleString();
}

function EmptyState({ title, subtitle, onAction, actionLabel }) {
  return (
    <div className="bg-white border border-cream-warm rounded-xl py-16 px-8 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-saffron/10 to-gold/10 flex items-center justify-center">
        <div className="w-8 h-0.5 bg-gold/40 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gold/40" />
        </div>
      </div>
      <h3 className="font-display text-xl font-bold text-earth mb-2">{title}</h3>
      <p className="text-earth-mid text-sm max-w-md mx-auto">{subtitle}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white border border-cream-warm rounded-xl p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent || 'bg-saffron'}`} />
      <div className="text-2xl font-display font-bold text-earth">{value}</div>
      <div className="text-xs font-body text-earth-mid mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function Spinner({ text }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
        <span className="text-sm font-body text-earth-mid">{text}</span>
      </div>
    </div>
  );
}

function BackButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 font-body text-sm text-earth-mid hover:text-saffron transition-colors cursor-pointer group"
    >
      <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// Login Screen
// ═══════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'signup' ? '/api/signup' : '/api/login';
    const body = mode === 'signup'
      ? { email, password, name: name.trim() || undefined }
      : { email, password };

    try {
      const res = await fetch(`${CALL_SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `${mode === 'signup' ? 'Signup' : 'Login'} failed`);
        setLoading(false);
        return;
      }

      const { token } = await res.json();
      setToken(token);
      onLogin();
    } catch {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-cream-warm rounded-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-earth">
            {isSignup ? 'Create Account' : 'Dashboard Login'}
          </h2>
          <p className="text-earth-mid text-sm font-body mt-1">
            {isSignup ? 'Sign up to access the dashboard' : 'Sign in to view survey data'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                placeholder="Your name (optional)"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
              placeholder={isSignup ? 'Min 8 characters' : 'Enter password'}
            />
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading
              ? (isSignup ? 'Creating account\u2026' : 'Signing in\u2026')
              : (isSignup ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            className="text-sm font-body text-earth-mid hover:text-saffron transition-colors cursor-pointer"
          >
            {isSignup
              ? 'Already have an account? Sign in'
              : "Don\u2019t have an account? Sign up"
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LEVEL 1: Projects List
// ═══════════════════════════════════════════════════════════

function ProjectsList({ projects, onSelect, onRefresh, loading, setShowBuilder }) {
  const totalCalls = projects.reduce((sum, p) => sum + parseInt(p.call_count, 10), 0);
  const totalMinutes = projects.reduce((sum, p) => sum + (parseInt(p.total_duration, 10) || 0), 0);
  const allLanguages = [...new Set(projects.flatMap(p => p.languages || []))];

  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Survey Projects" value={projects.length} accent="bg-saffron" />
        <StatCard label="Total Calls" value={totalCalls} accent="bg-gold" />
        <StatCard label="Minutes Spoken" value={formatMinutes(totalMinutes)} accent="bg-indigo" />
        <StatCard label="Languages" value={allLanguages.length} accent="bg-earth" />
      </div>

      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <SectionTitle numeral={sectionNumerals[0]} title="Survey Projects" />
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-body border border-cream-warm text-earth-mid rounded-lg hover:bg-cream-warm transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0 ml-4"
        >
          {loading ? 'Loading\u2026' : 'Refresh'}
        </button>
      </motion.div>

      {/* Project cards or empty state */}
      {projects.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            title="No surveys yet"
            subtitle="Once you run voice surveys, your projects will appear here with transcripts, analytics, and recordings."
            onAction={setShowBuilder ? () => setShowBuilder(true) : null}
            actionLabel="Create Your First Survey"
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp} className="grid gap-4">
          {projects.map((project, idx) => (
            <motion.div
              key={project.project_name}
              onClick={() => onSelect(project.project_name)}
              className="bg-white border border-cream-warm rounded-xl p-6 cursor-pointer hover:border-saffron/30 hover:shadow-sm transition-all group"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-bold text-earth group-hover:text-saffron transition-colors truncate">
                    {project.project_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm font-body text-earth-mid">
                    <div>
                      <span className="font-medium text-earth">{project.call_count}</span>
                      <span className="ml-1">{parseInt(project.call_count, 10) === 1 ? 'respondent' : 'respondents'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-earth">{formatMinutes(project.total_duration)}</span>
                      <span className="ml-1">min spoken</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(project.languages || []).map(lang => (
                        <span key={lang} className="px-2 py-0.5 rounded-full text-xs bg-saffron/8 text-saffron font-medium border border-saffron/15">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  {project.last_call && (
                    <div className="text-xs text-earth-mid/60 mt-2 font-body">
                      Last call: {new Date(project.last_call).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
                <div className="text-earth-mid/40 group-hover:text-saffron transition-colors ml-4 mt-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// LEVEL 2: Project Dashboard (Analytics + Call List)
// ═══════════════════════════════════════════════════════════

function ProjectDashboard({ projectName, onBack, onSelectCall }) {
  const [calls, setCalls] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(projectName)}/calls`).then(r => r.ok ? r.json() : []),
      authFetch(`${CALL_SERVER}/api/projects/${encodeURIComponent(projectName)}/analytics`).then(r => r.ok ? r.json() : null),
    ])
      .then(([callsData, analyticsData]) => {
        setCalls(Array.isArray(callsData) ? callsData : []);
        setAnalytics(analyticsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectName]);

  if (loading) return <Spinner text="Loading project data" />;

  const totalCalls = analytics?.totalCalls || calls.length;
  const avgDuration = analytics?.avgDuration || 0;
  const totalDuration = analytics?.totalDuration || 0;
  const languages = (analytics?.byLanguage || []).map(r => r.language).filter(Boolean);

  const langData = (analytics?.byLanguage || []).map(r => ({
    label: r.language || 'Unknown',
    pct: totalCalls > 0 ? Math.round((parseInt(r.count, 10) / totalCalls) * 100) : 0,
  }));

  const religionData = (analytics?.byReligion || []).map(r => ({
    label: r.religion || 'Unknown',
    pct: totalCalls > 0 ? Math.round((parseInt(r.count, 10) / totalCalls) * 100) : 0,
  }));

  const ageData = (analytics?.byAgeGroup || []).map(r => ({
    label: r.age_group || 'Unknown',
    pct: totalCalls > 0 ? Math.round((parseInt(r.count, 10) / totalCalls) * 100) : 0,
  }));

  const sentimentData = (analytics?.sentimentBreakdown || []).map(r => ({
    label: r.overall || 'Unknown',
    pct: totalCalls > 0 ? Math.round((parseInt(r.count, 10) / totalCalls) * 100) : 0,
  }));

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <BackButton onClick={onBack} label="All Projects" />

      {/* Project header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-earth">{projectName}</h2>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {languages.map(lang => (
            <span key={lang} className="px-2.5 py-1 rounded-full text-xs bg-saffron/8 text-saffron font-medium border border-saffron/15">
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Respondents" value={totalCalls} accent="bg-saffron" />
        <StatCard label="Avg Duration" value={formatDuration(avgDuration)} accent="bg-gold" />
        <StatCard label="Total Minutes" value={formatMinutes(totalDuration)} accent="bg-indigo" />
        <StatCard label="Languages" value={languages.length} accent="bg-earth" />
      </motion.div>

      {/* Analytics charts */}
      {(langData.length > 0 || religionData.length > 0 || ageData.length > 0 || sentimentData.length > 0) && (
        <div>
          <SectionTitle numeral={sectionNumerals[0]} title="Analytics" />
          <div className="grid md:grid-cols-2 gap-4">
            {langData.length > 0 && (
              <div className="bg-white border border-cream-warm rounded-xl p-5">
                <h4 className="font-semibold text-earth mb-4 font-body text-sm">By Language</h4>
                <BarChart data={langData} />
              </div>
            )}
            {religionData.length > 0 && (
              <div className="bg-white border border-cream-warm rounded-xl p-5">
                <h4 className="font-semibold text-earth mb-4 font-body text-sm">By Religion</h4>
                <BarChart data={religionData} color="#c4a04a" />
              </div>
            )}
            {ageData.length > 0 && (
              <div className="bg-white border border-cream-warm rounded-xl p-5">
                <h4 className="font-semibold text-earth mb-4 font-body text-sm">By Age Group</h4>
                <BarChart data={ageData} color="#c24a0e" />
              </div>
            )}
            {sentimentData.length > 0 && (
              <div className="bg-white border border-cream-warm rounded-xl p-5">
                <h4 className="font-semibold text-earth mb-4 font-body text-sm">Overall Sentiment</h4>
                <BarChart data={sentimentData} color="#2d3a6e" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle numeral={sectionNumerals[1]} title="Individual Calls" />
          {calls.length > 0 && (
            <button
              onClick={() => {
                authFetch(`${CALL_SERVER}/api/export/csv`)
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'voxbharat-export.csv'; a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
              className="px-3 py-1.5 text-sm font-body bg-saffron text-white rounded-lg hover:bg-saffron-deep transition-colors cursor-pointer flex-shrink-0 ml-4"
            >
              Export CSV
            </button>
          )}
        </div>

        {calls.length === 0 ? (
          <EmptyState
            title="No calls yet"
            subtitle="Completed calls for this project will appear here."
          />
        ) : (
          <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-cream-warm">
                    <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Language</th>
                    <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Duration</th>
                    <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call, idx) => (
                    <motion.tr
                      key={call.id}
                      onClick={() => onSelectCall(call.id)}
                      className="border-b border-cream-warm/60 last:border-0 hover:bg-saffron/[0.03] cursor-pointer transition-colors group"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.25 }}
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap text-earth-mid">
                        {new Date(call.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-saffron/8 text-saffron font-medium border border-saffron/15">
                          {call.language || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-earth-mid whitespace-nowrap">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="py-3.5 px-5 text-earth-mid max-w-xs">
                        <span className="line-clamp-1 group-hover:text-saffron transition-colors">
                          {call.summary || '-'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// LEVEL 3: Call Detail
// ═══════════════════════════════════════════════════════════

function CallDetail({ callId, onBack, projectName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch(`${CALL_SERVER}/api/surveys/${callId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [callId]);

  if (loading) return <Spinner text="Loading call details" />;

  if (!data) {
    return (
      <div className="py-24">
        <EmptyState
          title="Call not found"
          subtitle="This call may have been deleted or the ID is invalid."
          onAction={onBack}
          actionLabel="Back to Project"
        />
      </div>
    );
  }

  const duration = data.duration || 0;
  const transcript = data.transcript || [];
  const demographics = data.demographics || {};
  const structured = data.structured || {};
  const sentiment = data.sentiment || {};
  const summary = data.summary || '';

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <BackButton onClick={onBack} label={projectName} />

      {/* Header */}
      <div className="rounded-2xl overflow-hidden border border-cream-warm">
        <div className="p-6 bg-gradient-to-r from-earth to-saffron text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 mb-1 font-body">Call Log</div>
              <h2 className="font-display text-2xl font-bold">
                {data.custom_survey?.name || 'AI Voice Survey'}
              </h2>
            </div>
            <div className="flex gap-2">
              {data.recording_url && (
                <a
                  href={data.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg text-sm font-body hover:bg-white/25 transition-colors border border-white/10"
                >
                  <span className="w-3 h-3 rounded-full bg-white/80 flex items-center justify-center">
                    <span className="w-0 h-0 border-l-[5px] border-l-earth border-y-[3px] border-y-transparent ml-0.5" />
                  </span>
                  Recording
                </a>
              )}
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `voxbharat-call-${data.id.slice(0, 8)}.json`; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg text-sm font-body hover:bg-white/25 transition-colors border border-white/10 cursor-pointer"
              >
                Export JSON
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-8 mt-5 pt-4 border-t border-white/20 text-sm">
            <div>
              <div className="text-lg font-bold font-display">{formatDuration(duration)}</div>
              <div className="text-xs text-white/50 font-body">Duration</div>
            </div>
            <div>
              <div className="text-lg font-bold font-display capitalize">{data.language || '-'}</div>
              <div className="text-xs text-white/50 font-body">Language</div>
            </div>
            <div>
              <div className="text-lg font-bold font-display capitalize">{data.status || '-'}</div>
              <div className="text-xs text-white/50 font-body">Status</div>
            </div>
            {data.phone_number && (
              <div>
                <div className="text-lg font-bold font-display">{data.phone_number}</div>
                <div className="text-xs text-white/50 font-body">Phone</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <section>
          <SectionTitle numeral={sectionNumerals[0]} title="AI Summary" />
          <div className="bg-cream-warm border border-gold/15 rounded-xl p-5 text-sm text-earth-mid italic font-body leading-relaxed">
            &ldquo;{summary}&rdquo;
          </div>
        </section>
      )}

      {/* Conversation Transcript */}
      {transcript.length > 0 && (
        <section>
          <SectionTitle numeral={sectionNumerals[1]} title="Conversation Transcript" />
          <div className="bg-cream-warm rounded-xl p-4 space-y-3 max-h-[28rem] overflow-y-auto">
            {transcript.map((msg, i) => (
              <motion.div
                key={i}
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                initial={{ opacity: 0, x: msg.role === 'assistant' ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-body ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-cream-warm text-earth rounded-bl-md shadow-sm'
                    : 'bg-saffron text-white rounded-br-md'
                }`}>
                  <div className="text-[10px] uppercase tracking-wider mb-1 opacity-50 font-medium">
                    {msg.role === 'assistant' ? 'AI Interviewer' : 'Respondent'}
                  </div>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Extracted Data */}
      <section>
        <SectionTitle numeral={sectionNumerals[2]} title="Extracted Structured Data" />
        <div className="grid md:grid-cols-2 gap-4">
          {Object.keys(demographics).length > 0 && (
            <div className="bg-white border border-cream-warm rounded-xl p-4">
              <h4 className="font-semibold text-earth mb-3 text-xs uppercase tracking-wider font-body">Demographics</h4>
              <div className="space-y-0 text-sm font-body">
                {Object.entries(demographics).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-cream-warm/60 last:border-0">
                    <span className="text-earth-mid capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium text-earth">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(sentiment).length > 0 && (
            <div className="bg-white border border-cream-warm rounded-xl p-4">
              <h4 className="font-semibold text-earth mb-3 text-xs uppercase tracking-wider font-body">Sentiment Analysis</h4>
              <div className="space-y-0 text-sm font-body">
                {Object.entries(sentiment).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-cream-warm/60 last:border-0">
                    <span className="text-earth-mid capitalize">{key}</span>
                    <span className={`font-medium px-2.5 py-0.5 rounded-full text-xs ${sentimentBadge(value)}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {Object.keys(structured).length > 0 && (
          <div className="bg-white border border-cream-warm rounded-xl p-4 mt-4">
            <h4 className="font-semibold text-earth mb-3 text-xs uppercase tracking-wider font-body">Survey Responses</h4>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-0 text-sm font-body">
              {Object.entries(structured).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-cream-warm/60">
                  <span className="text-earth-mid">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                  <span className="font-medium text-earth">{value !== null ? String(value).replace(/_/g, ' ') : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="flex items-center justify-between py-4 border-t border-cream-warm">
        <div className="text-xs font-body text-earth-mid/50">
          Call ID: {data.id} &middot; {new Date(data.started_at || data.created_at).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Dashboard (with auth gate)
// ═══════════════════════════════════════════════════════════

export default function DashboardPage({ setShowBuilder }) {
  const [authed, setAuthed] = useState(!!getToken());
  const [checkingAuth, setCheckingAuth] = useState(!!getToken());
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCallId, setSelectedCallId] = useState(null);

  // Campaign state
  const [activeTab, setActiveTab] = useState('projects');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  // Inbound state
  const [inboundConfigs, setInboundConfigs] = useState([]);
  const [inboundLoading, setInboundLoading] = useState(false);
  const [selectedInboundId, setSelectedInboundId] = useState(null);
  const [showNewInbound, setShowNewInbound] = useState(false);

  // Listen for forced logout (401 from any authFetch)
  useEffect(() => {
    const handleLogout = () => { setAuthed(false); setSelectedProject(null); setSelectedCallId(null); };
    window.addEventListener('voxbharat-logout', handleLogout);
    return () => window.removeEventListener('voxbharat-logout', handleLogout);
  }, []);

  // Verify existing token on mount
  useEffect(() => {
    if (!getToken()) { setCheckingAuth(false); return; }
    authFetch(`${CALL_SERVER}/api/me`)
      .then(r => {
        if (r.ok) { setAuthed(true); } else { clearToken(); setAuthed(false); }
        setCheckingAuth(false);
      })
      .catch(() => { clearToken(); setAuthed(false); setCheckingAuth(false); });
  }, []);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    authFetch(`${CALL_SERVER}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setProjects([]); setLoading(false); });
  }, []);

  const fetchCampaigns = useCallback(() => {
    setCampaignsLoading(true);
    authFetch(`${CALL_SERVER}/api/campaigns`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setCampaigns(Array.isArray(d) ? d : []); setCampaignsLoading(false); })
      .catch(() => { setCampaigns([]); setCampaignsLoading(false); });
  }, []);

  const fetchInboundConfigs = useCallback(() => {
    setInboundLoading(true);
    authFetch(`${CALL_SERVER}/api/inbound-configs`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setInboundConfigs(Array.isArray(d) ? d : []); setInboundLoading(false); })
      .catch(() => { setInboundConfigs([]); setInboundLoading(false); });
  }, []);

  // Fetch projects + campaigns + inbound configs once authenticated
  useEffect(() => {
    if (authed && !checkingAuth) {
      fetchProjects();
      fetchCampaigns();
      fetchInboundConfigs();
    }
  }, [authed, checkingAuth, fetchProjects, fetchCampaigns, fetchInboundConfigs]);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setProjects([]);
    setSelectedProject(null);
    setSelectedCallId(null);
    setCampaigns([]);
    setSelectedCampaignId(null);
    setShowNewCampaign(false);
    setInboundConfigs([]);
    setSelectedInboundId(null);
    setShowNewInbound(false);
  };

  // Checking saved token
  if (checkingAuth) {
    return <Spinner text="Verifying session" />;
  }

  // Not authenticated — show login
  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  // Inbound: New Config Form
  if (showNewInbound) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <InboundConfigForm
          onBack={() => setShowNewInbound(false)}
          onCreated={(id) => {
            setShowNewInbound(false);
            setSelectedInboundId(id);
            fetchInboundConfigs();
          }}
        />
      </div>
    );
  }

  // Inbound: Detail View
  if (selectedInboundId) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <InboundDetail
          configId={selectedInboundId}
          onBack={() => { setSelectedInboundId(null); fetchInboundConfigs(); }}
        />
      </div>
    );
  }

  // Campaign: New Campaign Flow
  if (showNewCampaign) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <NewCampaignFlow
          onBack={() => setShowNewCampaign(false)}
          onCreated={(id) => {
            setShowNewCampaign(false);
            setSelectedCampaignId(id);
            fetchCampaigns();
          }}
        />
      </div>
    );
  }

  // Campaign: Detail View
  if (selectedCampaignId) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <CampaignDetail
          campaignId={selectedCampaignId}
          onBack={() => { setSelectedCampaignId(null); fetchCampaigns(); }}
        />
      </div>
    );
  }

  // Level 3: Call Detail
  if (selectedCallId) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <CallDetail
          callId={selectedCallId}
          projectName={selectedProject}
          onBack={() => setSelectedCallId(null)}
        />
      </div>
    );
  }

  // Level 2: Project Dashboard
  if (selectedProject) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <ProjectDashboard
          projectName={selectedProject}
          onBack={() => setSelectedProject(null)}
          onSelectCall={setSelectedCallId}
        />
      </div>
    );
  }

  // Level 1: Projects / Campaigns tabs
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-earth">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-body text-earth-mid border border-cream-warm rounded-lg hover:bg-cream-warm hover:text-earth transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
        <p className="text-earth-mid font-body text-sm ml-4 pl-px mt-2">
          Survey projects, call analytics, transcripts, and recordings.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-8 mb-8 border-b border-cream-warm">
        {[
          { key: 'projects', label: 'Projects', desc: 'Analytics & results' },
          { key: 'campaigns', label: 'Campaigns', desc: 'Batch calling' },
          { key: 'inbound', label: 'Inbound', desc: 'Receive calls' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-left transition-colors cursor-pointer relative ${
              activeTab === tab.key
                ? 'text-saffron'
                : 'text-earth-mid hover:text-earth'
            }`}
          >
            <span className="text-sm font-body font-medium">{tab.label}</span>
            <span className={`block text-[11px] font-body mt-0.5 ${activeTab === tab.key ? 'text-saffron/60' : 'text-earth-mid/50'}`}>{tab.desc}</span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="dashboard-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'projects' && (
          loading ? (
            <Spinner text="Loading projects" />
          ) : (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ProjectsList
                projects={projects}
                loading={loading}
                onSelect={setSelectedProject}
                onRefresh={fetchProjects}
                setShowBuilder={setShowBuilder}
              />
            </motion.div>
          )
        )}
        {activeTab === 'campaigns' && (
          campaignsLoading && campaigns.length === 0 ? (
            <Spinner text="Loading campaigns" />
          ) : (
            <motion.div
              key="campaigns"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CampaignList
                campaigns={campaigns}
                loading={campaignsLoading}
                onSelect={setSelectedCampaignId}
                onNewCampaign={() => setShowNewCampaign(true)}
                onRefresh={fetchCampaigns}
              />
            </motion.div>
          )
        )}
        {activeTab === 'inbound' && (
          inboundLoading && inboundConfigs.length === 0 ? (
            <Spinner text="Loading inbound agents" />
          ) : (
            <motion.div
              key="inbound"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <InboundList
                configs={inboundConfigs}
                loading={inboundLoading}
                onSelect={setSelectedInboundId}
                onNewConfig={() => setShowNewInbound(true)}
                onRefresh={fetchInboundConfigs}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
