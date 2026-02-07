import React from 'react';

export default function HowItWorksPage({ navigateTo, setShowBuilder }) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-4">
            How It <span className="gradient-text-warm">Works</span>
          </h1>
          <p className="font-body text-lg text-gray-500 max-w-2xl mx-auto">
            From survey creation to actionable insights in four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-24">
          {[
            {
              step: '01',
              title: 'Design Your Survey',
              desc: 'Choose your topic, audience, and languages. Our builder helps you craft culturally appropriate questions.',
              icon: (
                <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              ),
            },
            {
              step: '02',
              title: 'AI Calls Respondents',
              desc: 'Our voice AI places calls in the respondent\'s native language, conducting natural conversations.',
              icon: (
                <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              ),
            },
            {
              step: '03',
              title: 'Responses Analyzed',
              desc: 'Every response is transcribed, translated, and structured automatically with sentiment analysis.',
              icon: (
                <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              ),
            },
            {
              step: '04',
              title: 'Get Your Report',
              desc: 'Receive a comprehensive report with demographics, cross-tabulations, and exportable datasets.',
              icon: (
                <svg className="w-7 h-7 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              ),
            },
          ].map((item, i) => (
            <div key={i} className="relative">
              {i < 3 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px border-t-2 border-dashed border-[#e8550f]/20 -translate-x-4" />
              )}
              <div className="bg-white rounded-2xl p-6 border hover:shadow-lg transition-shadow h-full">
                <div className="w-14 h-14 rounded-xl bg-[#e8550f]/10 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <div className="font-body text-xs font-bold text-[#e8550f] tracking-widest uppercase mb-2">Step {item.step}</div>
                <h3 className="font-display text-xl font-bold text-[#3d2314] mb-2">{item.title}</h3>
                <p className="font-body text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed breakdown */}
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-4">Survey Design</h2>
            <p className="font-body text-gray-600 leading-relaxed mb-4">
              Start by choosing from our template library or build from scratch. Select your target audience by geography, demographics, and language. Our builder supports multiple question types including single choice, Likert scales, open-ended questions, and NPS scores.
            </p>
            <p className="font-body text-gray-600 leading-relaxed">
              Questions are automatically adapted for cultural context — phrasing that works in Hindi may not translate directly to Tamil. Our AI handles these nuances so you get natural, unbiased conversations.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-4">Voice AI Conversations</h2>
            <p className="font-body text-gray-600 leading-relaxed mb-4">
              Our AI uses Cartesia Sonic 3 for ultra-low-latency speech synthesis. Calls sound natural and human-like, with support for code-switching (mixing languages mid-sentence), regional accents, and conversational flow.
            </p>
            <p className="font-body text-gray-600 leading-relaxed">
              The AI adapts in real-time — if a respondent gives a short answer, it probes further. If they go off-topic, it gently redirects. Every conversation feels personal, not scripted.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-[#3d2314] mb-4">Analysis & Reports</h2>
            <p className="font-body text-gray-600 leading-relaxed mb-4">
              Every response is transcribed and translated to English in real-time. Our pipeline extracts structured data, runs sentiment analysis, and flags key themes automatically.
            </p>
            <p className="font-body text-gray-600 leading-relaxed">
              You get a live dashboard with demographic breakdowns, cross-tabulations, and exportable datasets in CSV and JSON formats. Reports include AI-generated summaries with confidence intervals and margin of error calculations.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#ff6b2c] via-[#e85d04] to-[#ffaa80] rounded-3xl p-12 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-10 py-4 bg-white text-[#e85d04] rounded-full font-body font-bold text-lg hover:bg-[#faf8f5] transition-colors shadow-lg"
            >
              Create Your First Survey
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
