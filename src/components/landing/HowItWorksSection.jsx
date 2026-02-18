import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';

const steps = [
  {
    numeral: '\u0967',
    label: 'Design',
    heading: 'Define Your Questions',
    description:
      'Choose your survey type, target audience, and languages. Our AI helps craft culturally sensitive questions that feel natural in conversation.',
  },
  {
    numeral: '\u0968',
    label: 'Call',
    heading: 'AI Calls Respondents',
    description:
      'Our voice AI calls respondents in their native language across 10 Indian languages. No interviewer bias, no social pressure \u2014 respondents give more honest answers to an AI than to a human, especially on sensitive topics like caste, income, and political preference.',
  },
  {
    numeral: '\u0969',
    label: 'Analyze',
    heading: 'Transcribe & Structure',
    description:
      'Every response is transcribed in real-time, translated to English, and structured into clean data. Sentiment analysis and demographic extraction happen automatically. Missed a call? The respondent can call back anytime \u2014 the AI is available 24/7.',
  },
  {
    numeral: '\u096A',
    label: 'Report',
    heading: 'Get Actionable Insights',
    description:
      'Receive cross-tabulations, demographic breakdowns, and AI-generated summaries. Run 1,000 calls in a single afternoon. From phone call to research report in 48 hours.',
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

const HowItWorksSection = () => {
  return (
    <section className="py-20 lg:py-40 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <SectionHeading number={4} title="How VoxBharat Works" />
        </motion.div>

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
            {/* Label + line */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-[#c4a04a]/30" />
              <span className="uppercase text-xs tracking-[0.15em] text-[#6b4c3a]">
                {step.label}
              </span>
            </div>

            {/* Heading */}
            <h3 className="font-display text-[1.5rem] md:text-[2.25rem] text-[#3d2314] font-bold leading-tight">
              {step.heading}
            </h3>

            {/* Description */}
            <p className="mt-4 text-[#6b4c3a] text-lg leading-relaxed max-w-2xl">
              {step.description}
            </p>
          </motion.div>
        ))}

        {/* Why voice AI callout */}
        <motion.div
          className="mt-24 bg-ink rounded-2xl p-8 md:p-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h3 className="font-display text-xl md:text-2xl font-bold text-cream mb-4">
            Why voice AI, not human interviewers?
          </h3>
          <p className="font-body text-cream/70 leading-relaxed mb-5">
            Survey research has a well-documented problem: <span className="text-cream font-medium">social desirability bias</span>.
            When a real person asks you questions, you give answers that make you look good. You overreport
            voting and charity. You underreport drinking, prejudice, and income.
          </p>
          <p className="font-body text-cream/70 leading-relaxed">
            People feel less judged talking to a machine. An AI interviewer that speaks your language,
            never rushes you, never judges you, and is available whenever you want to talk &mdash; that&rsquo;s not just
            more efficient. It produces <span className="text-cream font-medium">fundamentally more honest data</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
