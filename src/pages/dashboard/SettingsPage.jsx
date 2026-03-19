import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CALL_SERVER } from '../../utils/config';
import { authFetch } from '../../utils/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`${CALL_SERVER}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to change password');
      } else {
        setMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile */}
      <div className="bg-white border border-cream-warm rounded-xl p-6 mb-6">
        <h2 className="font-heading text-lg font-semibold text-earth mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1">Name</label>
            <div className="font-body text-sm text-earth">{user?.name || '-'}</div>
          </div>
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1">Email</label>
            <div className="font-body text-sm text-earth">{user?.email || '-'}</div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-cream-warm rounded-xl p-6">
        <h2 className="font-heading text-lg font-semibold text-earth mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-body text-earth-mid uppercase tracking-wider mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-cream-warm rounded-lg text-sm font-body text-earth focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors"
            />
          </div>

          {error && (
            <div className="text-sm font-body text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>
          )}
          {message && (
            <div className="text-sm font-body text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-saffron text-white rounded-lg font-body text-sm font-medium hover:bg-saffron-deep transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Changing\u2026' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
