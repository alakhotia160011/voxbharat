import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const TOKEN_KEY = 'voxbharat_token';
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function authFetch(url, opts = {}) {
  const token = getToken();
  return fetch(url, { ...opts, headers: { ...opts.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' } });
}

export default function InboundDetail({ configId, onBack }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recentCalls, setRecentCalls] = useState([]);

  const fetchConfig = useCallback(() => {
    authFetch(`${CALL_SERVER}/api/inbound-configs/${configId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setConfig(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [configId]);

  const fetchRecentCalls = useCallback(() => {
    // Fetch calls that match this inbound config's survey
    authFetch(`${CALL_SERVER}/api/surveys`)
      .then(r => r.ok ? r.json() : [])
      .then(calls => {
        const inbound = (Array.isArray(calls) ? calls : [])
          .filter(c => c.direction === 'inbound')
          .slice(0, 20);
        setRecentCalls(inbound);
      })
      .catch(() => setRecentCalls([]));
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchRecentCalls();
  }, [fetchConfig, fetchRecentCalls]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await authFetch(`${CALL_SERVER}/api/inbound-configs/${configId}/toggle`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this inbound agent?')) return;
    setDeleting(true);
    try {
      await authFetch(`${CALL_SERVER}/api/inbound-configs/${configId}`, { method: 'DELETE' });
      onBack();
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
        <span className="ml-3 text-sm font-body text-earth-mid">Loading agent...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20">
        <p className="text-earth-mid font-body">Inbound agent not found.</p>
        <button onClick={onBack} className="mt-4 text-saffron text-sm font-body hover:underline cursor-pointer">Go back</button>
      </div>
    );
  }

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

      {/* Header */}
      <div className="bg-white border border-cream-warm rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-display text-2xl font-bold text-earth">{config.name}</h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                config.enabled
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {config.enabled ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-sm text-earth-mid font-body">
              Created {new Date(config.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`px-4 py-2 text-sm font-body rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                config.enabled
                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
              }`}
            >
              {toggling ? '...' : config.enabled ? 'Pause' : 'Activate'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-body rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Config details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-cream-warm rounded-xl p-6">
          <h3 className="font-body text-sm font-medium text-earth-mid mb-4">Configuration</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-body">
              <span className="text-earth-mid">Survey</span>
              <span className="text-earth font-medium">{config.survey_config?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm font-body">
              <span className="text-earth-mid">Language</span>
              <span className="text-earth font-medium">{config.auto_detect_language ? 'Auto-detect' : config.language?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm font-body">
              <span className="text-earth-mid">Voice</span>
              <span className="text-earth font-medium capitalize">{config.gender}</span>
            </div>
            <div className="flex justify-between text-sm font-body">
              <span className="text-earth-mid">Twilio Number</span>
              <span className="text-earth font-medium">{config.twilio_number}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-cream-warm rounded-xl p-6">
          <h3 className="font-body text-sm font-medium text-earth-mid mb-4">Greeting</h3>
          <p className="text-sm font-body text-earth leading-relaxed">
            {config.greeting_text || (
              <span className="text-earth-mid italic">Using default greeting for {config.language?.toUpperCase()}</span>
            )}
          </p>
        </div>
      </div>

      {/* Recent inbound calls */}
      <div className="bg-white border border-cream-warm rounded-xl p-6">
        <h3 className="font-body text-sm font-medium text-earth-mid mb-4">Recent Inbound Calls</h3>
        {recentCalls.length === 0 ? (
          <p className="text-sm text-earth-mid font-body text-center py-8">No inbound calls yet. When someone calls your Twilio number, calls will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-cream-warm">
                  <th className="text-left py-2 text-earth-mid font-medium">Date</th>
                  <th className="text-left py-2 text-earth-mid font-medium">Caller</th>
                  <th className="text-left py-2 text-earth-mid font-medium">Duration</th>
                  <th className="text-left py-2 text-earth-mid font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map(call => (
                  <tr key={call.id} className="border-b border-cream-warm/50 last:border-0">
                    <td className="py-2.5 text-earth">
                      {new Date(call.started_at || call.created_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 text-earth">{call.phone_number || 'Unknown'}</td>
                    <td className="py-2.5 text-earth">
                      {call.recording_duration ? `${call.recording_duration}s` : '-'}
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        call.status === 'saved' || call.status === 'completed'
                          ? 'bg-green-50 text-green-700'
                          : call.status === 'failed'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {call.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
