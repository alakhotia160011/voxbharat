import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../../styles/animations';

const statusConfig = {
  pending:   { label: 'Pending',   bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  running:   { label: 'Running',   bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400 animate-pulse' },
  paused:    { label: 'Paused',    bg: 'bg-indigo/10',  text: 'text-indigo',     dot: 'bg-indigo' },
  completed: { label: 'Completed', bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400' },
};

export function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-2 bg-cream-warm rounded-full overflow-hidden">
      <div
        className="h-full bg-saffron rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function getCounts(progress) {
  const p = progress || {};
  const total = (p.pending || 0) + (p.calling || 0) + (p.completed || 0) + (p.failed || 0) + (p.no_answer || 0);
  const done = (p.completed || 0) + (p.failed || 0) + (p.no_answer || 0);
  return { total, done, ...p };
}

export default function CampaignList({ campaigns, onSelect, onNewCampaign, onRefresh, loading }) {
  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-earth flex items-center gap-3">
          <span className="text-xl font-serif-indic text-gold leading-none">{'\u0967'}</span>
          <div className="flex-1 h-px bg-gold/30" />
          <span className="text-sm font-body text-earth-mid font-normal">Campaigns</span>
        </h3>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-body border border-cream-warm text-earth-mid rounded-lg hover:bg-cream-warm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Loading\u2026' : 'Refresh'}
          </button>
          <button
            onClick={onNewCampaign}
            className="px-4 py-1.5 text-sm font-body bg-saffron text-white rounded-lg hover:bg-saffron-deep transition-colors cursor-pointer font-medium"
          >
            New Campaign
          </button>
        </div>
      </motion.div>

      {/* Cards or empty state */}
      {campaigns.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <div className="bg-white border border-cream-warm rounded-xl py-16 px-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-saffron/10 to-gold/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-earth mb-2">No campaigns yet</h3>
            <p className="text-earth-mid text-sm max-w-md mx-auto">
              Create a campaign to deploy your survey at scale &mdash; call hundreds of phone numbers simultaneously.
            </p>
            <button
              onClick={onNewCampaign}
              className="mt-6 px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
            >
              Create Your First Campaign
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp} className="grid gap-4">
          {campaigns.map((campaign, idx) => {
            const c = getCounts(campaign.progress);
            return (
              <motion.div
                key={campaign.id}
                onClick={() => onSelect(campaign.id)}
                className="bg-white border border-cream-warm rounded-xl p-6 cursor-pointer hover:border-saffron/30 hover:shadow-sm transition-all group relative overflow-hidden"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-saffron" />
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display text-lg font-bold text-earth group-hover:text-saffron transition-colors truncate">
                        {campaign.name}
                      </h3>
                      <StatusBadge status={campaign.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-body text-earth-mid mt-2">
                      <span>{c.total} phone {c.total === 1 ? 'number' : 'numbers'}</span>
                      <span>Concurrency: {campaign.concurrency}</span>
                      <span>{new Date(campaign.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="text-earth-mid/40 group-hover:text-saffron transition-colors ml-4 mt-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <ProgressBar done={c.done} total={c.total} />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-body text-earth-mid">
                  <span>{c.completed || 0} completed</span>
                  {(c.failed || 0) > 0 && <span className="text-red-500">{c.failed} failed</span>}
                  {(c.no_answer || 0) > 0 && <span>{c.no_answer} no answer</span>}
                  {(c.calling || 0) > 0 && <span className="text-yellow-600">{c.calling} in progress</span>}
                  {(c.pending || 0) > 0 && <span>{c.pending} remaining</span>}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
