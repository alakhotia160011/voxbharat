import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import posthog from 'posthog-js'
import './styles/globals.css'
import VoxBharat from './App.jsx'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: { enabled: true },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VoxBharat />
    <Analytics />
  </React.StrictMode>
)
