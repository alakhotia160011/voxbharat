# VoxBharat

**AI-powered voice surveys for India — reach 900M+ people who prefer speaking over typing.**

VoxBharat replaces human surveyors with conversational AI that calls respondents, conducts natural phone interviews in 10 Indian languages, and extracts structured data in real-time. No apps, no internet, no literacy required — it works on any phone over a basic 2G connection.

## The Problem

Traditional survey methods fail in India:
- **Online surveys** miss 60%+ of the population (low smartphone/internet penetration in rural areas)
- **Human call centers** cost ₹400+ per completed interview, take weeks, and introduce interviewer bias
- **IVR (press-1-for-yes)** systems get <15% completion rates — people hang up on robots

Meanwhile, 73% of India's population lives in rural areas across 28 states speaking 22+ official languages. Reaching them at scale with traditional methods is slow, expensive, and biased toward urban English-speakers.

## How VoxBharat Works

VoxBharat conducts voice surveys that feel like a conversation with a real person. The AI speaks naturally, understands responses in any of 10 Indian languages, handles mid-sentence language switching (common in India), and adapts its tone based on the respondent's engagement.

### The Call Flow

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Survey      │────▶│  Campaign    │────▶│  Twilio      │────▶│  Respondent  │
│  Designer    │     │  Runner      │     │  Voice API   │     │  Phone       │
└──────────────┘     └─────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                              ┌───────────────────────┘
                                              │ Audio (mu-law)
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Real-time Audio Pipeline                             │
│                                                                             │
│  Phone Audio ──▶ STT (Deepgram/Cartesia) ──▶ Claude LLM ──▶ TTS (Cartesia)│
│       ▲              transcription              response         speech     │
│       │                                                             │       │
│       └─────────────────────────────────────────────────────────────┘       │
│                              WebSocket (low-latency)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Real-time Data Extraction                           │
│                                                                             │
│  Transcript ──▶ Translation ──▶ Sentiment ──▶ Demographics ──▶ Structured  │
│  (verbatim)     (to English)    (per turn)     (age, gender)    Responses   │
│                                                                             │
│                          All stored in PostgreSQL                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step by step:**

1. **Design** — Create a survey in the builder. Define questions manually or let AI generate them from a description, uploaded PDF, or scanned website.
2. **Upload numbers** — Paste or upload a list of phone numbers. The system deduplicates and validates them.
3. **Launch campaign** — The campaign runner calls numbers in batches, respecting time windows (8am–9pm IST), concurrency limits, and retry schedules.
4. **AI conducts the call** — The AI greets the respondent, asks for verbal consent, then walks through the survey conversationally. It handles follow-ups, clarifications, and language switching naturally.
5. **Voicemail & callbacks** — If a machine answers, VoxBharat leaves a message and retries later. If respondents call back, inbound AI picks up and conducts the survey.
6. **Data flows in real-time** — Every call produces a full transcript, English translation, sentiment scores, demographic extraction, and structured survey responses — viewable in the dashboard as calls happen.

### What Makes Conversations Natural

- **Mid-conversation language switching** — Respondents often mix Hindi and English, or switch languages entirely. Deepgram's multi-language mode handles this without reconnecting.
- **Gender-aware grammar** — The AI follows per-language grammar rules (e.g., feminine verb conjugations in Hindi when using a female voice).
- **Emotion-tagged speech** — Claude tags each response with an emotion (`[EMOTION:sympathetic]`, `[EMOTION:curious]`) that the TTS uses to vary vocal tone.
- **Disengagement detection** — If someone is clearly uninterested (trolling, hostile, dead air), the AI wraps up politely within 2-3 exchanges instead of wasting their time.
- **Consent-first design** — AI explicitly asks for verbal consent before starting. A 30-second server-side timer catches non-engaging calls.

## Architecture

```
                    ┌─────────────────────────────┐
                    │        Vercel (Frontend)      │
                    │                               │
                    │  React + Vite + Tailwind v4   │
                    │  ├── Landing page             │
                    │  ├── Survey builder            │
                    │  ├── Campaign manager           │
                    │  ├── Dashboard + analytics      │
                    │  └── Auth (JWT + Google OAuth)  │
                    │                               │
                    │  Serverless Functions:          │
                    │  ├── /api/generate-questions   │
                    │  └── /api/tts (voice preview)  │
                    └──────────────┬────────────────┘
                                   │ HTTPS
                    ┌──────────────▼────────────────┐
                    │     Railway (Call Server)       │
                    │                                │
                    │  Express + WebSocket            │
                    │  ├── Twilio voice webhooks      │
                    │  ├── Real-time audio pipeline   │
                    │  ├── Campaign orchestration     │
                    │  ├── Inbound call handling      │
                    │  ├── Auth + user APIs           │
                    │  └── Data export (CSV/JSON)     │
                    └───┬──────────┬─────────┬──────┘
                        │          │         │
              ┌─────────▼┐   ┌────▼────┐  ┌─▼───────────┐
              │  Twilio   │   │Postgres │  │ AI Services  │
              │  (Voice)  │   │  (Data) │  │              │
              │           │   │         │  │ Claude (LLM) │
              │ Calls     │   │ Users   │  │ Cartesia TTS │
              │ Webhooks  │   │ Calls   │  │ Deepgram STT │
              │ Recording │   │ Surveys │  │ Cartesia STT │
              └───────────┘   │Campaigns│  └──────────────┘
                              └─────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Vite, Tailwind CSS v4, Framer Motion | Dashboard, survey builder, campaign UI |
| Call Server | Express, WebSocket (`ws`), Node.js | Real-time audio pipeline, Twilio integration |
| LLM | Claude Haiku 4.5 | Conversation turns (fast, cheap) |
| LLM | Claude Sonnet | Question generation (complex reasoning) |
| TTS | Cartesia Sonic-3 | Voice synthesis, WebSocket streaming |
| STT | Deepgram Nova-3 | Multi-language transcription with code-switching |
| STT | Cartesia Ink-Whisper | Alternative/fallback transcription |
| Telephony | Twilio Voice API | Outbound/inbound calls, recordings, AMD |
| Database | PostgreSQL (Railway) | Users, calls, campaigns, structured responses |
| Auth | JWT + Google OAuth 2.0 + bcrypt | Session management, password hashing |
| Email | Gmail + Nodemailer | Password resets, signup notifications |
| Hosting | Vercel (frontend) + Railway (server) | Auto-deploy from git |

### Languages Supported

Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi, English — with automatic detection and mid-conversation switching.

## Features

### Survey Builder
- AI-generated questions from a text description, uploaded PDF, or scanned website URL
- Question types: single choice, multiple choice, Likert scale, rating (1-10), NPS, open-ended, yes/no
- Configurable tone (formal/friendly), sensitivity level, target duration, geography
- Voice preview — hear how questions will sound before launching
- Test call — call yourself to experience the full survey flow

### Campaign Management
- Bulk phone number upload (paste, CSV, or manual entry)
- Configurable concurrency, retry count, and call timing windows
- Real-time progress tracking (completed, failed, pending, voicemail)
- Automatic retry for failed/busy/no-answer calls with randomized timing
- Pause, resume, and cancel campaigns mid-flight

### Inbound Calls
- Assign a Twilio number to a survey configuration
- Respondents who missed an outbound call can call back anytime
- AI recognizes the caller's number in the campaign database and picks up the right survey
- 24/7 availability with no human operators needed

### Dashboard & Analytics
- Real-time call list with status, duration, language, and sentiment
- Full transcripts with turn-by-turn English translations
- Structured response extraction (survey answers as clean data)
- Demographic breakdown and cross-tabulations
- Export to CSV or JSON
- Per-call PDF report generation

### Security
- JWT authentication with short-lived tokens
- Google OAuth 2.0 sign-in
- Multi-tenant data isolation (all queries scoped to `user_id`)
- Rate limiting on auth endpoints
- CORS origin validation
- Helmet security headers
- Phone number masking in the dashboard UI
- Sanitized error responses (no internal details leaked)

## Project Structure

```
voxbharat-local/
├── src/                            Frontend (React)
│   ├── components/
│   │   ├── landing/                Landing page (hero, features, how-it-works)
│   │   ├── survey-builder/         Multi-step survey creation
│   │   ├── campaigns/              Campaign list, detail, creation flow
│   │   ├── inbound/                Inbound call configuration
│   │   ├── pages/                  Dashboard, auth, about, settings
│   │   ├── layout/                 Navbar, sidebar, footer
│   │   ├── modals/                 Dialogs (call detail, test call)
│   │   └── shared/                 Charts, buttons, reusable UI
│   ├── utils/                      Auth helpers, PDF export, config
│   └── styles/                     Animations, global CSS
├── server/                         Call server (deployed to Railway)
│   ├── call-server.js              Main: Express, WebSocket, Twilio, all APIs
│   ├── claude-conversation.js      Claude API wrapper, message management
│   ├── survey-scripts.js           System prompts, greetings, extraction rules
│   ├── cartesia-tts.js             TTS (HTTP + WebSocket streaming)
│   ├── cartesia-stt.js             STT (Cartesia Ink-Whisper)
│   ├── deepgram-stt.js             STT (Deepgram Nova-3, multi-language)
│   ├── campaign-runner.js          Batch call orchestration, retries
│   ├── website-scraper.js          URL scraping for survey context
│   ├── audio-convert.js            mu-law ↔ PCM16k conversion
│   ├── call-store.js               In-memory active call state
│   └── db.js                       PostgreSQL schema, migrations, queries
├── api/                            Vercel serverless functions
│   ├── generate-questions.js       AI question generation (Claude Sonnet)
│   └── tts.js                      TTS proxy for voice preview
└── public/                         Static assets (favicon, images)
```

## Run Locally

### Prerequisites
- Node.js 18+
- PostgreSQL
- Twilio account with a phone number
- API keys: Anthropic (Claude), Cartesia, Deepgram

### Frontend

```bash
npm install
npm run dev          # http://localhost:5173
```

### Call Server

```bash
cd server
npm install
cp .env.example .env   # Fill in your keys
node call-server.js     # http://localhost:3002
```

### Environment Variables

**Frontend** (`.env`):
```
VITE_CALL_SERVER_URL=http://localhost:3002
```

**Call Server** (`server/.env`):
```
PORT=3002
ANTHROPIC_API_KEY=
CARTESIA_API_KEY=
DEEPGRAM_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GMAIL_USER=
GMAIL_APP_PASSWORD=
NOTIFY_EMAIL=
FRONTEND_URL=http://localhost:5173
```

## Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | Auto-deploys from `main`. Set `VITE_CALL_SERVER_URL` to Railway domain. |
| Call Server | Railway | Root directory: `server/`. Set `PORT=3002` explicitly. Procfile: `web: node call-server.js` |
| Database | Railway Postgres | Auto-injects `DATABASE_URL`. Schema auto-migrates on server start. |

### Railway Notes
- Set `PORT=3002` in Railway Variables (don't rely on auto-injection)
- Domain target port must match the PORT env var
- Server binds to `0.0.0.0` for container networking
- IPv4-first DNS is enforced (Railway doesn't support IPv6 outbound)
