import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { fadeInUp, staggerContainer } from '../../styles/animations';
import { useBuilder } from '../../contexts/BuilderContext';

function StatCard({ label, value, accent }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white border border-cream-warm rounded-xl p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent || 'bg-saffron'}`} />
      <div className="text-2xl font-heading font-bold text-earth">{value}</div>
      <div className="text-xs font-body text-earth-mid mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function formatMinutes(sec) {
  if (!sec) return '0';
  return Math.round(sec / 60).toLocaleString();
}

export default function OverviewPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setShowBuilder } = useBuilder();

  const fetchProjects = useCallback(() => {
    setLoading(true);
    api.getProjects()
      .then(d => setProjects(d))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const totalCalls = projects.reduce((sum, p) => sum + parseInt(p.call_count || 0, 10), 0);
  const totalMinutes = projects.reduce((sum, p) => sum + (parseInt(p.total_duration || 0, 10) || 0), 0);
  const allLanguages = [...new Set(projects.flatMap(p => p.languages || []))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <StatCard label="Total Surveys" value={projects.length} accent="bg-saffron" />
        <StatCard label="Total Calls" value={totalCalls.toLocaleString()} accent="bg-indigo" />
        <StatCard label="Total Minutes" value={formatMinutes(totalMinutes)} accent="bg-gold" />
        <StatCard label="Languages" value={allLanguages.length} accent="bg-bark" />
      </motion.div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setShowBuilder(true)}
          className="px-5 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
        >
          New Survey
        </button>
        <Link
          to="/dashboard/campaigns"
          className="px-5 py-2.5 border border-earth/20 text-earth rounded-lg font-body text-sm font-medium hover:bg-earth/5 transition-colors"
        >
          View Campaigns
        </Link>
      </div>

      {/* Recent Surveys */}
      <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-cream-warm flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-earth">Recent Surveys</h2>
          <Link to="/dashboard/surveys" className="text-sm font-body text-saffron hover:text-saffron-deep transition-colors">
            View all
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-earth-mid text-sm font-body mb-4">No surveys yet. Create your first one!</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-5 py-2 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
            >
              Create Survey
            </button>
          </div>
        ) : (
          <div className="divide-y divide-cream-warm">
            {projects.slice(0, 5).map((p) => (
              <Link
                key={p.project_name}
                to={`/dashboard/surveys/${encodeURIComponent(p.project_name)}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-cream/50 transition-colors"
              >
                <div>
                  <div className="font-body text-sm font-medium text-earth">{p.project_name}</div>
                  <div className="text-xs text-earth-mid mt-0.5">
                    {p.call_count} calls &middot; {(p.languages || []).join(', ') || 'No calls'}
                  </div>
                </div>
                <span className="text-xs text-earth-mid">&rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
