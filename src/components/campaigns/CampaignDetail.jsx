import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../../styles/animations';
import { StatusBadge, ProgressBar } from './CampaignList';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const TOKEN_KEY = 'voxbharat_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function authFetch(url, opts = {}) {
  const token = getToken();
  return fetch(url, { ...opts, headers: { ...opts.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

const numberStatusConfig = {
  pending:   { label: 'Pending',     color: 'text-gray-500' },
  calling:   { label: 'In Progress', color: 'text-yellow-600' },
  completed: { label: 'Completed',   color: 'text-green-700' },
  failed:    { label: 'Failed',      color: 'text-red-500' },
  no_answer: { label: 'No Answer',   color: 'text-earth-mid' },
};

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

export default function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef(null);

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

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while running
  useEffect(() => {
    if (campaign?.status === 'running') {
      pollRef.current = setInterval(fetchData, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [campaign?.status, fetchData]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await authFetch(`${CALL_SERVER}/api/campaigns/${campaignId}/${action}`, { method: 'POST' });
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(false);
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

  const progress = campaign.progress || {};
  const total = (progress.pending || 0) + (progress.calling || 0) + (progress.completed || 0) + (progress.failed || 0) + (progress.no_answer || 0);
  const done = (progress.completed || 0) + (progress.failed || 0) + (progress.no_answer || 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const canStart = campaign.status === 'pending' || campaign.status === 'paused';
  const canPause = campaign.status === 'running';
  const canCancel = campaign.status === 'pending' || campaign.status === 'running' || campaign.status === 'paused';

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
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canStart && (
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading}
              className="px-4 py-2 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-60"
            >
              {campaign.status === 'paused' ? 'Resume' : 'Start'} Campaign
            </button>
          )}
          {canPause && (
            <button
              onClick={() => handleAction('pause')}
              disabled={actionLoading}
              className="px-4 py-2 border border-cream-warm text-earth-mid rounded-lg font-body text-sm font-medium hover:bg-cream-warm transition-colors cursor-pointer disabled:opacity-60"
            >
              Pause
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-200 text-red-500 rounded-lg font-body text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Total" value={total} accent="bg-earth" />
        <StatCard label="Completed" value={progress.completed || 0} accent="bg-green-500" />
        <StatCard label="Failed" value={progress.failed || 0} accent="bg-red-400" />
        <StatCard label="No Answer" value={progress.no_answer || 0} accent="bg-gray-400" />
        <StatCard label="In Progress" value={progress.calling || 0} accent="bg-yellow-400" />
      </motion.div>

      {/* Progress bar */}
      <div className="bg-white border border-cream-warm rounded-xl p-5">
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
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden md:table-cell">Started</th>
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden md:table-cell">Completed</th>
                  <th className="text-left py-3.5 px-5 font-medium text-earth-mid text-xs uppercase tracking-wider hidden lg:table-cell">Error</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((num, idx) => {
                  const cfg = numberStatusConfig[num.status] || numberStatusConfig.pending;
                  return (
                    <tr
                      key={num.id}
                      className="border-b border-cream-warm/60 last:border-0 hover:bg-saffron/[0.02] transition-colors"
                    >
                      <td className="py-3 px-5 font-mono text-earth">{num.phone_number}</td>
                      <td className="py-3 px-5">
                        <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="py-3 px-5 text-earth-mid hidden md:table-cell">
                        {num.started_at ? new Date(num.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '\u2014'}
                      </td>
                      <td className="py-3 px-5 text-earth-mid hidden md:table-cell">
                        {num.completed_at ? new Date(num.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '\u2014'}
                      </td>
                      <td className="py-3 px-5 text-red-400 text-xs hidden lg:table-cell max-w-[200px] truncate">
                        {num.error || '\u2014'}
                      </td>
                    </tr>
                  );
                })}
                {numbers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-earth-mid text-sm">No phone numbers</td>
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
