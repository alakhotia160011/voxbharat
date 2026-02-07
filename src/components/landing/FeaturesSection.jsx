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

const pairVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
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

        <div className="space-y-12">
          {pairs.map((pair, i) => (
            <motion.div
              key={i}
              className="flex flex-col md:flex-row items-start gap-8 md:gap-16"
              variants={pairVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              custom={i}
            >
              {/* Problem */}
              <p className="flex-1 font-display text-xl text-[#6b4c3a]/60 line-through decoration-[#e8550f]/40 decoration-2">
                {pair.problem}
              </p>

              {/* Solution */}
              <p className="flex-1 font-body text-lg text-[#3d2314] font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-[#e8550f] mr-2 relative -top-px" />
                {pair.solution}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
