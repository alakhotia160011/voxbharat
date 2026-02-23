import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const TOKEN_KEY = 'voxbharat_token';

export default function ResetPasswordPage({ navigateTo }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const resetToken = (() => {
    const hash = window.location.hash.replace('#', '');
    const match = hash.match(/[?&]token=([^&]+)/);
    return match ? match[1] : null;
  })();

  useEffect(() => {
    if (!resetToken) setTokenInvalid(true);
  }, [resetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${CALL_SERVER}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed');
        if (res.status === 400) setTokenInvalid(true);
      } else {
        localStorage.setItem(TOKEN_KEY, data.token);
        setSuccess(true);
        setTimeout(() => navigateTo('dashboard'), 1500);
      }
    } catch {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-cream-warm rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-earth">Set New Password</h2>
          <p className="text-earth-mid text-sm font-body mt-1">
            {success ? 'Password reset successfully!' : 'Enter your new password below'}
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="text-sm font-body text-earth bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              Your password has been reset. Redirecting to dashboard...
            </div>
          </div>
        ) : tokenInvalid ? (
          <div className="text-center space-y-4">
            <div className="text-sm font-body text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error || 'This reset link is invalid or has expired.'}
            </div>
            <button
              onClick={() => navigateTo('dashboard')}
              className="text-sm font-body text-saffron hover:text-saffron-deep transition-colors cursor-pointer font-medium"
            >
              Go to login and request a new link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
                className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
                placeholder="Re-enter password"
              />
            </div>

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
              {loading ? 'Resetting\u2026' : 'Reset Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
