import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import posthog from 'posthog-js'
import './styles/globals.css'
import VoxBharat from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { BuilderProvider } from './contexts/BuilderContext'
import { ToastProvider } from './hooks/useToast'
import Toaster from './components/shared/Toaster'

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
    <BrowserRouter>
      <AuthProvider>
        <BuilderProvider>
          <ToastProvider>
            <VoxBharat />
            <Toaster />
          </ToastProvider>
        </BuilderProvider>
      </AuthProvider>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>
)
