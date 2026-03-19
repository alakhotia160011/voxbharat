import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { CALL_SERVER } from '../utils/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, loginWithGoogle, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const googleBtnRef = useRef(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
    setForgotSent(false);
  };

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.error || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (mode === 'forgot') return;
    if (typeof window.google === 'undefined' || !window.google.accounts) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 320,
        text: 'signin_with',
      });
    }
  }, [mode, handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, name.trim() || undefined);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.error || `${mode === 'signup' ? 'Signup' : 'Login'} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${CALL_SERVER}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong');
      } else {
        setForgotSent(true);
      }
    } catch {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-cream-warm rounded-2xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <span className="font-display text-2xl font-bold">
                <span className="bg-gradient-to-r from-saffron to-saffron-deep bg-clip-text text-transparent">Vox</span>
                <span className="text-earth">Bharat</span>
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-earth">
              {isForgot ? 'Reset Password' : isSignup ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-earth-mid text-sm font-body mt-1">
              {isForgot ? 'Enter your email to receive a reset link' : isSignup ? 'Sign up to access the dashboard' : 'Sign in to view survey data'}
            </p>
          </div>

          {/* Forgot password form */}
          {isForgot ? (
            forgotSent ? (
              <div className="text-center space-y-4">
                <div className="text-sm font-body text-earth bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                  Check your email for a password reset link. It expires in 1 hour.
                </div>
                <button
                  onClick={() => { setMode('login'); setForgotSent(false); setError(''); }}
                  className="text-sm font-body text-earth-mid hover:text-saffron transition-colors cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-body text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5"
                  >{error}</motion.div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Sending\u2026' : 'Send Reset Link'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-sm font-body text-earth-mid hover:text-saffron transition-colors cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                      placeholder="Your name (optional)"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                    placeholder={isSignup ? 'Min 8 characters' : 'Enter password'}
                  />
                </div>

                {!isSignup && (
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); }}
                      className="text-xs font-body text-earth-mid hover:text-saffron transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-body text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-60 mt-2"
                >
                  {loading
                    ? (isSignup ? 'Creating account\u2026' : 'Signing in\u2026')
                    : (isSignup ? 'Create Account' : 'Sign In')
                  }
                </button>
              </form>

              {/* Google Sign-In */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-cream-warm" />
                <span className="text-xs font-body text-earth-mid/60">or</span>
                <div className="flex-1 h-px bg-cream-warm" />
              </div>
              <div ref={googleBtnRef} className="w-full" />

              <div className="mt-6 text-center">
                <button
                  onClick={switchMode}
                  className="text-sm font-body text-earth-mid hover:text-saffron transition-colors cursor-pointer"
                >
                  {isSignup
                    ? 'Already have an account? Sign in'
                    : "Don\u2019t have an account? Sign up"
                  }
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
