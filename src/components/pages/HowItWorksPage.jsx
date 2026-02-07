import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';
import SectionDivider from '../layout/SectionDivider';
import { fadeInUp, staggerContainer, sectionViewport } from '../../styles/animations';

const steps = [
  {
    numeral: '१',
    label: 'Design',
    heading: 'Define Your Questions',
    description:
      'Choose your survey type, target audience, and languages. Our AI helps craft culturally sensitive questions that feel natural in conversation.',
    detail: [
      'Start by choosing from our template library or build from scratch. Select your target audience by geography, demographics, and language. Our builder supports multiple question types including single choice, Likert scales, open-ended questions, and NPS scores.',
      'Questions are automatically adapted for cultural context — phrasing that works in Hindi may not translate directly to Tamil. Our AI handles these nuances so you get natural, unbiased conversations.',
    ],
  },
  {
    numeral: '२',
    label: 'Call',
    heading: 'AI Calls Respondents',
    description:
      'Our voice AI calls respondents in their native language — Hindi, Bengali, Tamil, and 9 more. Natural conversation, not robotic scripts.',
    detail: [
      'Our AI uses Cartesia Sonic 3 for ultra-low-latency speech synthesis. Calls sound natural and human-like, with support for code-switching (mixing languages mid-sentence), regional accents, and conversational flow.',
      'The AI adapts in real-time — if a respondent gives a short answer, it probes further. If they go off-topic, it gently redirects. Every conversation feels personal, not scripted.',
    ],
  },
  {
    numeral: '३',
    label: 'Analyze',
    heading: 'Transcribe & Structure',
    description:
      'Every response is transcribed, translated to English, and structured into clean data. Sentiment analysis and demographic extraction happen automatically.',
    detail: [
      'Every response is transcribed and translated to English in real-time. Our pipeline extracts structured data, runs sentiment analysis, and flags key themes automatically.',
      'You get a live dashboard with demographic breakdowns, cross-tabulations, and exportable datasets in CSV and JSON formats. Reports include AI-generated summaries with confidence intervals and margin of error calculations.',
    ],
  },
  {
    numeral: '४',
    label: 'Report',
    heading: 'Get Actionable Insights',
    description:
      'Receive cross-tabulations, demographic breakdowns, and AI-generated summaries. From phone call to research report in 48 hours.',
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
};

export default function HowItWorksPage({ navigateTo, setShowBuilder }) {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 lg:py-32 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <SectionHeading
              number={1}
              title="How It Works"
              subtitle="From survey creation to actionable insights in four simple steps."
            />
          </motion.div>

          {/* Watermark */}
          <motion.div
            className="mt-6 font-serif-indic text-[6rem] md:text-[10rem] text-gold/10 leading-none select-none pointer-events-none"
            variants={fadeInUp}
            aria-hidden
          >
            कैसे
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Steps — vertical editorial layout matching landing HowItWorksSection */}
      <section className="py-20 lg:py-40 px-6">
        <div className="max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              className={i < steps.length - 1 ? 'mb-20' : ''}
              variants={stepVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              custom={i}
            >
              {/* Numeral row */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[2.5rem] font-serif-indic text-gold leading-none">
                  {step.numeral}
                </span>
                <div className="flex-1 h-px bg-gold/30 self-center" />
                <span className="uppercase text-xs tracking-[0.15em] text-earth-mid">
                  {step.label}
                </span>
              </div>

              {/* Heading */}
              <h3 className="font-display text-[1.5rem] md:text-[2.25rem] text-earth font-bold leading-tight">
                {step.heading}
              </h3>

              {/* Short description */}
              <p className="mt-4 text-earth-mid text-lg leading-relaxed max-w-2xl">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* Deep-dive prose sections */}
      <section className="bg-ink py-20 lg:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={sectionViewport}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <SectionHeading
                number={2}
                title="Under the Hood"
                subtitle="A closer look at each phase of the process."
                light
              />
            </motion.div>
          </motion.div>

          <div className="mt-16 space-y-16">
            {steps.filter((s) => s.detail).map((step, i) => (
              <motion.div
                key={step.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={staggerContainer}
              >
                <motion.div className="flex items-center gap-3 mb-4" variants={fadeInUp}>
                  <span className="text-2xl font-serif-indic text-gold leading-none">
                    {step.numeral}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-cream font-bold">
                    {step.heading}
                  </h3>
                </motion.div>
                {step.detail.map((para, j) => (
                  <motion.p
                    key={j}
                    className="text-cream/70 leading-relaxed mb-4 last:mb-0"
                    variants={fadeInUp}
                  >
                    {para}
                  </motion.p>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* CTA — mirrors landing CTASection */}
      <section className="bg-gradient-to-r from-saffron to-saffron-deep w-full py-20 lg:py-32 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h2 className="font-display text-[2rem] md:text-[2.5rem] lg:text-[3.5rem] text-white font-bold leading-tight">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg mt-4">
            Create your first voice survey in minutes. No coding required.
          </p>
          <motion.button
            onClick={() => setShowBuilder(true)}
            className="px-10 py-5 bg-white text-saffron rounded-full text-lg font-semibold mt-10 hover:bg-white/90 transition-colors cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Create Your First Survey
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
