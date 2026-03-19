import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useBuilder } from '../../contexts/BuilderContext';
import { fadeInUp, staggerContainer } from '../../styles/animations';

export default function SurveysPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-cream-warm rounded-xl py-16 px-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-saffron/10 to-gold/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-heading text-xl font-bold text-earth mb-2">No surveys yet</h3>
          <p className="text-earth-mid text-sm max-w-md mx-auto">Create your first voice survey and start collecting responses.</p>
          <button
            onClick={() => setShowBuilder(true)}
            className="mt-6 px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
          >
            Create Survey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-lg font-semibold text-earth">{projects.length} Surveys</h2>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-5 py-2 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
        >
          New Survey
        </button>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {projects.map((p) => (
          <motion.div key={p.project_name} variants={fadeInUp}>
            <Link
              to={`/dashboard/surveys/${encodeURIComponent(p.project_name)}`}
              className="block bg-white border border-cream-warm rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-body text-sm font-semibold text-earth mb-2 truncate">{p.project_name}</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(p.languages || []).map(lang => (
                  <span key={lang} className="px-2 py-0.5 text-[10px] font-body bg-gold/10 text-gold rounded-full uppercase tracking-wider">
                    {lang}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-earth-mid font-body">
                <span>{p.call_count} calls</span>
                <span>{p.total_duration ? `${Math.round(p.total_duration / 60)}m` : '0m'}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-cream-warm rounded-full overflow-hidden">
                <div
                  className="h-full bg-saffron rounded-full transition-all"
                  style={{ width: `${Math.min(100, (parseInt(p.call_count || 0, 10) / Math.max(1, parseInt(p.call_count || 0, 10))) * 100)}%` }}
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
