import React from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';
import SectionDivider from '../layout/SectionDivider';
import { fadeInUp, scaleIn, staggerContainer, sectionViewport } from '../../styles/animations';

const commitments = [
  {
    title: 'Informed Consent',
    desc: 'Every call begins with a clear disclosure that the respondent is speaking with an AI. Participation is voluntary and can be ended at any time.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ),
  },
  {
    title: 'Data Encryption',
    desc: 'All voice data and survey responses are encrypted using AES-256 in transit and at rest. Audio recordings are processed and deleted, never stored permanently.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    ),
  },
  {
    title: 'Anonymization',
    desc: 'Phone numbers are hashed before storage. Individual responses cannot be traced back to specific individuals. All analysis uses aggregated, de-identified data.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    ),
  },
  {
    title: 'Regulatory Compliance',
    desc: "We comply with India's Digital Personal Data Protection Act (DPDPA) 2023, TRAI guidelines for automated calls, and international standards including GDPR principles.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
    ),
  },
  {
    title: 'Data Retention',
    desc: 'Survey data is retained only for the duration agreed upon with the client. Respondents can request deletion of their data at any time through our support channels.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
  },
  {
    title: 'No Selling of Data',
    desc: 'Respondent data is never sold, shared with third parties, or used for purposes beyond the commissioned research. Your data belongs to you.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
    ),
  },
];

const policySections = [
  {
    numeral: '१',
    title: 'Data Collection',
    body: 'We collect only the data necessary for the commissioned survey: voice responses (temporarily for transcription), demographic information voluntarily provided by respondents, and call metadata (duration, language, completion status). Phone numbers provided by clients are used solely for outreach and are hashed immediately upon call completion.',
  },
  {
    numeral: '२',
    title: 'Data Processing',
    body: 'Voice recordings are transcribed in real-time and deleted immediately after transcription. Transcripts are translated, analyzed for sentiment, and structured into quantitative data points. All processing happens on encrypted infrastructure. No human listens to recordings unless explicitly authorized for quality assurance.',
  },
  {
    numeral: '३',
    title: 'Your Rights',
    body: 'Respondents may request access to their data, correction of inaccurate information, or complete deletion of their records at any time. Clients retain full ownership of aggregated survey data. We do not claim any intellectual property rights over the insights generated from your surveys.',
  },
];

export default function DataPolicyPage({ navigateTo }) {
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
              title="Data & Privacy"
              subtitle="Trust is the foundation of good research. Here's how we protect every respondent."
            />
          </motion.div>

          <motion.div
            className="mt-6 font-serif-indic text-[6rem] md:text-[10rem] text-gold/10 leading-none select-none pointer-events-none"
            variants={fadeInUp}
            aria-hidden
          >
            गोपनीय
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Commitment cards */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={sectionViewport}
            variants={staggerContainer}
          >
            {commitments.map((item, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-6 border border-indigo/10 hover:shadow-lg transition-shadow"
                variants={scaleIn}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-light flex items-center justify-center mb-4 text-indigo">
                  {item.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-earth mb-2">{item.title}</h3>
                <p className="font-body text-sm text-earth-mid leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* Detailed policy — dark section */}
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
                title="Our Policies in Detail"
                light
              />
            </motion.div>
          </motion.div>

          <div className="mt-16 space-y-16">
            {policySections.map((section) => (
              <motion.div
                key={section.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={staggerContainer}
              >
                <motion.div className="flex items-center gap-3 mb-4" variants={fadeInUp}>
                  <span className="text-2xl font-serif-indic text-gold leading-none">
                    {section.numeral}
                  </span>
                  <div className="flex-1 h-px bg-gold/30" />
                </motion.div>
                <motion.h3
                  className="font-display text-2xl md:text-3xl text-cream font-bold mb-4"
                  variants={fadeInUp}
                >
                  {section.title}
                </motion.h3>
                <motion.p className="text-cream/70 leading-relaxed" variants={fadeInUp}>
                  {section.body}
                </motion.p>
              </motion.div>
            ))}

            {/* Contact */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeInUp}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-serif-indic text-gold leading-none">४</span>
                <div className="flex-1 h-px bg-gold/30" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl text-cream font-bold mb-4">
                Contact
              </h3>
              <p className="text-cream/70 leading-relaxed">
                For any data-related inquiries, deletion requests, or privacy concerns, reach us at{' '}
                <a href="mailto:privacy@voxbharat.com" className="text-saffron hover:underline">
                  privacy@voxbharat.com
                </a>.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
