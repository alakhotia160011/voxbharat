import React from 'react';
import { motion } from 'framer-motion';

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
      'Our voice AI calls respondents in their native language \u2014 Hindi, Bengali, Tamil, and 9 more. Natural conversation, not robotic scripts.',
  },
  {
    numeral: '\u0969',
    label: 'Analyze',
    heading: 'Transcribe & Structure',
    description:
      'Every response is transcribed, translated to English, and structured into clean data. Sentiment analysis and demographic extraction happen automatically.',
  },
  {
    numeral: '\u096A',
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

const HowItWorksSection = () => {
  return (
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
              <span className="text-[2.5rem] font-serif-indic text-[#c4a04a] leading-none">
                {step.numeral}
              </span>
              <div className="flex-1 h-px bg-[#c4a04a]/30 self-center" />
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
      </div>
    </section>
  );
};

export default HowItWorksSection;
