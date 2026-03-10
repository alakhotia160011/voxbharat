import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '../shared/SectionHeading';
import SectionDivider from '../layout/SectionDivider';
import { fadeInUp, staggerContainer, sectionViewport } from '../../styles/animations';

// ── Quickstart flow steps ──
const quickstart = [
  {
    numeral: '१',
    title: 'Get your API key',
    description: 'Log into the dashboard and create an API key. The full key is shown once, so save it.',
    code: `curl -X POST https://voxbharat-production.up.railway.app/api/v1/api-keys \\
  -H "Authorization: Bearer <your-jwt-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Production"}'

# Response:
# { "data": { "key": "vxb_live_a1b2c3d4...", "id": 1, "name": "Production" } }`,
  },
  {
    numeral: '२',
    title: 'Create a survey',
    description: 'Define your questions, language, and tone. Or let AI generate questions from a description.',
    code: `curl -X POST https://voxbharat-production.up.railway.app/api/v1/surveys \\
  -H "Authorization: Bearer vxb_live_a1b2c3d4..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Customer Satisfaction Q1",
    "type": "customer",
    "purpose": "Measure satisfaction with delivery speed",
    "languages": ["hi", "en"],
    "tone": "friendly",
    "duration": 5,
    "questions": [
      {
        "id": 1, "type": "rating", "min": 1, "max": 10,
        "text": "1 से 10 में, आप हमारी डिलीवरी स्पीड को कितने अंक देंगे?",
        "textEn": "On a scale of 1 to 10, how would you rate our delivery speed?",
        "required": true, "category": "Delivery"
      }
    ]
  }'`,
  },
  {
    numeral: '३',
    title: 'Make a call',
    description: 'Call a single number or launch a bulk campaign. The AI handles the conversation.',
    code: `# Single call
curl -X POST https://voxbharat-production.up.railway.app/api/v1/calls \\
  -H "Authorization: Bearer vxb_live_a1b2c3d4..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "+919876543210",
    "surveyName": "Customer Satisfaction Q1",
    "language": "hi",
    "gender": "female"
  }'

# Bulk campaign (up to 10,000 numbers)
curl -X POST https://voxbharat-production.up.railway.app/api/v1/campaigns \\
  -H "Authorization: Bearer vxb_live_a1b2c3d4..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Delhi Delivery Survey",
    "surveyName": "Customer Satisfaction Q1",
    "phoneNumbers": ["+919876543210", "+919876543211"],
    "language": "hi",
    "concurrency": 2,
    "maxRetries": 3
  }'`,
  },
  {
    numeral: '४',
    title: 'Get results',
    description: 'Retrieve transcripts, structured responses, sentiment, and demographics, all in real-time.',
    code: `# Get call results
curl https://voxbharat-production.up.railway.app/api/v1/calls/<call-id> \\
  -H "Authorization: Bearer vxb_live_a1b2c3d4..."

# Response includes:
# - Full transcript (original language + English)
# - Structured survey responses
# - Sentiment analysis per turn
# - Demographic extraction (age, gender, location)
# - Call duration, language detected, status

# Export all results for a survey
curl "https://voxbharat-production.up.railway.app/api/v1/surveys/Customer%20Satisfaction%20Q1/export?format=csv" \\
  -H "Authorization: Bearer vxb_live_a1b2c3d4..."`,
  },
];

// ── Endpoint reference ──
const endpointGroups = [
  {
    title: 'Surveys',
    devanagari: 'सर्वेक्षण',
    endpoints: [
      { method: 'POST', path: '/surveys', desc: 'Create a new survey with questions' },
      { method: 'GET', path: '/surveys', desc: 'List all your surveys (paginated)' },
      { method: 'GET', path: '/surveys/{name}', desc: 'Get survey details' },
      { method: 'PUT', path: '/surveys/{name}', desc: 'Update survey config' },
      { method: 'DELETE', path: '/surveys/{name}', desc: 'Delete a survey' },
      { method: 'POST', path: '/surveys/generate-questions', desc: 'AI-generate questions from a description' },
      { method: 'GET', path: '/surveys/{name}/analytics', desc: 'Get aggregate analytics' },
      { method: 'GET', path: '/surveys/{name}/responses', desc: 'Per-question response breakdowns' },
      { method: 'GET', path: '/surveys/{name}/export?format=csv', desc: 'Export data as CSV or JSON' },
    ],
  },
  {
    title: 'Calls',
    devanagari: 'कॉल',
    endpoints: [
      { method: 'POST', path: '/calls', desc: 'Initiate a single outbound call' },
      { method: 'GET', path: '/calls', desc: 'List calls (filter by survey, paginated)' },
      { method: 'GET', path: '/calls/{id}', desc: 'Get call details with transcript and results' },
      { method: 'GET', path: '/calls/{id}/recording', desc: 'Download call recording (WAV)' },
    ],
  },
  {
    title: 'Campaigns',
    devanagari: 'अभियान',
    endpoints: [
      { method: 'POST', path: '/campaigns', desc: 'Create a bulk calling campaign (up to 10K numbers)' },
      { method: 'GET', path: '/campaigns', desc: 'List all campaigns' },
      { method: 'GET', path: '/campaigns/{id}', desc: 'Get campaign status and config' },
      { method: 'POST', path: '/campaigns/{id}/start', desc: 'Start or resume a campaign' },
      { method: 'POST', path: '/campaigns/{id}/pause', desc: 'Pause a running campaign' },
      { method: 'POST', path: '/campaigns/{id}/cancel', desc: 'Cancel a campaign' },
      { method: 'GET', path: '/campaigns/{id}/progress', desc: 'Real-time progress (completed, failed, pending)' },
      { method: 'GET', path: '/campaigns/{id}/results', desc: 'Get all call results for a campaign' },
    ],
  },
  {
    title: 'Webhooks',
    devanagari: 'वेबहुक',
    endpoints: [
      { method: 'POST', path: '/webhooks', desc: 'Register a webhook (HTTPS only)' },
      { method: 'GET', path: '/webhooks', desc: 'List your webhooks' },
      { method: 'DELETE', path: '/webhooks/{id}', desc: 'Delete a webhook' },
      { method: 'POST', path: '/webhooks/{id}/test', desc: 'Send a test event to verify your endpoint' },
      { method: 'GET', path: '/webhooks/{id}/deliveries', desc: 'View recent delivery attempts' },
    ],
  },
];

const methodColors = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-ink text-cream-warm/90 rounded-xl p-5 text-xs leading-relaxed overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-body bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function ApiDocsPage({ navigateTo, setShowBuilder }) {
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
              number={7}
              title="API Documentation"
              subtitle="Integrate VoxBharat into your workflow. Create surveys, make calls, and retrieve results programmatically."
            />
          </motion.div>
          <motion.div
            className="mt-6 font-serif-indic text-[6rem] md:text-[10rem] text-gold/10 leading-none select-none pointer-events-none"
            variants={fadeInUp}
            aria-hidden
          >
            एपीआई
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Auth & basics */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <motion.h2 variants={fadeInUp} className="font-display text-xl md:text-2xl font-bold text-earth mb-4">
              Authentication
            </motion.h2>
            <motion.div variants={fadeInUp} className="font-body text-earth-mid leading-relaxed space-y-4">
              <p>
                All API requests use <strong className="text-earth">Bearer token authentication</strong>. Create an API key from the
                dashboard, then include it in every request:
              </p>
              <CodeBlock code={`Authorization: Bearer vxb_live_a1b2c3d4e5f6...`} />
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-white border border-cream-warm rounded-xl p-4">
                  <div className="text-xs font-body text-earth-mid uppercase tracking-wider mb-1">Base URL</div>
                  <div className="font-mono text-sm text-earth break-all">https://voxbharat-production.up.railway.app/api/v1</div>
                </div>
                <div className="bg-white border border-cream-warm rounded-xl p-4">
                  <div className="text-xs font-body text-earth-mid uppercase tracking-wider mb-1">Rate Limit</div>
                  <div className="font-body text-sm text-earth">60 requests/min per API key</div>
                </div>
                <div className="bg-white border border-cream-warm rounded-xl p-4">
                  <div className="text-xs font-body text-earth-mid uppercase tracking-wider mb-1">Format</div>
                  <div className="font-body text-sm text-earth">JSON request & response</div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-10">
              <h3 className="font-display text-lg font-bold text-earth mb-3">Extra features</h3>
              <div className="font-body text-earth-mid text-sm space-y-2">
                <p><strong className="text-earth">Idempotency:</strong> Add an <code className="bg-cream-warm px-1.5 py-0.5 rounded text-xs">Idempotency-Key</code> header to POST requests. Duplicate requests return the cached response.</p>
                <p><strong className="text-earth">Request IDs:</strong> Every response includes an <code className="bg-cream-warm px-1.5 py-0.5 rounded text-xs">X-Request-Id</code> header for debugging.</p>
                <p><strong className="text-earth">Webhooks:</strong> Get notified when calls complete or campaigns finish. Payloads are signed with HMAC-SHA256 for verification.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* Quickstart */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <motion.h2 variants={fadeInUp} className="font-display text-xl md:text-2xl font-bold text-earth mb-2">
              Quickstart
            </motion.h2>
            <motion.p variants={fadeInUp} className="font-body text-earth-mid mb-10">
              Four steps from API key to survey results.
            </motion.p>

            <div className="space-y-12">
              {quickstart.map((step, i) => (
                <motion.div key={i} variants={fadeInUp} className="relative">
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                      <span className="font-serif-indic text-lg text-saffron">{step.numeral}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg font-bold text-earth mb-1">{step.title}</h3>
                      <p className="font-body text-earth-mid text-sm mb-4">{step.description}</p>
                      <CodeBlock code={step.code} />
                    </div>
                  </div>
                  {i < quickstart.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-cream-warm -translate-x-1/2" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* Endpoint reference */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <motion.h2 variants={fadeInUp} className="font-display text-xl md:text-2xl font-bold text-earth mb-2">
              Endpoint Reference
            </motion.h2>
            <motion.p variants={fadeInUp} className="font-body text-earth-mid mb-10">
              All endpoints are under <code className="bg-cream-warm px-1.5 py-0.5 rounded text-xs">/api/v1</code>. Full OpenAPI spec
              available at <code className="bg-cream-warm px-1.5 py-0.5 rounded text-xs">/api/v1/openapi.yaml</code>.
            </motion.p>

            <div className="space-y-10">
              {endpointGroups.map((group, gi) => (
                <motion.div key={gi} variants={fadeInUp}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-display text-xl font-bold text-earth">{group.title}</h3>
                    <span className="font-serif-indic text-saffron/30 text-lg">{group.devanagari}</span>
                  </div>
                  <div className="bg-white border border-cream-warm rounded-xl overflow-hidden">
                    {group.endpoints.map((ep, ei) => (
                      <div
                        key={ei}
                        className={`flex items-start gap-3 px-5 py-3 ${ei > 0 ? 'border-t border-cream-warm/60' : ''}`}
                      >
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${methodColors[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="shrink-0 font-mono text-xs text-earth mt-0.5">{ep.path}</code>
                        <span className="font-body text-sm text-earth-mid ml-auto text-right">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* Webhook events */}
      <section className="bg-ink py-20 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <motion.h2 variants={fadeInUp} className="font-display text-xl md:text-2xl font-bold text-white mb-6">
              Webhook Events
            </motion.h2>
            <motion.div variants={fadeInUp} className="space-y-4">
              {[
                { event: 'call.completed', desc: 'Fired when a call ends successfully. Includes transcript, structured responses, sentiment, and demographics.' },
                { event: 'call.failed', desc: 'Fired when a call fails (busy, no answer, error). Includes failure reason and retry status.' },
                { event: 'campaign.completed', desc: 'Fired when all numbers in a campaign have been processed. Includes summary stats.' },
              ].map((wh, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                  <code className="font-mono text-sm text-saffron">{wh.event}</code>
                  <p className="font-body text-white/60 text-sm mt-1">{wh.desc}</p>
                </div>
              ))}
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-8">
              <h3 className="font-display text-lg font-bold text-white mb-3">Verifying signatures</h3>
              <CodeBlock code={`// Every webhook includes X-VoxBharat-Signature header
// Verify with: sha256=HMAC-SHA256(request_body, webhook_secret)

const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature), Buffer.from(expected)
  );
}`} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Languages */}
      <section className="py-20 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <motion.h2 variants={fadeInUp} className="font-display text-xl md:text-2xl font-bold text-earth mb-6">
              Supported Languages
            </motion.h2>
            <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { code: 'hi', name: 'Hindi', script: 'हिन्दी' },
                { code: 'bn', name: 'Bengali', script: 'বাংলা' },
                { code: 'te', name: 'Telugu', script: 'తెలుగు' },
                { code: 'mr', name: 'Marathi', script: 'मराठी' },
                { code: 'ta', name: 'Tamil', script: 'தமிழ்' },
                { code: 'gu', name: 'Gujarati', script: 'ગુજરાતી' },
                { code: 'kn', name: 'Kannada', script: 'ಕನ್ನಡ' },
                { code: 'ml', name: 'Malayalam', script: 'മലയാളം' },
                { code: 'pa', name: 'Punjabi', script: 'ਪੰਜਾਬੀ' },
                { code: 'en', name: 'English', script: 'English' },
              ].map((lang) => (
                <div key={lang.code} className="bg-white border border-cream-warm rounded-xl p-3 text-center">
                  <div className="font-serif-indic text-lg text-earth">{lang.script}</div>
                  <div className="font-body text-xs text-earth-mid">{lang.name}</div>
                  <div className="font-mono text-[10px] text-saffron mt-0.5">{lang.code}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-saffron to-saffron-deep py-16 lg:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <motion.h2 variants={fadeInUp} className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
              Ready to integrate?
            </motion.h2>
            <motion.p variants={fadeInUp} className="font-body text-white/80 mb-8">
              Create your API key from the dashboard and start making calls in minutes.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigateTo('dashboard')}
                className="px-8 py-3 bg-white text-saffron rounded-full font-body font-semibold hover:bg-white/90 transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => setShowBuilder(true)}
                className="px-8 py-3 bg-white/15 text-white rounded-full font-body font-semibold hover:bg-white/25 transition-colors cursor-pointer border border-white/20"
              >
                Create a Survey
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
