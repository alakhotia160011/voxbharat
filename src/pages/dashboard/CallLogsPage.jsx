import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

function formatDuration(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
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

export default function CallLogsPage() {
  const [projects, setProjects] = useState([]);
  const [allCalls, setAllCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getProjects()
      .then(async (projs) => {
        setProjects(projs);
        const callArrays = await Promise.all(
          projs.map(p => api.getProjectCalls(p.project_name).catch(() => []))
        );
        const merged = callArrays.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAllCalls(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? allCalls
    : allCalls.filter(c => c.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        {['all', 'completed', 'failed', 'no_answer', 'voicemail'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-body transition-colors cursor-pointer ${
              filter === f
                ? 'bg-saffron text-white'
                : 'bg-white border border-cream-warm text-earth-mid hover:bg-cream'
            }`}
          >
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
        <span className="text-xs text-earth-mid font-body ml-auto">{filtered.length} calls</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-warm bg-cream/50">
              <th className="text-left px-6 py-3 text-xs font-body text-earth-mid uppercase tracking-wider">Call ID</th>
              <th className="text-left px-6 py-3 text-xs font-body text-earth-mid uppercase tracking-wider">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-body text-earth-mid uppercase tracking-wider">Language</th>
              <th className="text-left px-6 py-3 text-xs font-body text-earth-mid uppercase tracking-wider">Duration</th>
              <th className="text-left px-6 py-3 text-xs font-body text-earth-mid uppercase tracking-wider">Sentiment</th>
              <th className="text-left px-6 py-3 text-xs font-body text-earth-mid uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-warm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-earth-mid text-sm font-body">No calls found</td>
              </tr>
            ) : (
              filtered.map(call => (
                <tr key={call.id} className="hover:bg-cream/30 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-earth-mid">{String(call.id).slice(0, 8)}</td>
                  <td className="px-6 py-3 font-body text-sm text-earth">{maskPhone(call.phone_number)}</td>
                  <td className="px-6 py-3 font-body text-sm text-earth">{call.language || '-'}</td>
                  <td className="px-6 py-3 font-body text-sm text-earth">{formatDuration(call.duration)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-body ${sentimentBadge(call.sentiment)}`}>
                      {call.sentiment || 'neutral'}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-body text-xs text-earth-mid">{call.status || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
