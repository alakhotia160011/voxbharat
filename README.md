# VoxBharat - Voice Survey Platform

## Run locally (3 steps)

Make sure you have **Node.js** installed. If not, download it from https://nodejs.org

Then open your terminal and run:

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm run dev
```

That's it. Open http://localhost:5173 in your browser.

The Cartesia voice demo will work locally since your API key is already saved in the code.

## Your Cartesia API key

Already embedded in the code. To change it, edit `src/App.jsx` line ~1070 and update the `apiKey` value.

## Project structure

```
voxbharat-local/
├── index.html          ← HTML shell (loads Tailwind + fonts)
├── package.json        ← dependencies
├── vite.config.js      ← build config
└── src/
    ├── main.jsx        ← entry point
    └── App.jsx         ← the full VoxBharat app
```
