# VoxBharat — Agent Rules

## Tech Stack
- **Frontend**: React 18 + Vite 5 + Tailwind CSS v4 (deployed on Vercel)
- **Server**: Express + WebSocket + Twilio + Cartesia/Deepgram + Claude (deployed on Railway)
- **Database**: PostgreSQL (Supabase-hosted)
- **Language**: JavaScript (ES modules, `"type": "module"` in both package.json files)

## Project Structure
```
src/                  # React frontend
  components/         # Reusable UI components
  pages/dashboard/    # Dashboard page views
  utils/              # Helpers (PDF export, etc.)
api/                  # Vercel serverless functions
server/               # Express call server (separate package.json)
  routes/             # API route modules (api-v1.js)
  middleware/         # Auth, rate limiting, idempotency
```

## Code Conventions

### General
- ES modules everywhere (`import`/`export`, never `require`)
- Single quotes, trailing commas, 2-space indent (see .prettierrc)
- No TypeScript — pure JS/JSX
- Prefer `const` over `let`, never use `var`
- Use `async/await` over `.then()` chains

### Frontend
- Functional components only, no class components
- Use `useState`, `useEffect`, `useRef` hooks — no Redux or context for state
- Tailwind classes inline, no CSS modules or styled-components
- Design tokens: `saffron`, `earth`, `cream`, `gold`, `indigo`, `ink` (defined in globals.css @theme)
- Fonts: `font-display` (Playfair Display), `font-body` (DM Sans), `font-serif-indic` (Noto Serif)
- Use `framer-motion` for animations, `lucide-react` for icons
- Use `react-router-dom` v7 for routing (BrowserRouter, not HashRouter)

### Server
- Always use parameterized SQL queries (`$1, $2` — never string interpolation)
- Rate limiting on all public endpoints
- JWT auth for dashboard APIs, API key auth for public API v1
- Validate all user input before processing
- `console.log`/`console.error` for logging (no logging library)

### Database
- Migrations are inline `ALTER TABLE IF NOT EXISTS` in `server/db.js` `initDb()`
- Always add `IF NOT EXISTS` / `IF EXISTS` guards on schema changes
- Use snake_case for column names

## Build Commands
- Frontend build: `PATH="/usr/local/bin:/usr/bin:/bin:$PATH" node ./node_modules/.bin/vite build`
- Frontend lint: `npm run lint` (from root)
- Server lint: `cd server && npm run lint`

## Do NOT
- Add TypeScript
- Add Redux, Zustand, or any state management library
- Add CSS modules or styled-components
- Add a logging library (winston, pino, etc.)
- Commit `.env` files or hardcode secrets
- Use `var` or CommonJS `require()`
- Skip input validation on API endpoints
- Use string concatenation in SQL queries
