import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';
import SectionDivider from '../layout/SectionDivider';
import AnimatedCounter from '../shared/AnimatedCounter';
import { fadeInUp, scaleIn, staggerContainer, sectionViewport } from '../../styles/animations';

/* ─── About Page ─── */
export default function AboutPage({ navigateTo }) {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 lg:py-32 px-6">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="max-w-3xl">
            <SectionHeading
              number={1}
              title="About VoxBharat"
              subtitle="India is the world's largest democracy, yet traditional polling consistently fails to capture the true voice of its 1.4 billion people."
            />
          </motion.div>

          <motion.div
            className="mt-6 font-serif-indic text-[6rem] md:text-[10rem] text-gold/10 leading-none select-none pointer-events-none"
            variants={fadeInUp}
            aria-hidden
          >
            वॉक्स
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Stats — dark band with AnimatedCounter */}
      <section className="bg-ink py-16 lg:py-24 px-6">
        <motion.div
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          {[
            { value: 12, suffix: '', label: 'Languages', sub: 'and growing' },
            { value: 68, suffix: '%', label: 'Response Rate', sub: 'vs 12% traditional' },
            { value: 40, suffix: '', label: 'Cost Per Call', sub: '~₹ average' },
            { value: 48, suffix: 'h', label: 'To Report', sub: 'end to end' },
          ].map((stat, i) => (
            <motion.div key={i} variants={scaleIn}>
              <div className="font-display text-4xl md:text-5xl font-bold text-saffron">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="font-body text-sm font-medium text-cream mt-2">{stat.label}</div>
              <div className="font-body text-xs text-cream/40 mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <SectionDivider />

      {/* Mission prose */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={sectionViewport}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <SectionHeading number={2} title="Our Mission" />
            </motion.div>

            <motion.p className="mt-8 text-earth-mid text-lg leading-relaxed" variants={fadeInUp}>
              Language barriers, rural inaccessibility, and cultural hesitance leave hundreds of
              millions unheard. VoxBharat changes that. Using advanced voice AI, we conduct natural
              phone conversations in 10 Indian languages, reaching respondents where they are, from
              Mumbai high-rises to villages in Bihar. No apps to download, no literacy required.
            </motion.p>
            <motion.p className="mt-4 text-earth-mid text-lg leading-relaxed" variants={fadeInUp}>
              Our AI doesn't just ask questions. It listens. It handles code-switching between
              languages, understands regional idioms, and adapts its tone to build genuine rapport.
              The result: higher response rates, richer data, and insights that actually represent
              Bharat.
            </motion.p>
            <motion.p className="mt-4 text-earth-mid text-lg leading-relaxed" variants={fadeInUp}>
              The result is data that finally represents all of India, not just the
              English-speaking, urban, online minority. Better data means better decisions, and
              better decisions mean a more representative democracy.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* What Sets Us Apart */}
      <section className="bg-ink py-20 lg:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={sectionViewport}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <SectionHeading number={3} title="What Sets Us Apart" light />
            </motion.div>

            <div className="mt-12 space-y-10">
              {[
                {
                  title: 'True Multilingual AI',
                  desc: "Not just translation. Our voice models understand cultural context, code-switching, and regional idioms across 10 Indian languages.",
                },
                {
                  title: 'Rural-First Design',
                  desc: 'Works on basic feature phones over 2G networks. 73% of our respondents are from rural areas that traditional polls miss entirely.',
                },
                {
                  title: 'Bias-Free Methodology',
                  desc: 'No interviewer bias, no leading questions, no social desirability effects. Every respondent gets the same consistent, empathetic AI interviewer.',
                },
                {
                  title: 'Real-Time Analysis',
                  desc: 'Responses are transcribed, translated, structured, and analyzed as they come in. No weeks-long processing. See results as calls complete.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="flex gap-5"
                  variants={fadeInUp}
                >
                  <div className="w-8 h-8 rounded-full bg-saffron/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-saffron" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-cream mb-1">
                      {item.title}
                    </h3>
                    <p className="text-cream/70 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ─── FAQs Page ─── */

const faqs = [
  {
    q: 'How does the AI handle different dialects within a language?',
    a: "Our voice models are trained on diverse regional speech patterns. The AI recognizes dialectal variations in pronunciation, vocabulary, and grammar, whether it's Bhojpuri-influenced Hindi or Sylheti Bengali. It adapts its responses to match the respondent's natural speech.",
  },
  {
    q: "What happens if the respondent doesn't want to participate?",
    a: 'The AI always introduces itself and asks for consent before proceeding. If the respondent declines, the call ends politely and their number is flagged to avoid re-contact. Participation is entirely voluntary.',
  },
  {
    q: 'How accurate are the survey results compared to traditional methods?',
    a: 'In benchmark studies, our AI-conducted surveys have shown comparable accuracy to in-person interviews, with significantly better reach into underrepresented demographics. The consistent methodology eliminates interviewer bias, a major issue in traditional Indian polling.',
  },
  {
    q: 'Can I customize the survey questions and flow?',
    a: 'Yes. Our survey builder lets you design custom questionnaires with multiple question types (single choice, Likert scale, open-ended, etc.). You can set branching logic, choose target demographics, and select which languages to deploy in.',
  },
  {
    q: 'What languages are currently supported?',
    a: "We currently support 10 languages: Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, and English. Together these cover over 95% of India's population. More languages are being added regularly.",
  },
  {
    q: 'How long does it take to get results?',
    a: 'Most surveys are completed within 24-48 hours. The AI can conduct thousands of calls simultaneously, so even large sample sizes (10,000+) are typically done within two days. Results are available in real-time as calls complete.',
  },
  {
    q: 'Is respondent data kept private?',
    a: "Absolutely. All data is encrypted in transit and at rest. Phone numbers are hashed and never stored in plain text. Individual responses are anonymized before analysis. We comply with India's Digital Personal Data Protection Act.",
  },
  {
    q: 'How does pricing work?',
    a: 'Pricing is based on the number of completed interviews and languages used. Our per-interview cost is roughly 10x cheaper than traditional in-person polling. Contact us for a custom quote based on your survey needs.',
  },
  {
    q: 'Can the AI handle interruptions or off-topic responses?',
    a: 'Yes. The AI is designed for natural conversation flow. If a respondent goes off-topic, it gently redirects. If they interrupt, it pauses and lets them speak. If they need a question repeated, it rephrases naturally rather than reading the same script.',
  },
  {
    q: 'What kind of reports do I get?',
    a: 'You receive a full dashboard with demographic breakdowns, sentiment analysis, cross-tabulations, and AI-generated summaries. Data is exportable in CSV and JSON formats. Each completed call also generates an individual transcript with translation.',
  },
];

const faqItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export function FaqsPage({ navigateTo }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div>
      {/* Hero */}
      <section className="py-20 lg:py-32 px-6">
        <motion.div
          className="max-w-3xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <SectionHeading
              number={1}
              title="Frequently Asked Questions"
              subtitle="Everything you need to know about VoxBharat."
            />
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* FAQ accordion */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {faqs.map((item, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-xl border border-cream-warm overflow-hidden"
                variants={faqItemVariants}
                custom={i}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 cursor-pointer font-body font-medium text-earth text-left"
                >
                  <span>{item.q}</span>
                  <motion.svg
                    className="w-5 h-5 text-earth-mid flex-shrink-0 ml-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 font-body text-sm text-earth-mid leading-relaxed border-t border-cream-warm pt-4">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>

          {/* Still have questions? */}
          <motion.div
            className="mt-16 text-center bg-white rounded-2xl border border-cream-warm p-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
          >
            <h3 className="font-display text-2xl font-bold text-earth mb-2">Still have questions?</h3>
            <p className="font-body text-earth-mid mb-6">We're happy to help with anything else.</p>
            <motion.a
              href="mailto:hello@voxbharat.com"
              className="inline-block px-8 py-3 bg-saffron text-white rounded-full font-body font-medium hover:bg-saffron-deep transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Get in Touch
            </motion.a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
