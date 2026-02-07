import React from 'react';

export default function DataPolicyPage({ navigateTo }) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-[#3d2314] mb-4">
            Data <span className="gradient-text-warm">& Privacy</span>
          </h1>
          <p className="font-body text-lg text-gray-500 max-w-2xl mx-auto">
            Trust is the foundation of good research. Here's how we protect every respondent.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-24">
          {[
            {
              title: 'Informed Consent',
              desc: 'Every call begins with a clear disclosure that the respondent is speaking with an AI. Participation is voluntary and can be ended at any time.',
              icon: (
                <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              ),
            },
            {
              title: 'Data Encryption',
              desc: 'All voice data and survey responses are encrypted using AES-256 in transit and at rest. Audio recordings are processed and deleted — never stored permanently.',
              icon: (
                <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              ),
            },
            {
              title: 'Anonymization',
              desc: 'Phone numbers are hashed before storage. Individual responses cannot be traced back to specific individuals. All analysis uses aggregated, de-identified data.',
              icon: (
                <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              ),
            },
            {
              title: 'Regulatory Compliance',
              desc: 'We comply with India\'s Digital Personal Data Protection Act (DPDPA) 2023, TRAI guidelines for automated calls, and international standards including GDPR principles.',
              icon: (
                <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              ),
            },
            {
              title: 'Data Retention',
              desc: 'Survey data is retained only for the duration agreed upon with the client. Respondents can request deletion of their data at any time through our support channels.',
              icon: (
                <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ),
            },
            {
              title: 'No Selling of Data',
              desc: 'Respondent data is never sold, shared with third parties, or used for purposes beyond the commissioned research. Your data belongs to you.',
              icon: (
                <svg className="w-6 h-6 text-[#e8550f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              ),
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#e8550f]/10 flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-[#3d2314] mb-2">{item.title}</h3>
              <p className="font-body text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Detailed policy text */}
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Data Collection</h2>
            <p className="font-body text-gray-600 leading-relaxed">
              We collect only the data necessary for the commissioned survey: voice responses (temporarily for transcription),
              demographic information voluntarily provided by respondents, and call metadata (duration, language, completion status).
              Phone numbers provided by clients are used solely for outreach and are hashed immediately upon call completion.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Data Processing</h2>
            <p className="font-body text-gray-600 leading-relaxed">
              Voice recordings are transcribed in real-time and deleted immediately after transcription. Transcripts are
              translated, analyzed for sentiment, and structured into quantitative data points. All processing happens on
              encrypted infrastructure. No human listens to recordings unless explicitly authorized for quality assurance.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Your Rights</h2>
            <p className="font-body text-gray-600 leading-relaxed">
              Respondents may request access to their data, correction of inaccurate information, or complete deletion
              of their records at any time. Clients retain full ownership of aggregated survey data. We do not claim any
              intellectual property rights over the insights generated from your surveys.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#3d2314] mb-3">Contact</h2>
            <p className="font-body text-gray-600 leading-relaxed">
              For any data-related inquiries, deletion requests, or privacy concerns, reach us at{' '}
              <a href="mailto:privacy@voxbharat.com" className="text-[#e8550f] hover:underline">privacy@voxbharat.com</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
