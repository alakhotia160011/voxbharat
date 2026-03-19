import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, sectionViewport } from '../../styles/animations';

const rows = [
  { label: 'Bias', old: 'Interviewer bias in every call', vox: 'Consistent AI — zero interviewer bias' },
  { label: 'Availability', old: '8am–8pm, weekdays only', vox: '24/7, including weekends & holidays' },
  { label: 'Cost', old: '₹400+ per completed interview', vox: '₹40 per completed interview' },
  { label: 'Speed', old: 'Weeks to complete a study', vox: '48 hours from launch to report' },
  { label: 'Scale', old: '50 calls/day per interviewer', vox: '1,000+ concurrent calls' },
  { label: 'Languages', old: '1-2 per interviewer', vox: '10 languages, auto-detected' },
];

export default function ComparisonSection() {
  return (
    <section className="bg-dark-warm py-24 lg:py-32 px-6">
      <motion.div
        className="max-w-5xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <span className="font-mono text-[11px] tracking-[0.25em] text-saffron/60 uppercase">Why VoxBharat</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-cream mt-3">
            The Old Way vs VoxBharat
          </h2>
        </motion.div>

        <motion.div variants={fadeInUp} className="overflow-hidden rounded-2xl border border-cream/10">
          {/* Header */}
          <div className="grid grid-cols-3 bg-cream/5">
            <div className="px-6 py-4" />
            <div className="px-6 py-4 text-center">
              <span className="font-body text-xs uppercase tracking-wider text-cream/40">Traditional (CATI)</span>
            </div>
            <div className="px-6 py-4 text-center bg-saffron/10">
              <span className="font-body text-xs uppercase tracking-wider text-saffron font-semibold">VoxBharat</span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 border-t border-cream/5 ${i % 2 === 0 ? '' : 'bg-cream/[0.02]'}`}>
              <div className="px-6 py-4">
                <span className="font-body text-sm font-semibold text-cream/80">{row.label}</span>
              </div>
              <div className="px-6 py-4 text-center">
                <span className="font-body text-sm text-cream/40">{row.old}</span>
              </div>
              <div className="px-6 py-4 text-center bg-saffron/[0.03]">
                <span className="font-body text-sm text-cream/80">{row.vox}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
