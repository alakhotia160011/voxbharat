import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';

const formatPhoneInput = (value) => value.replace(/\D/g, '').slice(0, 10);

// ─── CSS-only animated orb ───
function Orb({ state }) {
  const fast = state === 'requesting';
  const errorMode = state === 'error';
  const baseColor = errorMode ? '#ef4444' : '#e8550f';
  const glowColor = errorMode ? 'rgba(239,68,68,0.3)' : 'rgba(232,85,15,0.25)';

  return (
    <div className="relative w-20 h-20 mx-auto">
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        animate={{ scale: fast ? [1, 1.4, 1] : [1, 1.2, 1], opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: fast ? 0.8 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Mid glow */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{ background: `radial-gradient(circle at 40% 35%, ${baseColor}dd 0%, ${baseColor}66 50%, transparent 80%)` }}
        animate={{ scale: fast ? [1, 1.15, 1] : [1, 1.08, 1] }}
        transition={{ duration: fast ? 0.6 : 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      {/* Core sphere */}
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, #fbbf6c 0%, ${baseColor} 40%, ${baseColor}99 70%, transparent 100%)`,
          boxShadow: `inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.15), 0 0 30px ${glowColor}`,
        }}
        animate={{
          y: fast ? [0, -2, 0] : [0, -4, 0],
          scale: fast ? [1, 1.06, 1] : [1, 1.03, 1],
        }}
        transition={{ duration: fast ? 0.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Specular highlight */}
      <div
        className="absolute rounded-full"
        style={{
          top: '16px', left: '22px', width: '20px', height: '12px',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 80%)',
          filter: 'blur(2px)',
        }}
      />
    </div>
  );
}

// ─── Concentric ring pulse (ringing state) ───
function RingPulse() {
  return (
    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
      {[0, 0.6, 1.2].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-[#e8550f]"
          initial={{ width: 20, height: 20, opacity: 0.8 }}
          animate={{ width: 80, height: 80, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeOut' }}
        />
      ))}
      {/* Center phone icon */}
      <motion.div
        className="relative w-10 h-10 rounded-full bg-[#e8550f]/20 flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      >
        <svg className="w-5 h-5 text-[#e8550f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Audio bars visualizer (connected state) ───
function AudioBars() {
  const [heights, setHeights] = useState(() => Array(12).fill(6));

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => Math.random() * 32 + 6));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end justify-center gap-[3px] h-12 mx-auto w-fit">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-75"
          style={{
            height: `${h}px`,
            backgroundColor: '#e8550f',
            opacity: 0.5 + (h / 38) * 0.5,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated check ───
function AnimatedCheck() {
  return (
    <div className="w-16 h-16 mx-auto flex items-center justify-center">
      <motion.div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
          <motion.circle
            cx="20" cy="20" r="16"
            stroke="#22c55e" strokeWidth="2" fill="none" strokeOpacity="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d="M13 20l5 5 9-10"
            stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Floating button soundwave bars ───
function ButtonBars({ active }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), active ? 120 : 600);
    return () => clearInterval(interval);
  }, [active]);

  const heights = [0.4, 0.7, 1, 0.7, 0.4].map((base, i) => {
    const wave = Math.sin((tick + i * 2) * (active ? 0.5 : 0.3)) * 0.3 + 0.7;
    return base * wave * 18;
  });

  return (
    <div className="flex items-center justify-center gap-[2.5px] h-5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full transition-all"
          style={{
            height: `${Math.max(3, h)}px`,
            backgroundColor: '#e8550f',
            transitionDuration: active ? '100ms' : '500ms',
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Widget
// ═══════════════════════════════════════════
export default function CallMeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [callState, setCallState] = useState('idle');
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [callState]);

  const reset = () => {
    setCallState('idle');
    setPhone('');
    setError(null);
    setCallDuration(0);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const initiateDemoCall = async () => {
    if (phone.length < 10) return;
    setCallState('requesting');
    setError(null);

    try {
      const response = await fetch(`${CALL_SERVER}/call/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start call');

      setCallState('ringing');

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${CALL_SERVER}/call/demo/${data.callId}`);
          if (!res.ok) return;
          const callData = await res.json();
          if (callData.status === 'in-progress' || callData.status === 'surveying') {
            setCallState('connected');
          } else if (['completed', 'saved', 'extracting'].includes(callData.status)) {
            setCallState('completed');
            clearInterval(pollRef.current);
            pollRef.current = null;
          } else if (callData.status === 'failed') {
            setCallState('error');
            setError('Call failed. Please try again.');
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch { /* ignore */ }
      }, 2000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setCallState(prev => prev === 'ringing' ? 'error' : prev);
        }
      }, 5 * 60 * 1000);
    } catch (err) {
      setCallState('error');
      setError(err.message || 'Something went wrong.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && phone.length >= 10) initiateDemoCall();
  };

  const isActive = callState === 'ringing' || callState === 'connected';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="w-[calc(100vw-40px)] sm:w-[340px] rounded-[20px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1e1613 0%, #1a1210 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer z-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">

              {/* ── Idle state ── */}
              {callState === 'idle' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full"
                >
                  <Orb state="idle" />
                  <h3 className="mt-4 text-[17px] font-display font-semibold text-white">
                    Talk to Us
                  </h3>
                  <p className="mt-1.5 text-[13px] text-white/40 font-body leading-relaxed max-w-[240px] mx-auto">
                    Our AI will call you about VoxBharat — in your preferred language
                  </p>

                  <div className="mt-5 w-full">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/25 font-body select-none">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                        onKeyDown={handleKeyDown}
                        placeholder="98765 43210"
                        maxLength={10}
                        className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#e8550f]/40 focus:ring-1 focus:ring-[#e8550f]/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={initiateDemoCall}
                      disabled={phone.length < 10}
                      className={`mt-3 w-full py-3 rounded-xl font-body font-semibold text-sm text-white transition-all cursor-pointer ${
                        phone.length < 10
                          ? 'bg-white/[0.06] text-white/25 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#e8550f] to-[#c24a0e] hover:from-[#f06020] hover:to-[#d45510] shadow-lg shadow-[#e8550f]/20'
                      }`}
                    >
                      Call Me
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] text-white/20 font-body">
                    One free demo call per number per day
                  </p>
                </motion.div>
              )}

              {/* ── Requesting state ── */}
              {callState === 'requesting' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-4"
                >
                  <Orb state="requesting" />
                  <p className="mt-5 text-sm text-white/60 font-body">Connecting...</p>
                </motion.div>
              )}

              {/* ── Ringing state ── */}
              {callState === 'ringing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-4"
                >
                  <RingPulse />
                  <p className="mt-5 text-[15px] text-white font-display font-semibold">Ringing your phone...</p>
                  <p className="mt-1 text-xs text-white/40 font-body">Pick up to talk to our AI</p>
                </motion.div>
              )}

              {/* ── Connected state ── */}
              {callState === 'connected' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-4 w-full"
                >
                  <AudioBars />
                  <p className="mt-5 text-[15px] text-white font-display font-semibold">You're connected</p>
                  <p className="mt-1 text-xs text-white/40 font-body">Hang up anytime</p>
                  <p className="mt-3 text-xs text-white/20 font-mono tabular-nums">{formatTime(callDuration)}</p>
                </motion.div>
              )}

              {/* ── Completed state ── */}
              {callState === 'completed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-2"
                >
                  <AnimatedCheck />
                  <p className="mt-3 text-[15px] text-white font-display font-semibold">Thanks for trying VoxBharat!</p>
                  <p className="mt-1 text-xs text-white/40 font-body">Our team will follow up with details</p>
                  <button
                    onClick={reset}
                    className="mt-4 text-xs text-[#e8550f] hover:text-[#f06020] font-body transition-colors cursor-pointer"
                  >
                    Try another number
                  </button>
                </motion.div>
              )}

              {/* ── Error state ── */}
              {callState === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-2"
                >
                  <Orb state="error" />
                  <p className="mt-4 text-sm text-red-400 font-body leading-relaxed max-w-[260px] mx-auto">{error}</p>
                  <button
                    onClick={reset}
                    className="mt-4 px-5 py-2 rounded-lg bg-white/[0.06] text-white/60 text-xs font-body hover:bg-white/[0.1] hover:text-white/80 transition-all cursor-pointer"
                  >
                    Try again
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating button ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #1e1613, #1a1210)',
          boxShadow: isHovered || isActive
            ? '0 0 0 2px rgba(232,85,15,0.3), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(232,85,15,0.15)'
            : '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
          transition: 'box-shadow 0.3s ease',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 1.5 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-5 h-5 text-white/60"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.div
              key="bars"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ButtonBars active={isHovered || isActive} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
