import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalContainer } from '../../styles/animations';

const sectionNumerals = ['१', '२', '३'];

const bubbleVariants = {
  hidden: (role) => ({
    opacity: 0,
    x: role === 'assistant' ? -20 : 20,
  }),
  visible: (role) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function SampleCallLogModal({ show, onClose, data }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          variants={modalBackdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col"
            variants={modalContainer}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-earth to-saffron text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Sample Call Log</div>
                  <h2 className="font-display text-2xl font-bold">AI Voice Survey - Single Call</h2>
                  <p className="text-white/80 mt-1">What each completed call produces</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/20 text-sm">
                <div>
                  <div className="text-lg font-bold">{Math.floor(data.duration / 60)}m {data.duration % 60}s</div>
                  <div className="text-xs text-white/60">Duration</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{data.language}</div>
                  <div className="text-xs text-white/60">Language</div>
                </div>
                <div>
                  <div className="text-lg font-bold capitalize">{data.status}</div>
                  <div className="text-xs text-white/60">Status</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{data.phone}</div>
                  <div className="text-xs text-white/60">Phone</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* AI Summary */}
              <section>
                <h3 className="font-display text-lg font-bold text-earth mb-3 flex items-center gap-3">
                  <span className="text-xl font-serif-indic text-gold leading-none">{sectionNumerals[0]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">AI Summary</span>
                </h3>
                <div className="bg-saffron-light border border-saffron/20 rounded-xl p-4 text-sm text-earth-mid italic">
                  "{data.summary}"
                </div>
              </section>

              {/* Conversation Transcript */}
              <section>
                <h3 className="font-display text-lg font-bold text-earth mb-3 flex items-center gap-3">
                  <span className="text-xl font-serif-indic text-gold leading-none">{sectionNumerals[1]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Conversation Transcript</span>
                </h3>
                <div className="bg-cream-warm rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                  {data.transcript.map((msg, i) => (
                    <motion.div
                      key={i}
                      className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                      variants={bubbleVariants}
                      initial="hidden"
                      animate="visible"
                      custom={msg.role}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'assistant'
                          ? 'bg-white border border-cream-warm text-earth rounded-bl-md'
                          : 'bg-saffron text-white rounded-br-md'
                      }`}>
                        <div className="text-[10px] uppercase tracking-wider mb-1 opacity-60">
                          {msg.role === 'assistant' ? 'AI Interviewer' : 'Respondent'}
                        </div>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Extracted Data */}
              <section>
                <h3 className="font-display text-lg font-bold text-earth mb-3 flex items-center gap-3">
                  <span className="text-xl font-serif-indic text-gold leading-none">{sectionNumerals[2]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Extracted Structured Data</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Demographics */}
                  <div className="bg-white border border-cream-warm rounded-xl p-4">
                    <h4 className="font-semibold text-earth mb-3 text-sm uppercase tracking-wider">Demographics</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(data.extractedData.demographics).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1.5 border-b border-cream-warm last:border-0">
                          <span className="text-earth-mid capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-medium text-earth">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div className="bg-white border border-cream-warm rounded-xl p-4">
                    <h4 className="font-semibold text-earth mb-3 text-sm uppercase tracking-wider">Sentiment Analysis</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(data.extractedData.sentiment).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1.5 border-b border-cream-warm last:border-0">
                          <span className="text-earth-mid capitalize">{key}</span>
                          <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                            value === 'positive' || value === 'high' ? 'bg-green-100 text-green-700' :
                            value === 'neutral' || value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Structured Survey Responses */}
                <div className="bg-white border border-cream-warm rounded-xl p-4 mt-4">
                  <h4 className="font-semibold text-earth mb-3 text-sm uppercase tracking-wider">Survey Responses</h4>
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-0 text-sm">
                    {Object.entries(data.extractedData.structured).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-cream-warm">
                        <span className="text-earth-mid">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                        <span className="font-medium text-earth">{value !== null ? String(value).replace(/_/g, ' ') : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-cream-warm flex items-center justify-between">
              <div className="text-xs text-earth-mid/60">
                Call ID: {data.id} &middot; {new Date(data.timestamp).toLocaleString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'voxbharat-sample-call-log.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 text-sm bg-saffron text-white rounded-lg hover:bg-saffron-deep cursor-pointer"
                >
                  ↓ Download JSON
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm bg-earth/10 text-earth-mid rounded-lg hover:bg-earth/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
