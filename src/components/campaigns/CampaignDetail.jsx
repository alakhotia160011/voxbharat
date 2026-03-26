import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fadeInUp, staggerContainer } from '../../styles/animations';
import { StatusBadge, ProgressBar } from './CampaignList';
import { authFetch } from '../../utils/auth';
import { CALL_SERVER } from '../../utils/config';

const DISPOSITION_COLORS = {
  completed: '#22c55e',
  voicemail: '#2d3a6e',
  no_answer: '#9ca3af',
  failed:    '#f87171',
  pending:   '#e8e0d6',
  calling:   '#eab308',
};

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

const numberStatusConfig = {
  pending:   { label: 'Pending',     color: 'text-gray-500' },
  calling:   { label: 'In Progress', color: 'text-yellow-600' },
  completed: { label: 'Completed',   color: 'text-green-700' },
  failed:    { label: 'Failed',      color: 'text-red-500' },
  no_answer: { label: 'No Answer',   color: 'text-earth-mid' },
  voicemail: { label: 'Voicemail',   color: 'text-indigo' },
};

function StatCard({ label, value, accent, suffix }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white border border-cream-warm rounded-xl p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent || 'bg-saffron'}`} />
      <motion.div
        key={value}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-display font-bold text-earth"
      >
        {value}{suffix || ''}
      </motion.div>
      <div className="text-xs font-body text-earth-mid mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

const btnBase = 'px-4 py-2 rounded-lg font-body text-sm font-medium transition-colors cursor-pointer disabled:opacity-60';
const inputClass = 'w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors';
const labelClass = 'block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5';

function EditPanel({ campaign, onSave, onCancel, saving }) {
  const [name, setName] = useState(campaign.name);
  const [concurrency, setConcurrency] = useState(campaign.concurrency || 2);
  const [language, setLanguage] = useState(campaign.language || 'hi');
  const [gender, setGender] = useState(campaign.gender || 'female');
  const [autoDetect, setAutoDetect] = useState(campaign.auto_detect_language || false);
  const [maxRetries, setMaxRetries] = useState(campaign.max_retries ?? 3);
  const [callTiming, setCallTiming] = useState(
    Array.isArray(campaign.call_timing) ? campaign.call_timing : ['morning', 'afternoon', 'evening']
  );
  const waConfig = campaign.whatsapp_config;
  const [waEnabled, setWaEnabled] = useState(waConfig?.enabled || false);
  const [waMode, setWaMode] = useState(waConfig?.mode || 'batch');
  const [waDelay, setWaDelay] = useState(waConfig?.delayMinutes || 30);
  const [waMessage, setWaMessage] = useState(waConfig?.message || '');

  const handleSubmit = () => {
    const body = {
      name: name.trim(),
      concurrency,
      language,
      gender,
      autoDetectLanguage: autoDetect,
      maxRetries,
      callTiming,
      whatsappConfig: waEnabled
        ? { enabled: true, mode: waMode, delayMinutes: waDelay, message: waMessage }
        : { enabled: false },
    };
    onSave(body);
  };

  const toggleBtn = (active) =>
    `flex-1 py-2.5 rounded-xl border text-sm font-body font-medium transition-all cursor-pointer ${
      active ? 'border-saffron bg-saffron/5 text-saffron' : 'border-cream-warm bg-white text-earth-mid hover:border-saffron/30'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white border border-saffron/20 rounded-xl overflow-hidden"
    >
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-earth">Edit Campaign</h3>
          <button onClick={onCancel} className="text-sm font-body text-earth-mid hover:text-earth cursor-pointer">
            Cancel
          </button>
        </div>

        <div>
          <label className={labelClass}>Campaign Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Concurrency</label>
            <div className="flex gap-3">
              {[1, 2].map(n => (
                <button key={n} onClick={() => setConcurrency(n)} className={toggleBtn(concurrency === n)}>
                  {n} call{n > 1 ? 's' : ''} at a time
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} className={inputClass + ' cursor-pointer'}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Voice Gender</label>
            <div className="flex gap-3">
              {['female', 'male'].map(g => (
                <button key={g} onClick={() => setGender(g)} className={toggleBtn(gender === g) + ' capitalize'}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Auto-Detect Language</label>
            <button onClick={() => setAutoDetect(!autoDetect)} className={toggleBtn(autoDetect) + ' w-full'}>
              {autoDetect ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Call Timing (IST)</label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'morning', label: 'Morning (8am-12pm)' },
              { id: 'afternoon', label: 'Afternoon (12pm-5pm)' },
              { id: 'evening', label: 'Evening (5pm-9pm)' },
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

        <div>
          <label className={labelClass}>Retry Policy</label>
          <div className="flex gap-3">
            {[1, 2, 3, 5].map(n => (
              <button
                key={n}
                onClick={() => setMaxRetries(n)}
                className={`w-14 py-2.5 rounded-xl border text-sm font-body font-medium transition-all cursor-pointer ${
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

        {/* SMS Config */}
        <div className="border-t border-cream-warm/60 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className={labelClass + ' mb-0'}>SMS Reminders</label>
              <p className="text-xs text-earth-mid/60 font-body mt-0.5">Send an SMS heads-up before calling.</p>
            </div>
            <button
              onClick={() => setWaEnabled(!waEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${waEnabled ? 'bg-saffron' : 'bg-cream-warm'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${waEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {waEnabled && (
            <div className="space-y-4 mt-3 p-4 bg-saffron/[0.03] border border-saffron/10 rounded-xl">
              <div>
                <label className={labelClass}>Sending Mode</label>
                <div className="flex gap-3">
                  {[
                    { id: 'batch', label: 'All at once' },
                    { id: 'staggered', label: 'Before each call' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setWaMode(m.id)} className={toggleBtn(waMode === m.id)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {waMode === 'batch' ? 'Wait before calling (minutes)' : 'Delay per number (minutes)'}
                </label>
                <input
                  type="number" min={1} max={120} value={waDelay}
                  onChange={e => setWaDelay(Math.min(120, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className={inputClass + ' w-32'}
                />
              </div>

              <div>
                <label className={labelClass}>Message Template</label>
                <textarea
                  value={waMessage}
                  onChange={e => setWaMessage(e.target.value)}
                  rows={3} maxLength={1024}
                  className={inputClass + ' resize-y'}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-earth-mid/60 font-body">
                    Placeholders: <code className="text-saffron/70">{'{company}'}</code> <code className="text-saffron/70">{'{topic}'}</code> <code className="text-saffron/70">{'{duration}'}</code>
                  </p>
                  <span className="text-xs text-earth-mid/40 font-body">{waMessage.length}/1024</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className={`${btnBase} border border-cream-warm text-earth-mid hover:bg-cream-warm`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className={`${btnBase} bg-saffron text-white hover:bg-saffron-deep`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const pollRef = useRef(null);
  const prevNumbersRef = useRef([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await authFetch(`${CALL_SERVER}/api/campaigns/${campaignId}`);
      if (!res.ok) return;
      const data = await res.json();
      setCampaign(data.campaign);
      setNumbers(data.numbers || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (campaign?.status === 'running' || campaign?.status === 'sending_reminders') {
      pollRef.current = setInterval(fetchData, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [campaign?.status, fetchData]);

  // Derive live activity feed by diffing numbers between polls
  useEffect(() => {
    if (prevNumbersRef.current.length === 0) {
      prevNumbersRef.current = numbers;
      return;
    }
    const prevMap = new Map(prevNumbersRef.current.map(n => [n.id, n.status]));
    const newEvents = [];
    for (const num of numbers) {
      const prevStatus = prevMap.get(num.id);
      if (prevStatus && prevStatus !== num.status) {
        newEvents.push({
          id: `${num.id}-${Date.now()}`,
          phone: num.phone_number,
          to: num.status,
          score: num.lead_score,
          time: new Date(),
        });
      }
    }
    if (newEvents.length > 0) {
      setActivityLog(prev => [...newEvents, ...prev].slice(0, 20));
    }
    prevNumbersRef.current = numbers;
  }, [numbers]);

  const handleAction = async (action, body) => {
    setActionLoading(true);
    try {
      await authFetch(`${CALL_SERVER}/api/campaigns/${campaignId}/${action}`, {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleSave = async (body) => {
    setSaving(true);
    try {
      const res = await authFetch(`${CALL_SERVER}/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditing(false);
        await fetchData();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
          <span className="text-sm font-body text-earth-mid">Loading campaign</span>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="bg-white border border-cream-warm rounded-xl py-16 px-8 text-center">
        <h3 className="font-display text-xl font-bold text-earth mb-2">Campaign not found</h3>
        <button onClick={onBack} className="mt-4 px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer">
          Back to Campaigns
        </button>
      </div>
    );
  }

  const progress = numbers.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, { pending: 0, calling: 0, completed: 0, failed: 0, no_answer: 0, voicemail: 0 });
  const total = numbers.length;
  const done = (progress.completed || 0) + (progress.failed || 0) + (progress.no_answer || 0) + (progress.voicemail || 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Rate stats
  const attempted = done + (progress.calling || 0);
  const connectRate = attempted > 0 ? Math.round(((progress.completed || 0) / attempted) * 100) : 0;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  // Lead scoring
  const hasScoring = campaign.survey_config?.successMetrics?.length > 0;
  const hotLeads = hasScoring ? numbers.filter(n => n.lead_score >= 80).length : 0;

  // Disposition chart data
  const dispositionData = Object.entries(progress)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: numberStatusConfig[status]?.label || status,
      value: count,
      color: DISPOSITION_COLORS[status] || '#9ca3af',
    }));

  const isLive = campaign.status === 'running';

  const rp = campaign.reminderProgress;
  const canEdit = campaign.status === 'pending' || campaign.status === 'paused';
  const canStart = campaign.status === 'pending' || campaign.status === 'paused';
  const canPause = campaign.status === 'running';
  const canCancel = campaign.status === 'pending' || campaign.status === 'running' || campaign.status === 'paused';

  const waEnabled = campaign.whatsapp_config?.enabled;
  const reminderTotal = rp ? (rp.sent || 0) + (rp.pending || 0) + (rp.failed || 0) : 0;
  const canSendReminders = waEnabled && canEdit && (reminderTotal === 0 || (rp?.pending || 0) > 0);

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-body text-sm text-earth-mid hover:text-saffron transition-colors cursor-pointer group"
      >
        <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
        All Campaigns
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-display text-2xl font-bold text-earth">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-earth-mid font-body text-sm">
            Created {new Date(campaign.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' \u00b7 '} Concurrency: {campaign.concurrency}
            {' \u00b7 '} Retries: {campaign.max_retries ?? 3}x
            {campaign.call_timing && ` \u00b7 Window: ${
              campaign.call_timing.start !== undefined
                ? `${campaign.call_timing.start <= 12 ? campaign.call_timing.start + ':00 AM' : (campaign.call_timing.start - 12) + ':00 PM'}\u2013${campaign.call_timing.end <= 12 ? campaign.call_timing.end + ':00 AM' : (campaign.call_timing.end - 12) + ':00 PM'} IST`
                : (Array.isArray(campaign.call_timing) ? campaign.call_timing.join(', ') : '')
            }`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              disabled={actionLoading}
              className={`${btnBase} border border-cream-warm text-earth-mid hover:bg-cream-warm`}
            >
              Edit
            </button>
          )}
          {canStart && (
            <button
              onClick={() => handleAction('start', { force: true })}
              disabled={actionLoading}
              className={`${btnBase} bg-saffron text-white hover:bg-saffron-deep`}
            >
              Call Now
            </button>
          )}
          {canPause && (
            <button
              onClick={() => handleAction('pause')}
              disabled={actionLoading}
              className={`${btnBase} border border-cream-warm text-earth-mid hover:bg-cream-warm`}
            >
              Pause
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
              className={`${btnBase} border border-red-200 text-red-500 hover:bg-red-50`}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      <AnimatePresence>
        {editing && (
          <EditPanel
            campaign={campaign}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* SMS Reminder Progress */}
      {(waEnabled || rp) && (
        <div className="bg-white border border-cream-warm rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-body font-medium text-earth">SMS Reminders</span>
              {campaign.status === 'sending_reminders' && (
                <span className="text-xs font-body text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Sending...</span>
              )}
            </div>
            {canSendReminders && (
              <button
                onClick={() => handleAction('send-reminders')}
                disabled={actionLoading || campaign.status === 'sending_reminders'}
                className={`${btnBase} bg-green-600 text-white hover:bg-green-700 text-xs px-3 py-1.5`}
              >
                {campaign.status === 'sending_reminders' ? 'Sending...' : 'Send SMS Now'}
              </button>
            )}
          </div>
          {rp && (
            <>
              <div className="flex items-center gap-4 flex-wrap text-sm font-body">
                <span className="text-green-700 font-medium">{rp.sent || 0} sent</span>
                {(rp.delivered || 0) > 0 && <span className="text-green-600">{rp.delivered} delivered</span>}
                {(rp.read || 0) > 0 && <span className="text-blue-600">{rp.read} read</span>}
                {(rp.pending || 0) > 0 && <span className="text-earth-mid">{rp.pending} pending</span>}
                {(rp.failed || 0) > 0 && <span className="text-red-500">{rp.failed} failed</span>}
                {(rp.optedOut || 0) > 0 && <span className="text-red-400">{rp.optedOut} opted out</span>}
              </div>
              {reminderTotal > 0 && (
                <div className="mt-2 h-1.5 bg-cream-warm rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(((rp.sent || 0) / reminderTotal) * 100)}%` }}
                  />
                </div>
              )}
            </>
          )}
          {!rp && waEnabled && (
            <p className="text-sm font-body text-earth-mid">No reminders sent yet. Click "Send SMS Now" to send reminders before calling.</p>
          )}
        </div>
      )}

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Total" value={total} accent="bg-earth" />
        <StatCard label="Completed" value={progress.completed || 0} accent="bg-green-500" />
        <StatCard label="Voicemail" value={progress.voicemail || 0} accent="bg-indigo" />
        <StatCard label="Failed" value={progress.failed || 0} accent="bg-red-400" />
        <StatCard label="No Answer" value={progress.no_answer || 0} accent="bg-gray-400" />
        <StatCard label="In Progress" value={progress.calling || 0} accent="bg-yellow-400" />
        <StatCard label="Connect Rate" value={connectRate} suffix="%" accent="bg-saffron" />
        <StatCard label="Progress" value={completionRate} suffix="%" accent="bg-gold" />
        {hasScoring && <StatCard label="Hot Leads" value={hotLeads} accent="bg-green-600" />}
      </motion.div>

      {/* Progress bar + Donut chart row */}
      <div className={`grid ${done > 0 ? 'md:grid-cols-3' : ''} gap-4`}>
        {/* Progress bar */}
        <div className={`bg-white border border-cream-warm rounded-xl p-5 ${done > 0 ? 'md:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-body text-earth-mid">Overall Progress</span>
            <span className="text-sm font-body font-medium text-earth">{pct}%</span>
          </div>
          <div className="h-3 bg-cream-warm rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-saffron to-gold rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs font-body text-earth-mid">
            <span>{done} of {total} processed</span>
            {(progress.pending || 0) > 0 && <span>{progress.pending} remaining</span>}
          </div>

          {/* Live activity feed */}
          {isLive && activityLog.length > 0 && (
            <div className="mt-4 pt-4 border-t border-cream-warm/60">
              <h4 className="text-xs font-body text-earth-mid uppercase tracking-wider mb-2">Live Activity</h4>
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                <AnimatePresence>
                  {activityLog.map(evt => {
                    const cfg = numberStatusConfig[evt.to] || numberStatusConfig.pending;
                    return (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs font-body text-earth-mid flex items-center gap-2"
                      >
                        <span className="text-earth-mid/40 tabular-nums">
                          {evt.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="font-mono">...{evt.phone.slice(-4)}</span>
                        <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                        {evt.score != null && (
                          <span className={`ml-auto font-medium ${evt.score >= 80 ? 'text-green-700' : evt.score >= 50 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {evt.score}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Disposition donut chart */}
        {done > 0 && (
          <div className="bg-white border border-cream-warm rounded-xl p-5">
            <h4 className="text-xs font-body text-earth-mid uppercase tracking-wider mb-2">Disposition</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={dispositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {dispositionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#3d2314',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#faf8f5',
                    fontSize: '12px',
                    fontFamily: 'DM Sans',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {dispositionData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs font-body text-earth-mid">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phone numbers table */}
      <div>
        <h3 className="font-display text-lg font-bold text-earth flex items-center gap-3 mb-4">
          <span className="text-xl font-serif-indic text-gold leading-none">{'\u0968'}</span>
          <div className="flex-1 h-px bg-gold/30" />
          <span className="text-sm font-body text-earth-mid font-normal">Phone Numbers</span>
        </h3>

        <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-cream-warm">
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Phone Number</th>
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider">Status</th>
                  {hasScoring && <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden sm:table-cell">Score</th>}
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden sm:table-cell">Attempts</th>
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden md:table-cell">Started</th>
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden md:table-cell">Completed</th>
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden lg:table-cell">Error</th>
                </tr>
              </thead>
              <tbody>
                {[...numbers].sort((a, b) => {
                  if (a.status === 'calling' && b.status !== 'calling') return -1;
                  if (a.status !== 'calling' && b.status === 'calling') return 1;
                  return 0;
                }).map((num) => {
                  const cfg = numberStatusConfig[num.status] || numberStatusConfig.pending;
                  return (
                    <tr
                      key={num.id}
                      className="border-b border-cream-warm/60 last:border-0 hover:bg-saffron/[0.02] transition-colors"
                    >
                      <td className="py-3 px-5 font-mono text-earth">{num.phone_number}</td>
                      <td className="py-3 px-5">
                        <span className={`font-medium ${cfg.color} flex items-center gap-1.5`}>
                          {num.status === 'calling' && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                            </span>
                          )}
                          {cfg.label}
                        </span>
                      </td>
                      {hasScoring && (
                        <td className="py-3 px-5 hidden sm:table-cell">
                          {num.lead_score != null ? (
                            <span className={`font-medium text-sm ${
                              num.lead_score >= 80 ? 'text-green-700' :
                              num.lead_score >= 50 ? 'text-yellow-600' : 'text-gray-400'
                            }`}>
                              {num.lead_score}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                      <td className="py-3 px-5 text-earth-mid hidden sm:table-cell">
                        {num.attempts || 0}
                      </td>
                      <td className="py-3 px-5 text-earth-mid hidden md:table-cell">
                        {num.started_at ? new Date(num.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-5 text-earth-mid hidden md:table-cell">
                        {num.completed_at ? new Date(num.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-5 text-red-400 text-xs hidden lg:table-cell max-w-[200px] truncate">
                        {num.error || '-'}
                      </td>
                    </tr>
                  );
                })}
                {numbers.length === 0 && (
                  <tr>
                    <td colSpan={hasScoring ? 7 : 6} className="py-8 text-center text-earth-mid text-sm">No phone numbers</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
