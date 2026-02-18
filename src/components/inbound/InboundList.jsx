import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../../styles/animations';

export default function InboundList({ configs, onSelect, onNewConfig, onRefresh, loading }) {
  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-earth flex items-center gap-3">
          <span className="text-xl font-serif-indic text-gold leading-none">{'\u0969'}</span>
          <div className="flex-1 h-px bg-gold/30" />
          <span className="text-sm font-body text-earth-mid font-normal">Inbound Agents</span>
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
            onClick={onNewConfig}
            className="px-4 py-1.5 text-sm font-body bg-saffron text-white rounded-lg hover:bg-saffron-deep transition-colors cursor-pointer font-medium"
          >
            New Inbound Agent
          </button>
        </div>
      </motion.div>

      {/* Cards or empty state */}
      {configs.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <div className="bg-white border border-cream-warm rounded-xl py-16 px-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-saffron/10 to-gold/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0l6-6m-3 18c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 014.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 00-.38 1.21 12.035 12.035 0 007.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 011.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 01-2.25 2.25h-2.25z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-earth mb-2">No inbound agents yet</h3>
            <p className="text-earth-mid text-sm max-w-md mx-auto">
              Create an inbound agent to receive calls on your Twilio number. A 24/7 AI voice agent for any survey.
            </p>
            <button
              onClick={onNewConfig}
              className="mt-6 px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer"
            >
              Create Your First Agent
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp} className="grid gap-4">
          {configs.map((config, idx) => (
            <motion.div
              key={config.id}
              onClick={() => onSelect(config.id)}
              className="bg-white border border-cream-warm rounded-xl p-6 cursor-pointer hover:border-saffron/30 hover:shadow-sm transition-all group relative overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-saffron" />
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-lg font-bold text-earth group-hover:text-saffron transition-colors truncate">
                      {config.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      config.enabled
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      {config.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-body text-earth-mid mt-2">
                    <span>{config.survey_config?.name || 'Survey'}</span>
                    <span className="px-2 py-0.5 bg-cream-warm rounded text-xs">{config.language?.toUpperCase()}</span>
                    <span>{config.twilio_number}</span>
                    <span>{new Date(config.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
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
