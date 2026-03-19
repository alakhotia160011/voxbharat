import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../../utils/auth';
import { CALL_SERVER } from '../../utils/config';
import { api } from '../../lib/api';
import BarChart from '../../components/shared/BarChart';
import { generateCallPDF, generateProjectPDF } from '../../utils/pdfExport';
import { fadeInUp, staggerContainer } from '../../styles/animations';

const FullSurveyBuilder = lazy(() => import('../../components/survey-builder/FullSurveyBuilder'));

const CALLS_PER_PAGE = 25;

// Built-in survey question map (for legacy calls without custom_survey)
const BUILTIN_QUESTIONS = [
  { field: 'age', camel: 'age', text: 'What is your age?' },
  { field: 'religion', camel: 'religion', text: 'What religion do you follow?' },
  { field: 'religion_importance', camel: 'religionImportance', text: 'How important is religion in your daily life?' },
  { field: 'prayer_frequency', camel: 'prayerFrequency', text: 'How often do you pray or worship?' },
  { field: 'religious_freedom', camel: 'religiousFreedom', text: 'Do people of all religions have freedom to practice?' },
  { field: 'interfaith_neighbor', camel: 'interfaithNeighbor', text: "How would you feel if another religion's family moved nearby?" },
  { field: 'interfaith_marriage', camel: 'interfaithMarriage', text: 'What is your opinion on inter-faith marriage?' },
  { field: 'diversity_opinion', camel: 'diversityOpinion', text: 'Does religious diversity make India better or more challenging?' },
];

function deriveFieldName(textEn) {
  return textEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 40);
}

function buildQuestionAnswerPairs(callData) {
  const pairs = [];
  if (callData.custom_survey?.questions) {
    for (const q of callData.custom_survey.questions) {
      const fieldName = q.textEn ? deriveFieldName(q.textEn) : `question_${q.id}`;
      const answer = callData.responses?.[fieldName] ?? null;
      pairs.push({ question: q.textEn || q.text, questionOriginal: q.text !== q.textEn ? q.text : null, answer });
    }
  } else if (callData.structured) {
    for (const q of BUILTIN_QUESTIONS) {
      const answer = callData.structured[q.camel] ?? callData.demographics?.[q.field] ?? null;
      pairs.push({ question: q.text, questionOriginal: null, answer });
    }
  }
  return pairs;
}

function formatAnswer(val) {
  if (val == null || val === '') return null;
  return String(val).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDuration(sec) {
  if (!sec) return '-';
  const s = Math.round(Number(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${rem}s`;
}

function formatMinutes(sec) {
  if (!sec) return '0m';
  return `${Math.round(sec / 60)}m`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || '-';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

function sentimentBadge(value) {
  const v = (value || '').toLowerCase();
  if (v === 'positive' || v === 'high') return 'bg-green-100 text-green-700';
  if (v === 'negative' || v === 'low') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}

// ─── Call Detail Panel (slide-in) ─────────────────────────
function CallDetailPanel({ callId, projectName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCall(callId)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [callId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="font-body text-earth-mid text-sm">Call not found or failed to load.</p>
        <button onClick={onClose} className="mt-4 text-sm font-body text-saffron hover:underline cursor-pointer">Close</button>
      </div>
    );
  }

  const transcript = data.transcript || [];
  const demographics = data.demographics || {};
  const sentiment = data.sentiment || {};
  const summary = data.summary || '';
  const qaPairs = buildQuestionAnswerPairs(data);

  const exportCallCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['id', 'timestamp', 'duration', 'language', 'phone_number',
      'age', 'age_group', 'religion',
      ...qaPairs.map(p => p.question),
      'sentiment_overall', 'summary', 'recording_url'];
    const values = [data.id, data.started_at, data.duration, data.language, data.phone_number,
      demographics.age ?? '', demographics.ageGroup ?? '', demographics.religion ?? '',
      ...qaPairs.map(p => p.answer ?? ''),
      sentiment.overall ?? '', summary, data.recording_url ?? ''];
    const csv = headers.map(esc).join(',') + '\n' + values.map(esc).join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `voxbharat-call-${String(data.id).slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-earth to-saffron text-white flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60 mb-1 font-body">Call Log</div>
            <h3 className="font-display text-lg font-bold">{data.custom_survey?.name || 'AI Voice Survey'}</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors cursor-pointer p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap gap-6 mt-4 pt-3 border-t border-white/20 text-sm">
          <div>
            <div className="text-base font-bold font-display">{formatDuration(data.duration)}</div>
            <div className="text-xs text-white/50 font-body">Duration</div>
          </div>
          <div>
            <div className="text-base font-bold font-display capitalize">{data.language || '-'}</div>
            <div className="text-xs text-white/50 font-body">Language</div>
          </div>
          <div>
            <div className="text-base font-bold font-display capitalize">{data.status || '-'}</div>
            <div className="text-xs text-white/50 font-body">Status</div>
          </div>
          {data.phone_number && (
            <div>
              <div className="text-base font-bold font-display">{maskPhone(data.phone_number)}</div>
              <div className="text-xs text-white/50 font-body">Phone</div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Export actions */}
        <div className="flex flex-wrap gap-2">
          {data.recording_url && (
            <button
              onClick={() => {
                authFetch(`${CALL_SERVER}/api/calls/${data.id}/recording`)
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `call-${String(data.id).slice(0, 8)}.mp3`; a.click();
                    URL.revokeObjectURL(url);
                  });
              }}
              className="px-3 py-1.5 text-xs font-body bg-saffron text-white rounded-lg hover:bg-saffron/90 transition-colors cursor-pointer"
            >
              Download Recording
            </button>
          )}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `voxbharat-call-${String(data.id).slice(0, 8)}.json`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1.5 text-xs font-body border border-earth/20 text-earth rounded-lg hover:bg-earth/5 transition-colors cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={exportCallCsv}
            className="px-3 py-1.5 text-xs font-body border border-earth/20 text-earth rounded-lg hover:bg-earth/5 transition-colors cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={() => generateCallPDF(data)}
            className="px-3 py-1.5 text-xs font-body bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors cursor-pointer"
          >
            Export PDF
          </button>
        </div>

        {/* AI Summary */}
        {summary && (
          <div>
            <h4 className="font-display text-sm font-bold text-earth mb-2">AI Summary</h4>
            <div className="bg-cream-warm border border-gold/15 rounded-xl p-4 text-sm text-earth-mid italic font-body leading-relaxed">
              &ldquo;{summary}&rdquo;
            </div>
          </div>
        )}

        {/* Transcript */}
        {transcript.length > 0 && (
          <div>
            <h4 className="font-display text-sm font-bold text-earth mb-2">Conversation Transcript</h4>
            <div className="bg-cream-warm rounded-xl p-3 space-y-2 max-h-[24rem] overflow-y-auto">
              {transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm font-body ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-cream-warm text-earth rounded-bl-md shadow-sm'
                      : 'bg-saffron text-white rounded-br-md'
                  }`}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5 opacity-50 font-medium">
                      {msg.role === 'assistant' ? 'AI Interviewer' : 'Respondent'}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demographics + Sentiment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.keys(demographics).length > 0 && (
            <div className="bg-white border border-cream-warm rounded-xl p-4">
              <h4 className="font-semibold text-earth mb-2 text-xs uppercase tracking-wider font-body">Demographics</h4>
              <div className="space-y-0 text-sm font-body">
                {Object.entries(demographics).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-cream-warm/60 last:border-0">
                    <span className="text-earth-mid capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium text-earth">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(sentiment).length > 0 && (
            <div className="bg-white border border-cream-warm rounded-xl p-4">
              <h4 className="font-semibold text-earth mb-2 text-xs uppercase tracking-wider font-body">Sentiment</h4>
              <div className="space-y-0 text-sm font-body">
                {Object.entries(sentiment).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-cream-warm/60 last:border-0">
                    <span className="text-earth-mid capitalize">{key}</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${sentimentBadge(value)}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Survey Responses */}
        {qaPairs.length > 0 && (
          <div className="bg-white border border-cream-warm rounded-xl p-4">
            <h4 className="font-semibold text-earth mb-2 text-xs uppercase tracking-wider font-body">Survey Responses</h4>
            <div className="space-y-2 text-sm font-body">
              {qaPairs.map((pair, i) => (
                <div key={i} className="py-1.5 border-b border-cream-warm/60 last:border-0">
                  <div className="text-earth-mid text-xs mb-0.5">
                    <span className="font-medium text-earth">Q{i + 1}.</span> {pair.question}
                  </div>
                  {pair.questionOriginal && (
                    <div className="text-earth-mid/60 text-xs mb-0.5 font-serif-indic">{pair.questionOriginal}</div>
                  )}
                  <div className={`font-medium ${pair.answer != null ? 'text-earth' : 'text-earth-mid/40 italic'}`}>
                    {formatAnswer(pair.answer) || 'Not answered'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs font-body text-earth-mid/50 pt-2 border-t border-cream-warm">
          Call ID: {data.id} &middot; {new Date(data.started_at || data.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Survey Detail Page ──────────────────────────────
export default function SurveyDetailPage() {
  const { name } = useParams();
  const projectName = decodeURIComponent(name);
  const [calls, setCalls] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [breakdowns, setBreakdowns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState(null);

  // Bucket mapping state
  const [categorizingField, setCategorizingField] = useState(null);
  const [selectedRaw, setSelectedRaw] = useState(new Set());
  const [bucketName, setBucketName] = useState('');
  const [savingMappings, setSavingMappings] = useState(false);

  // Edit survey state
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [loadingSurveyConfig, setLoadingSurveyConfig] = useState(false);

  // Filters + pagination
  const [filterLang, setFilterLang] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(CALLS_PER_PAGE);

  const encodedProject = encodeURIComponent(projectName);

  const refetchBreakdowns = () =>
    authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/response-breakdowns`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setBreakdowns(data));

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/calls`).then(r => r.ok ? r.json() : []),
      authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/analytics`).then(r => r.ok ? r.json() : null),
      authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/response-breakdowns`).then(r => r.ok ? r.json() : null),
    ])
      .then(([c, a, b]) => {
        setCalls(Array.isArray(c) ? c : []);
        setAnalytics(a);
        setBreakdowns(b);
      })
      .catch(err => console.error('Failed to load project data:', err))
      .finally(() => setLoading(false));
  }, [encodedProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Bucket mapping handlers ──
  const handleSaveMappings = async (field) => {
    if (selectedRaw.size === 0 || !bucketName.trim()) return;
    setSavingMappings(true);
    try {
      const mappings = [...selectedRaw].map(rawValue => ({ field, rawValue, bucket: bucketName.trim() }));
      await authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/bucket-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });
      await refetchBreakdowns();
      setSelectedRaw(new Set());
      setBucketName('');
    } catch (e) {
      console.error('Failed to save mappings:', e);
    }
    setSavingMappings(false);
  };

  // ── Edit survey handler ──
  const handleEditSurvey = async () => {
    setLoadingSurveyConfig(true);
    try {
      const res = await authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/survey-config`);
      if (res.ok) {
        setEditingSurvey(await res.json());
      } else {
        alert('Could not load survey config for this project.');
      }
    } catch (e) {
      console.error('Failed to load survey config:', e);
      alert('Failed to load survey config.');
    }
    setLoadingSurveyConfig(false);
  };

  // ── Export handlers ──
  const handleExportCsv = () => {
    authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/export/csv`)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${projectName}-export.csv`; a.click();
        URL.revokeObjectURL(url);
      });
  };

  const handleExportJson = () => {
    authFetch(`${CALL_SERVER}/api/projects/${encodedProject}/export/json`)
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${projectName}-export.json`; a.click();
        URL.revokeObjectURL(url);
      });
  };

  // If editing survey, show the builder overlay
  if (editingSurvey) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" /></div>}>
        <FullSurveyBuilder
          initialSurvey={editingSurvey}
          onClose={() => setEditingSurvey(null)}
          onLaunch={() => setEditingSurvey(null)}
        />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      </div>
    );
  }

  // Analytics values (matching backend camelCase response)
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

  // Filters
  const uniqueLangs = [...new Set(calls.map(c => c.language).filter(Boolean))].sort();
  const filtered = calls.filter(c => {
    if (filterLang && c.language !== filterLang) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matchesSummary = (c.summary || '').toLowerCase().includes(q);
      const matchesPhone = (c.phone_number || '').includes(q);
      if (!matchesSummary && !matchesPhone) return false;
    }
    return true;
  });
  const paginated = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/dashboard/surveys" className="text-sm font-body text-earth-mid hover:text-saffron transition-colors">
            &larr; Back to Surveys
          </Link>
          <h2 className="font-display text-2xl font-bold text-earth mt-1">{projectName}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {languages.map(lang => (
              <span key={lang} className="px-2.5 py-1 rounded-full text-xs bg-saffron/8 text-saffron font-medium border border-saffron/15 font-body">
                {lang}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {calls.length > 0 && (
            <button
              onClick={() => generateProjectPDF(projectName, analytics, breakdowns, calls)}
              className="px-3 py-1.5 text-sm font-body bg-indigo text-white rounded-lg hover:bg-indigo/90 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          )}
          <button onClick={handleExportCsv} className="px-3 py-1.5 text-sm font-body bg-saffron text-white rounded-lg hover:bg-saffron-deep transition-colors cursor-pointer">
            Export CSV
          </button>
          <button onClick={handleExportJson} className="px-3 py-1.5 text-sm font-body bg-white text-saffron border border-saffron/30 rounded-lg hover:bg-saffron/5 transition-colors cursor-pointer">
            Export JSON
          </button>
          <button
            onClick={handleEditSurvey}
            disabled={loadingSurveyConfig}
            className="px-3 py-1.5 text-sm font-body bg-saffron text-white rounded-lg hover:bg-saffron/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {loadingSurveyConfig ? 'Loading\u2026' : 'Edit Survey & Test Call'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial="hidden" animate="visible" variants={staggerContainer}
      >
        {[
          { label: 'Respondents', value: totalCalls, accent: 'bg-saffron' },
          { label: 'Avg Duration', value: formatDuration(avgDuration), accent: 'bg-gold' },
          { label: 'Total Minutes', value: formatMinutes(totalDuration), accent: 'bg-indigo' },
          { label: 'Languages', value: languages.length, accent: 'bg-earth' },
        ].map(stat => (
          <motion.div key={stat.label} variants={fadeInUp} className="bg-white border border-cream-warm rounded-xl p-5">
            <div className={`w-1.5 h-6 ${stat.accent} rounded-full mb-3`} />
            <div className="text-2xl font-display font-bold text-earth">{stat.value}</div>
            <div className="text-xs font-body text-earth-mid mt-1 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Charts */}
      {(langData.length > 0 || religionData.length > 0 || ageData.length > 0 || sentimentData.length > 0) && (
        <div className="mb-8">
          <h3 className="font-display text-lg font-bold text-earth mb-4">Analytics</h3>
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

      {/* Response Breakdowns with Categorize Answers */}
      {breakdowns?.questions?.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display text-lg font-bold text-earth mb-2">Survey Responses</h3>
          <div className="text-xs font-body text-earth-mid mb-4">
            {breakdowns.totalResponses} completed {breakdowns.totalResponses === 1 ? 'response' : 'responses'}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {breakdowns.questions.map((q, i) => {
              const colors = ['#e8550f', '#c4a04a', '#2d3a6e', '#c24a0e', '#6b7280', '#059669'];
              const chartColor = colors[i % colors.length];
              const chartData = q.breakdown.map(b => ({
                label: b.value.replace(/_/g, ' '),
                pct: b.pct,
              }));
              const isOpen = categorizingField === q.field;
              const rawItems = q.rawBreakdown || q.breakdown;

              return (
                <div key={q.field} className="bg-white border border-cream-warm rounded-xl p-5">
                  <h4 className="font-semibold text-earth mb-1 font-body text-sm">
                    Q{i + 1}. {q.text}
                  </h4>
                  {q.textOriginal && (
                    <div className="text-xs text-earth-mid/60 font-serif-indic mb-2">{q.textOriginal}</div>
                  )}
                  <div className="text-xs text-earth-mid/50 font-body mb-3">
                    {q.answered} answered &middot; {q.unanswered} unanswered
                  </div>
                  {chartData.length > 0 ? (
                    <BarChart data={chartData} color={chartColor} />
                  ) : (
                    <div className="text-xs text-earth-mid/40 italic font-body">No responses yet</div>
                  )}

                  {/* Categorize button */}
                  {rawItems.length >= 2 && (
                    <button
                      onClick={() => {
                        if (isOpen) {
                          setCategorizingField(null);
                          setSelectedRaw(new Set());
                          setBucketName('');
                        } else {
                          setCategorizingField(q.field);
                          setSelectedRaw(new Set());
                          setBucketName('');
                        }
                      }}
                      className={`mt-3 text-xs font-body px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isOpen
                          ? 'bg-saffron/10 border-saffron/30 text-saffron'
                          : 'border-cream-warm text-earth-mid hover:border-saffron/30 hover:text-saffron'
                      }`}
                    >
                      {isOpen ? 'Close' : q.hasMappings ? 'Edit Categories' : 'Categorize Answers'}
                    </button>
                  )}

                  {/* Merge panel */}
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-cream-warm space-y-2">
                      <div className="text-xs font-body text-earth-mid mb-2">
                        Select answers to merge into a single category:
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {rawItems.map((b) => (
                          <label key={b.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-cream/30 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedRaw.has(b.value)}
                              onChange={(e) => {
                                const next = new Set(selectedRaw);
                                e.target.checked ? next.add(b.value) : next.delete(b.value);
                                setSelectedRaw(next);
                              }}
                              className="w-3.5 h-3.5 accent-saffron"
                            />
                            <span className="flex-1 text-xs font-body text-earth truncate">{b.value}</span>
                            <span className="text-xs text-earth-mid/50 tabular-nums">{b.count}</span>
                          </label>
                        ))}
                      </div>
                      {selectedRaw.size >= 1 && (
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            value={bucketName}
                            onChange={(e) => setBucketName(e.target.value)}
                            placeholder="Category name..."
                            className="flex-1 px-2.5 py-1.5 border border-cream-warm rounded-lg text-xs font-body focus:outline-none focus:ring-1 focus:ring-saffron"
                          />
                          <button
                            onClick={() => handleSaveMappings(q.field)}
                            disabled={!bucketName.trim() || savingMappings}
                            className="px-3 py-1.5 bg-saffron text-white text-xs font-body rounded-lg hover:bg-saffron/90 disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            {savingMappings ? 'Saving...' : 'Merge'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Call List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-earth">Individual Calls</h3>
        </div>

        {calls.length === 0 ? (
          <div className="bg-white border border-cream-warm rounded-xl py-12 px-8 text-center">
            <p className="text-earth-mid text-sm font-body">No calls yet. Completed calls for this project will appear here.</p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <select
                value={filterLang}
                onChange={e => { setFilterLang(e.target.value); setVisibleCount(CALLS_PER_PAGE); }}
                className="px-3 py-1.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:ring-1 focus:ring-saffron/30 bg-white cursor-pointer"
              >
                <option value="">All languages</option>
                {uniqueLangs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <input
                type="text"
                value={filterSearch}
                onChange={e => { setFilterSearch(e.target.value); setVisibleCount(CALLS_PER_PAGE); }}
                placeholder="Search summary or phone..."
                className="px-3 py-1.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:ring-1 focus:ring-saffron/30 w-64"
              />
              {(filterLang || filterSearch) && (
                <button
                  onClick={() => { setFilterLang(''); setFilterSearch(''); setVisibleCount(CALLS_PER_PAGE); }}
                  className="text-xs font-body text-earth-mid hover:text-saffron transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              )}
              <span className="text-xs font-body text-earth-mid/50 ml-auto">
                {filtered.length === calls.length
                  ? `${calls.length} calls`
                  : `${filtered.length} of ${calls.length} calls`}
              </span>
            </div>

            <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-cream-warm">
                      <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Date</th>
                      <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Phone</th>
                      <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Language</th>
                      <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Duration</th>
                      <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((call, idx) => (
                      <motion.tr
                        key={call.id}
                        onClick={() => setSelectedCallId(call.id)}
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
                        <td className="py-3.5 px-5 text-earth-mid whitespace-nowrap text-xs">
                          {maskPhone(call.phone_number)}
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

              {hasMore && (
                <div className="border-t border-cream-warm py-3 text-center">
                  <button
                    onClick={() => setVisibleCount(v => v + CALLS_PER_PAGE)}
                    className="text-sm font-body text-saffron hover:text-saffron-deep transition-colors cursor-pointer"
                  >
                    Show more ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Call Detail Slide-in Panel */}
      <AnimatePresence>
        {selectedCallId && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCallId(null)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-[600px] bg-cream z-50 shadow-2xl"
              initial={{ x: 600 }} animate={{ x: 0 }} exit={{ x: 600 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <CallDetailPanel
                callId={selectedCallId}
                projectName={projectName}
                onClose={() => setSelectedCallId(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
