import React, { useState } from 'react';

export default function AboutPage({ navigateTo }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-6">
              About <span className="gradient-text-warm">VoxBharat</span>
            </h1>
            <div className="space-y-4 font-body text-gray-600 leading-relaxed">
              <p>
                India is the world's largest democracy, yet traditional polling consistently fails to capture
                the true voice of its 1.4 billion people. Language barriers, rural inaccessibility, and
                cultural hesitance leave hundreds of millions unheard.
              </p>
              <p>
                VoxBharat changes that. Using advanced voice AI, we conduct natural phone conversations
                in 12 Indian languages, reaching respondents where they are — from Mumbai high-rises
                to villages in Bihar. No apps to download, no literacy required.
              </p>
              <p>
                Our AI doesn't just ask questions — it listens. It handles code-switching between languages,
                understands regional idioms, and adapts its tone to build genuine rapport. The result:
                higher response rates, richer data, and insights that actually represent Bharat.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Languages Supported', value: '12', sub: 'and growing' },
              { label: 'Response Rate', value: '68%', sub: 'vs 12% traditional' },
              { label: 'Cost Per Interview', value: '~40', sub: 'rupees average' },
              { label: 'Average Call Duration', value: '4:30', sub: 'minutes' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border text-center">
                <div className="font-display text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="font-body text-sm font-medium text-[#3d2314] mt-1">{stat.label}</div>
                <div className="font-body text-xs text-gray-400 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-6">Our Mission</h2>
          <p className="font-body text-gray-600 leading-relaxed mb-4">
            Traditional polling in India has a fundamental problem: it can't reach the people who matter most.
            The farmer in rural Madhya Pradesh, the fisherwoman in coastal Kerala, the daily-wage worker in
            Kolkata's lanes — their voices shape elections, markets, and policy, yet they're systematically excluded
            from the data that drives decisions.
          </p>
          <p className="font-body text-gray-600 leading-relaxed mb-4">
            We built VoxBharat to close this gap. Our AI conducts thousands of natural voice conversations
            simultaneously across 12 languages, reaching respondents on the only device they carry —
            their mobile phone. No internet needed, no app to install, no literacy required.
          </p>
          <p className="font-body text-gray-600 leading-relaxed">
            The result is data that finally represents all of India — not just the English-speaking,
            urban, online minority. Better data means better decisions, and better decisions mean
            a more representative democracy.
          </p>
        </div>

        {/* What sets us apart */}
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-8">What Sets Us Apart</h2>
          <div className="space-y-6">
            {[
              { title: 'True Multilingual AI', desc: 'Not just translation — our voice models understand cultural context, code-switching, and regional idioms across 12 Indian languages.' },
              { title: 'Rural-First Design', desc: 'Works on basic feature phones over 2G networks. 73% of our respondents are from rural areas that traditional polls miss entirely.' },
              { title: 'Bias-Free Methodology', desc: 'No interviewer bias, no leading questions, no social desirability effects. Every respondent gets the same consistent, empathetic AI interviewer.' },
              { title: 'Real-Time Analysis', desc: 'Responses are transcribed, translated, structured, and analyzed as they come in. No weeks-long processing — see results as calls complete.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#e8550f]/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#e8550f]" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#3d2314] mb-1">{item.title}</h3>
                  <p className="font-body text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqsPage({ navigateTo }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-4">
            Frequently Asked <span className="gradient-text-warm">Questions</span>
          </h1>
          <p className="font-body text-lg text-gray-500">
            Everything you need to know about VoxBharat.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How does the AI handle different dialects within a language?',
              a: 'Our voice models are trained on diverse regional speech patterns. The AI recognizes dialectal variations in pronunciation, vocabulary, and grammar — whether it\'s Bhojpuri-influenced Hindi or Sylheti Bengali. It adapts its responses to match the respondent\'s natural speech.',
            },
            {
              q: 'What happens if the respondent doesn\'t want to participate?',
              a: 'The AI always introduces itself and asks for consent before proceeding. If the respondent declines, the call ends politely and their number is flagged to avoid re-contact. Participation is entirely voluntary.',
            },
            {
              q: 'How accurate are the survey results compared to traditional methods?',
              a: 'In benchmark studies, our AI-conducted surveys have shown comparable accuracy to in-person interviews, with significantly better reach into underrepresented demographics. The consistent methodology eliminates interviewer bias — a major issue in traditional Indian polling.',
            },
            {
              q: 'Can I customize the survey questions and flow?',
              a: 'Yes. Our survey builder lets you design custom questionnaires with multiple question types (single choice, Likert scale, open-ended, etc.). You can set branching logic, choose target demographics, and select which languages to deploy in.',
            },
            {
              q: 'What languages are currently supported?',
              a: 'We currently support 12 languages: Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, and Urdu. Together these cover over 95% of India\'s population. More languages are being added regularly.',
            },
            {
              q: 'How long does it take to get results?',
              a: 'Most surveys are completed within 24-48 hours. The AI can conduct thousands of calls simultaneously, so even large sample sizes (10,000+) are typically done within two days. Results are available in real-time as calls complete.',
            },
            {
              q: 'Is respondent data kept private?',
              a: 'Absolutely. All data is encrypted in transit and at rest. Phone numbers are hashed and never stored in plain text. Individual responses are anonymized before analysis. We comply with India\'s Digital Personal Data Protection Act.',
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
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl border hover:shadow-md transition-shadow">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 cursor-pointer font-body font-medium text-[#3d2314] text-left"
              >
                <span>{item.q}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 font-body text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions? */}
        <div className="mt-16 text-center bg-white rounded-2xl border p-8">
          <h3 className="font-display text-2xl font-bold text-[#3d2314] mb-2">Still have questions?</h3>
          <p className="font-body text-gray-500 mb-4">We're happy to help with anything else.</p>
          <a
            href="mailto:hello@voxbharat.com"
            className="inline-block px-6 py-3 bg-[#e8550f] text-white rounded-full font-body font-medium hover:bg-[#cc4400] transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
}
