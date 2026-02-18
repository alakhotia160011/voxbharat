import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';

const pairs = [
  {
    problem: 'Urban sampling bias in traditional polling',
    solution: '73% rural reach via mobile phones across 28 states',
  },
  {
    problem: 'No caste census data since 1931',
    solution: 'Real-time demographic weighting with AI-powered analysis',
  },
  {
    problem: 'Fear-based non-response to sensitive questions',
    solution: 'AI builds trust through empathetic conversation in native language',
  },
  {
    problem: 'Weeks to collect and process survey data',
    solution: 'Results delivered in 24-48 hours, from call to report',
  },
  {
    problem: '\u20B9400 per interview with human surveyors',
    solution: '10x cheaper at scale with consistent AI methodology',
  },
  {
    problem: 'Interviewer bias distorting sensitive responses',
    solution: 'Standardized AI approach eliminates human bias completely',
  },
];

const researchItems = [
  {
    title: 'Social Desirability Bias',
    body: 'When a real person asks you questions, you instinctively give answers that make you look good. You overreport voting, charity, and exercise. You underreport drinking, prejudice, and income. AI interviewers sidestep this \u2014 people feel less judged talking to a machine, so they give more honest answers.',
    highlight: 'Critical for sensitive topics in India: caste, income, political preference, and religious attitudes.',
  },
  {
    title: 'Always-On Availability',
    body: 'Traditional CATI call centers operate during business hours. Missed calls go unanswered. VoxBharat\u2019s AI agent is available 24/7 \u2014 it picks up callbacks from missed calls and conducts the full survey whenever the respondent is ready.',
    highlight: 'An AI agent that\u2019s always available, infinitely patient, and consistent in its methodology.',
  },
  {
    title: 'Scale Without Compromise',
    body: 'A human call center running 1,000 Hindi interviews takes weeks of hiring, training, and quality control. VoxBharat can run 1,000 calls simultaneously in a single afternoon \u2014 with identical methodology on every call, in any of 10 languages.',
    highlight: 'Speed, scale, and language coverage that no call center can match.',
  },
  {
    title: 'Open Research Questions',
    body: 'AI voice surveys are a new frontier in survey methodology. Active areas of improvement include real-time transcription accuracy, reducing primacy/recency effects in voice-read answer choices, and detecting respondent misbehavior like straightlining.',
    highlight: 'We\u2019re building in the open and improving with every call we make.',
  },
];

const pairVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

const FeaturesSection = () => {
  return (
    <section className="py-20 lg:py-40 px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          number={5}
          title="The Old Way is Broken"
          subtitle="Here's what we do differently."
          className="mb-20"
        />

        <div className="space-y-0 divide-y divide-cream-warm">
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-5"
              variants={pairVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              custom={i}
            >
              <p className="font-display text-base md:text-lg text-earth-mid/40 line-through decoration-saffron/30 decoration-1 text-right italic">
                {pair.problem}
              </p>
              <span className="w-2 h-2 rounded-full bg-saffron flex-shrink-0" />
              <p className="font-body text-base md:text-lg text-earth font-medium">
                {pair.solution}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Research Foundations */}
        <motion.div
          className="mt-24"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="uppercase text-xs tracking-[0.15em] text-earth-mid font-body">
              Research Foundations
            </span>
            <div className="h-px flex-1 bg-gold/30" />
          </div>

          <p className="text-earth-mid font-body text-lg leading-relaxed max-w-3xl mx-auto text-center mb-16">
            AI voice surveys aren&rsquo;t just faster and cheaper &mdash; they produce
            fundamentally different data. Here&rsquo;s why.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {researchItems.map((item, i) => (
              <motion.div
                key={item.title}
                className="bg-white border border-cream-warm rounded-xl p-7 relative overflow-hidden"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                custom={i}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-saffron/60 to-gold/40" />
                <h4 className="font-display text-lg font-bold text-earth mb-3">
                  {item.title}
                </h4>
                <p className="font-body text-sm text-earth-mid leading-relaxed mb-4">
                  {item.body}
                </p>
                <p className="font-body text-sm text-saffron-deep font-medium leading-snug">
                  {item.highlight}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
