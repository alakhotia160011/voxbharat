import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';
import SectionDivider from '../layout/SectionDivider';
import { fadeInUp, staggerContainer, sectionViewport } from '../../styles/animations';

const comparisonData = [
  { metric: 'Cost / Response', cati: '\u20B9300+', vox: '~\u20B940' },
  { metric: 'Time to Insights', cati: '4 to 8 weeks', vox: 'Days to 2 weeks' },
  { metric: 'Languages', cati: '2 to 3', vox: '10 Indian languages' },
  { metric: 'Interviewer Bias', cati: 'High', vox: 'Minimal (AI consistent)' },
  { metric: 'Rural Reach', cati: 'Metro centric', vox: 'Any phone, anywhere' },
  { metric: 'Scale', cati: 'Linear', vox: '1,000s of parallel calls' },
];

const customers = [
  {
    title: 'Corporate Research',
    desc: 'Automotive, FMCG, telecom, finserv, e-commerce \u2014 hear from Hindi, Bengali, Tamil, Telugu speaking customers beyond metros.',
  },
  {
    title: 'Political Polling',
    desc: '900M eligible voters in 29 states, where accuracy demands reaching vernacular speakers in rural constituencies.',
  },
  {
    title: 'Think Tanks & Research',
    desc: 'Development impact studies that require ground-truth data from diverse populations across India.',
  },
  {
    title: 'Financial Firms',
    desc: 'Proprietary, curated datasets from real Indian consumers for market intelligence.',
  },
];

const competitors = [
  {
    name: 'Legacy Incumbents',
    examples: 'Kantar, Nielsen, Ipsos',
    desc: 'In India for decades. Deep distribution but structurally tied to human call centers. Their business models are not built for automation.',
  },
  {
    name: 'AI-Native Western Players',
    examples: 'Listen Labs, Outset.ai, Voicepanel, Miravoice, Conveo',
    desc: 'All building for English-speaking, web-native Western markets. None are solving for India\u2019s linguistic complexity, rural telephony distribution, or voice-first user base.',
  },
  {
    name: 'Synthetic Respondents',
    examples: 'Simile, Aaru',
    desc: 'Simulate AI societies instead of surveying real humans. Interesting for mature Western markets, but in India the problem is reaching the real consumers who have never been asked.',
  },
];

export default function MemoPage({ navigateTo }) {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="py-20 lg:py-32 px-6">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-4">
            <span className="font-body text-sm text-earth-mid tracking-widest uppercase">
              VoxBharat.ai &middot; February 2026
            </span>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <h1 className="font-display font-bold text-earth text-4xl md:text-6xl lg:text-7xl leading-tight">
              AI Voice Surveys for Customer Research in India
            </h1>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <p className="mt-6 font-body text-xl md:text-2xl text-earth-mid leading-relaxed max-w-3xl">
              Every Language. Every Citizen.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── The Problem ── */}
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
              title="The Problem"
              subtitle="India's research infrastructure cannot hear most of the country."
            />
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-12 space-y-6 max-w-3xl">
            <p className="font-body text-earth-mid text-lg leading-relaxed">
              India has the world&rsquo;s cheapest mobile data, 85.5% smartphone household penetration, and 504 million rural internet users who now outnumber urban users. A farmer in Bihar pays for groceries on UPI and watches YouTube daily. Yet when a brand, political party, or research firm wants to know what this person actually thinks, they call a CATI center in Gurugram where agents read scripts in Hindi or English at &#x20B9;300+ per completed response.
            </p>
            <p className="font-body text-earth-mid text-lg leading-relaxed">
              The gap is structural. 22 official languages, but call centers cover 2 or 3. 63% of India is rural, but research infrastructure sits in 5 metro cities. Surveys take 4 to 8 weeks. Human interviewers introduce social desirability bias. And the 630 million Indians who are offline or digitally illiterate can only be reached by voice.
            </p>
            <p className="font-body text-earth font-medium text-lg leading-relaxed">
              India&rsquo;s $3.4B research industry, the world&rsquo;s third largest and growing 12.6% YoY, runs on infrastructure that cannot hear most of the country.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── The Solution ── */}
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
              number={2}
              title="The Solution"
              subtitle="AI-powered voice surveys in Indian languages, delivered via phone call."
            />
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-8 max-w-3xl">
            <p className="font-body text-earth-mid text-lg leading-relaxed">
              VoxBharat is the biggest bet on monetizing the friction between 1.46 billion disintegrated humans and the organizations that need to hear them. Our AI interviewers replace CATI call centers. They are faster, cheaper, less biased, always available, and fluent in every language that matters.
            </p>
          </motion.div>

          {/* Comparison Table */}
          <motion.div variants={fadeInUp} className="mt-12 overflow-x-auto">
            <table className="w-full max-w-3xl border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-display font-bold text-earth text-sm py-4 pr-6 border-b-2 border-saffron/30"></th>
                  <th className="text-left font-display font-bold text-earth-mid text-sm py-4 pr-6 border-b-2 border-saffron/30">Traditional CATI</th>
                  <th className="text-left font-display font-bold text-saffron text-sm py-4 border-b-2 border-saffron/30">VoxBharat</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-cream' : ''}>
                    <td className="font-body font-medium text-earth text-sm py-3.5 pr-6 border-b border-gold/10">{row.metric}</td>
                    <td className="font-body text-earth-mid text-sm py-3.5 pr-6 border-b border-gold/10">{row.cati}</td>
                    <td className="font-body font-medium text-saffron text-sm py-3.5 border-b border-gold/10">{row.vox}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-body text-xs text-earth-mid/60 italic max-w-3xl">
              *Concurrency is expensive but still significantly cheaper than staffing a human call center at equivalent scale.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── Why VoxBharat ── */}
      <section className="py-20 lg:py-32 px-6 bg-earth">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="max-w-3xl">
            <SectionHeading number={3} title="Why VoxBharat" light />
          </motion.div>

          <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl">
            <motion.div variants={fadeInUp} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="font-display font-bold text-cream text-lg mb-3">Voice AI Is Production Ready</h3>
              <p className="font-body text-cream/70 text-sm leading-relaxed">
                TTS, STT, and LLMs now work in Indian languages. Each 5-minute AI voice survey costs $0.15 to $0.20 in compute and telephony, vs. $3.50+ for a human CATI call.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="font-display font-bold text-cream text-lg mb-3">The Category Is Proven</h3>
              <p className="font-body text-cream/70 text-sm leading-relaxed">
                Listen Labs (SF) raised $100M total ($69M Series B, Jan 2026) at a $500M valuation. Sequoia backed. 1M+ interviews. 15x revenue growth in 9 months. Clients include Microsoft, Robinhood, Canva. But Listen Labs builds for the West. India is wide open.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="font-display font-bold text-cream text-lg mb-3">The Data Is Actually Better</h3>
              <p className="font-body text-cream/70 text-sm leading-relaxed">
                Human interviewers introduce social desirability bias. AI interviewers sidestep this. Respondents feel less judged talking to a machine and give more honest answers, especially on sensitive topics like income, caste, political preference, and health.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="font-display font-bold text-cream text-lg mb-3">Distribution Infrastructure Exists</h3>
              <p className="font-body text-cream/70 text-sm leading-relaxed">
                140M Indians use voice search in native languages. 57% of internet users prefer regional language content. The rails to reach anyone, anywhere in India, by phone, are already laid.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── Who Needs This ── */}
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
              number={4}
              title="Who Needs This"
              subtitle="From boardrooms to ballot boxes, anyone who needs to hear India."
            />
          </motion.div>

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl">
            {customers.map((c, i) => (
              <motion.div key={i} variants={fadeInUp} className="border border-gold/20 rounded-2xl p-7 hover:border-saffron/40 transition-colors">
                <h3 className="font-display font-bold text-earth text-lg mb-2">{c.title}</h3>
                <p className="font-body text-earth-mid text-sm leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── Competitive Landscape ── */}
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
              number={5}
              title="Competitive Landscape"
              subtitle="a16z's market map splits this industry into three layers: software incumbents, research networks, and AI-native products. VoxBharat sits in the third category, purpose-built for India."
            />
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-6 max-w-3xl">
            <p className="font-body text-earth-mid text-base leading-relaxed">
              This market is not winner-takes-all. India&rsquo;s research industry is fragmented across regions, languages, and verticals. Market share depends on three things: how fast you can access the market, how good your research actually is, and how useful the feedback from early design partners turns out to be.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6 max-w-4xl">
            {competitors.map((c, i) => (
              <motion.div key={i} variants={fadeInUp} className="border-l-4 border-gold/40 pl-6 py-2">
                <h3 className="font-display font-bold text-earth text-lg">{c.name}</h3>
                <p className="font-body text-saffron text-sm mt-1">{c.examples}</p>
                <p className="font-body text-earth-mid text-sm leading-relaxed mt-2">{c.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* VoxBharat positioning */}
          <motion.div variants={fadeInUp} className="mt-12 bg-saffron/5 border border-saffron/20 rounded-2xl p-8 max-w-4xl">
            <h3 className="font-display font-bold text-saffron text-xl mb-3">VoxBharat: Purpose-Built for India</h3>
            <p className="font-body text-earth text-base leading-relaxed">
              The AI stack commoditizes. Distribution does not. The moat is access to respondent networks across India&rsquo;s languages and geographies, plus the proprietary dataset of Indian consumer sentiment that compounds with every survey.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ── a16z Market Context ── */}
      <section className="py-20 lg:py-28 px-6 bg-earth">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <p className="font-body text-cream/50 text-sm uppercase tracking-widest mb-6">a16z Market Research Thesis</p>
            <blockquote className="font-display text-cream text-2xl md:text-3xl lg:text-4xl font-bold leading-tight max-w-3xl mx-auto">
              &ldquo;A $140B global industry where software is little more than a rounding error&rdquo;
            </blockquote>
            <p className="mt-6 font-body text-cream/60 text-base max-w-2xl mx-auto">
              AI is ready to shift labor spend into software. Listen Labs proved the model at $500M valuation. VoxBharat brings it to the world&rsquo;s largest untapped market.
            </p>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
