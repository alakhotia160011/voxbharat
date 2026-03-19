import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, sectionViewport } from '../../styles/animations';

const steps = [
  {
    numeral: '१',
    title: 'Design Survey',
    description: 'Create questions manually or let AI generate them. Choose languages, tone, and voice.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    numeral: '२',
    title: 'AI Calls',
    description: 'Our AI calls respondents in their language. Natural conversation, not robotic scripts.',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  },
  {
    numeral: '३',
    title: 'Get Insights',
    description: 'Real-time transcripts, translations, sentiment analysis, and structured data.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

export default function HowItWorksSectionV2() {
  return (
    <section className="py-24 lg:py-32 px-6 bg-cream">
      <motion.div
        className="max-w-5xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <span className="font-mono text-[11px] tracking-[0.25em] text-saffron/60 uppercase">How It Works</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-earth mt-3">
            Three Steps to Insights
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Dashed connector */}
          <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-earth/10" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="bg-white border border-cream-warm rounded-2xl p-8 text-center relative hover:shadow-lg transition-shadow"
            >
              {/* Step number */}
              <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-saffron/10 flex items-center justify-center">
                <span className="font-serif-indic text-xl text-saffron">{step.numeral}</span>
              </div>
              <svg className="w-8 h-8 mx-auto mb-4 text-earth/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
              </svg>
              <h3 className="font-heading text-lg font-semibold text-earth mb-2">{step.title}</h3>
              <p className="font-body text-sm text-earth-mid leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
