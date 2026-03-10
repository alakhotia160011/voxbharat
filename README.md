# VoxBharat

AI-powered voice survey platform built for India. Conducts natural phone conversations in 10 Indian languages, transcribes and translates responses in real-time, and extracts structured data automatically.

## What it does

- **Voice surveys over phone calls** using conversational AI (Claude) + text-to-speech (Cartesia) + speech-to-text (Deepgram/Cartesia)
- **10 languages**: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, English
- **Mid-conversation language switching** with Deepgram multi-language code-switching
- **Campaign management**: bulk calling with configurable concurrency, retry logic, and call timing windows
- **Real-time analytics**: transcription, translation, sentiment analysis, and demographic extraction
- **Inbound calls**: respondents can call back after a missed call
- **Voicemail detection**: leaves a message and moves to the next number
- **Survey builder**: design surveys with AI-generated questions, upload PDFs or scan websites for context
- **Call recording**: Twilio records every call, downloadable from the dashboard

## Architecture

```
Frontend (React + Vite + Tailwind)     →  Vercel
Call Server (Express + WebSocket)      →  Railway
Serverless API (question generation)   →  Vercel Functions
```

### Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, Tailwind CSS v4 |
| Call server | Express, WebSocket, Twilio |
| STT | Deepgram Nova-3 (multi-lang), Cartesia Ink-Whisper |
| TTS | Cartesia Sonic |
| LLM | Claude Haiku 4.5 (conversations), Claude Sonnet (question generation) |
| Database | PostgreSQL |
| Auth | JWT + Google OAuth |

## Project structure

```
voxbharat-local/
├── src/                          Frontend (React)
│   ├── components/
│   │   ├── landing/              Landing page sections
│   │   ├── survey-builder/       Survey creation flow
│   │   ├── campaigns/            Campaign management
│   │   ├── inbound/              Inbound call config
│   │   ├── pages/                Dashboard, auth, settings
│   │   ├── layout/               Nav, sidebar
│   │   ├── modals/               Dialogs
│   │   └── shared/               Reusable components
│   └── utils/                    PDF export, helpers
├── server/                       Call server (Railway)
│   ├── call-server.js            Main server: Twilio, WebSocket, APIs
│   ├── claude-conversation.js    LLM conversation manager
│   ├── survey-scripts.js         System prompts, greetings, extraction
│   ├── cartesia-tts.js           Text-to-speech (Cartesia Sonic)
│   ├── cartesia-stt.js           Speech-to-text (Cartesia Ink-Whisper)
│   ├── deepgram-stt.js           Speech-to-text (Deepgram Nova-3)
│   ├── campaign-runner.js        Bulk call orchestration + retries
│   ├── audio-convert.js          mulaw/PCM conversion
│   ├── website-scraper.js        URL scraping for survey context
│   ├── call-store.js             In-memory call state
│   └── db.js                     PostgreSQL schema + queries
├── api/                          Vercel serverless functions
│   ├── generate-questions.js     AI survey question generation
│   └── tts.js                    TTS proxy for voice preview
└── public/                       Static assets
```

## Run locally

### Prerequisites
- Node.js 18+
- PostgreSQL (for persistent data)
- Twilio account (for phone calls)
- API keys: Anthropic (Claude), Cartesia (TTS/STT), Deepgram (STT)

### Frontend

```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Call server

```bash
cd server
npm install
cp .env.example .env  # Fill in API keys
node call-server.js
# Runs on http://localhost:3002
```

### Environment variables

**Frontend** (`.env`):
```
VITE_CALL_SERVER_URL=http://localhost:3002
```

**Server** (`server/.env`):
```
PORT=3002
ANTHROPIC_API_KEY=
CARTESIA_API_KEY=
DEEPGRAM_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DATABASE_URL=
JWT_SECRET=
```

## Deployment

- **Frontend**: Vercel (auto-deploys from `main`)
- **Call server**: Railway (root directory set to `server/`, port 3002)
