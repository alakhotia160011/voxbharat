import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CALL_SERVER = import.meta.env.VITE_CALL_SERVER_URL || '';
const formatPhoneInput = (value) => value.replace(/\D/g, '').slice(0, 12);

const COUNTRIES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1',  label: 'US +1'  },
];

// ─────────────────────────────────────────────
// Nebula Orb — sharp, defined, glassy
// ─────────────────────────────────────────────
function NebulaOrb({ state = 'idle', size = 96 }) {
  const fast = state === 'requesting';
  const err = state === 'error';

  const layers = useMemo(() => [
    { // Tight ambient glow — close to sphere, not diffuse
      inset: -4,
      gradient: err
        ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.22) 0%, transparent 65%)'
        : 'radial-gradient(circle at 50% 50%, rgba(232,85,15,0.18) 0%, transparent 65%)',
      scale: fast ? [1, 1.4, 1] : [1, 1.18, 1],
      duration: fast ? 0.65 : 3.2,
    },
    { // Core — sharp sphere with defined edge
      inset: 8,
      gradient: err
        ? 'radial-gradient(circle at 36% 30%, #fca5a5 0%, #ef4444 30%, #b91c1c 58%, #7f1d1d 100%)'
        : 'radial-gradient(circle at 36% 30%, #fde8c0 0%, #f4923a 22%, #e8550f 46%, #c24a0e 68%, #8b3109 100%)',
      scale: fast ? [1, 1.07, 1] : [1, 1.03, 1],
      duration: fast ? 0.4 : 2.8,
      delay: 0.1,
      shadow: err
        ? 'inset 0 -8px 20px rgba(0,0,0,0.5), inset 0 4px 10px rgba(255,255,255,0.12), 0 0 32px rgba(239,68,68,0.35), 0 2px 8px rgba(0,0,0,0.6)'
        : 'inset 0 -8px 20px rgba(0,0,0,0.5), inset 0 4px 10px rgba(255,255,255,0.14), 0 0 28px rgba(232,85,15,0.35), 0 0 56px rgba(232,85,15,0.12), 0 2px 8px rgba(0,0,0,0.5)',
    },
    { // Sharp inner highlight — hot spot, no blur
      inset: 16,
      gradient: err
        ? 'radial-gradient(circle at 40% 34%, rgba(255,255,255,0.22) 0%, rgba(252,165,165,0.1) 45%, transparent 70%)'
        : 'radial-gradient(circle at 40% 34%, rgba(255,255,255,0.26) 0%, rgba(253,224,180,0.12) 45%, transparent 70%)',
      scale: fast ? [1, 1.1, 0.97, 1] : [1, 1.05, 0.98, 1],
      duration: fast ? 0.55 : 3.0,
      delay: 0.25,
    },
  ], [fast, err]);

  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      whileHover={{ y: -10, scale: 1.07 }}
      transition={{ type: 'spring', stiffness: 380, damping: 14 }}
    >
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: layer.inset,
            background: layer.gradient,
            boxShadow: layer.shadow || 'none',
          }}
          animate={{
            scale: layer.scale,
            y: fast ? [0, -1, 0] : [0, -2.5, 1, 0],
          }}
          transition={{
            duration: layer.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: layer.delay || 0,
          }}
        />
      ))}
      {/* Crisp specular highlight — sharp glass look, no blur */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '17%', left: '24%', width: '32%', height: '20%',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 55%, transparent 100%)',
          borderRadius: '50%',
        }}
      />
      {/* Secondary rim highlight on lower-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '20%', left: '14%', width: '20%', height: '14%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 100%)',
          borderRadius: '50%',
        }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Concentric rings — breathing, elegant
// ─────────────────────────────────────────────
function RingPulse() {
  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: 96, height: 96 }}>
      {[0, 0.5, 1.0, 1.5].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ border: `${i === 0 ? 2 : 1.5}px solid rgba(232,85,15,${0.6 - i * 0.12})` }}
          initial={{ width: 24, height: 24, opacity: 0.8 }}
          animate={{ width: 96, height: 96, opacity: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, delay, ease: [0.25, 0.1, 0.25, 1] }}
        />
      ))}
      <motion.div
        className="relative rounded-full"
        style={{
          width: 40, height: 40,
          background: 'radial-gradient(circle, rgba(232,85,15,0.25) 0%, rgba(232,85,15,0.08) 60%, transparent 100%)',
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#e8550f" strokeWidth={1.8} strokeOpacity={0.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Audio bars — reacts to actual speaking state
// ─────────────────────────────────────────────
function AudioBars({ speaking = false }) {
  const barCount = 16;
  const [heights, setHeights] = useState(() => Array(barCount).fill(3));

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map((_, i) => {
        if (!speaking) return 3; // flat when silent
        const center = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const maxH = 38 * (1 - center * 0.5);
        return Math.random() * maxH + 4;
      }));
    }, 70);
    return () => clearInterval(interval);
  }, [speaking]);

  return (
    <div className="flex items-center justify-center h-14 mx-auto" style={{ gap: 2.5 }}>
      {heights.map((h, i) => {
        const center = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const opacity = speaking ? 0.4 + (1 - center) * 0.4 + (h / 42) * 0.2 : 0.15;
        return (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              height: h,
              background: `linear-gradient(180deg, #fbbf6c ${Math.max(0, 100 - h * 2)}%, #e8550f 100%)`,
              opacity,
              transition: 'height 80ms ease-out, opacity 200ms ease-out',
            }}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Animated checkmark — satisfying draw-in
// ─────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <div className="mx-auto flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <motion.div
        className="flex items-center justify-center"
        style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <motion.circle
            cx="24" cy="24" r="20"
            stroke="#22c55e" strokeWidth="1.5" fill="none" strokeOpacity="0.25"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.path
            d="M15 24l7 7 11-13"
            stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.35, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Floating button — always alive, even at rest
// ─────────────────────────────────────────────
function FloatingButton({ isOpen, isHovered, isActive, onClick, onHover, onLeave }) {
  const [tick, setTick] = useState(0);
  // Always animate — faster when hovered/active, lively even at rest
  const speed = isHovered || isActive ? 55 : 130;

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), speed);
    return () => clearInterval(interval);
  }, [speed]);

  const bars = [0.3, 0.55, 0.8, 1, 0.8, 0.55, 0.3].map((base, i) => {
    const phase = (tick * (isHovered || isActive ? 0.45 : 0.28)) + i * 1.2;
    const wave = Math.sin(phase) * 0.42 + 0.58;
    return base * wave * 20;
  });

  const glowIntensity = isHovered || isActive;

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="relative flex items-center justify-center cursor-pointer outline-none"
      style={{ width: 60, height: 60 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1.5 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: 'linear-gradient(145deg, #221b17, #171110)',
          boxShadow: glowIntensity
            ? '0 0 0 1.5px rgba(232,85,15,0.35), 0 0 24px rgba(232,85,15,0.12), 0 8px 28px rgba(0,0,0,0.5)'
            : '0 0 0 1px rgba(255,255,255,0.05), 0 6px 24px rgba(0,0,0,0.4)',
        }}
      />
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(232,85,15,0.08) 0%, transparent 60%)',
          opacity: glowIntensity ? 1 : 0.3,
        }}
      />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.svg
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-[18px] h-[18px]" style={{ color: 'rgba(255,255,255,0.5)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.div
              key="wave"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
              style={{ gap: 2.5, height: 22 }}
            >
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 2.5,
                    height: Math.max(3, h),
                    background: 'linear-gradient(180deg, #fbbf6c, #e8550f)',
                    opacity: 0.6 + (h / 20) * 0.4,
                    transition: `height ${speed < 100 ? 50 : 110}ms ease-out`,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════
// Main Widget
// ═══════════════════════════════════════════════
export default function CallMeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [countryOpen, setCountryOpen] = useState(false);
  const [callState, setCallState] = useState('idle');
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const countryRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!countryOpen) return;
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [countryOpen]);

  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [callState]);

  const reset = () => {
    setCallState('idle');
    setPhone('');
    setCountryCode('+91');
    setError(null);
    setCallDuration(0);
    setIsSpeaking(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const canCall = phone.length >= 6;

  const initiateDemoCall = async () => {
    if (!canCall) return;
    setCallState('requesting');
    setError(null);
    const fullNumber = countryCode + phone;
    try {
      const response = await fetch(`${CALL_SERVER}/call/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start call');
      setCallState('ringing');
      if (pollRef.current) clearInterval(pollRef.current);
      let isConnected = false;
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${CALL_SERVER}/call/demo/${data.callId}`);
          if (!res.ok) return;
          const callData = await res.json();
          if (callData.status === 'in-progress' || callData.status === 'surveying') {
            if (!isConnected) {
              isConnected = true;
              setCallState('connected');
              // Switch to fast polling once connected
              clearInterval(pollRef.current);
              pollRef.current = setInterval(async () => {
                try {
                  const r = await fetch(`${CALL_SERVER}/call/demo/${data.callId}`);
                  if (!r.ok) return;
                  const d = await r.json();
                  setIsSpeaking(d.isAiSpeaking || d.isHumanSpeaking || false);
                  if (['completed', 'saved', 'extracting'].includes(d.status)) {
                    setCallState('completed'); setIsSpeaking(false);
                    clearInterval(pollRef.current); pollRef.current = null;
                  } else if (d.status === 'failed') {
                    setCallState('error'); setError('Call failed. Please try again.'); setIsSpeaking(false);
                    clearInterval(pollRef.current); pollRef.current = null;
                  }
                } catch { /* ignore */ }
              }, 500);
            }
          } else if (['completed', 'saved', 'extracting'].includes(callData.status)) {
            setCallState('completed');
            clearInterval(pollRef.current); pollRef.current = null;
          } else if (callData.status === 'failed') {
            setCallState('error'); setError('Call failed. Please try again.');
            clearInterval(pollRef.current); pollRef.current = null;
          }
        } catch { /* ignore */ }
      }, 2000);
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current); pollRef.current = null;
          setCallState(prev => prev === 'ringing' ? 'error' : prev);
        }
      }, 5 * 60 * 1000);
    } catch (err) {
      setCallState('error');
      setError(err.message || 'Something went wrong.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canCall) initiateDemoCall();
  };

  const isActive = callState === 'ringing' || callState === 'connected';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-[calc(100vw-40px)] sm:w-[348px] rounded-[24px] overflow-hidden relative"
            style={{
              background: 'linear-gradient(170deg, #201916 0%, #181210 40%, #141110 100%)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(232,85,15,0.04)',
            }}
          >
            {/* Ambient background glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                width: 200, height: 200,
                background: 'radial-gradient(circle, rgba(232,85,15,0.06) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all cursor-pointer z-10"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative px-7 pt-8 pb-7 flex flex-col items-center text-center">

              {/* ── IDLE ── */}
              {callState === 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="w-full"
                >
                  <NebulaOrb state="idle" />

                  <h3 className="mt-5 text-[18px] font-display font-semibold text-white tracking-tight">
                    Talk to Us
                  </h3>
                  <p className="mt-2 text-[13px] text-white/35 font-body leading-[1.6] max-w-[250px] mx-auto">
                    Our AI will call you about VoxBharat in your preferred language
                  </p>

                  <div className="mt-6 w-full space-y-3">
                    <div className="flex gap-2">
                      {/* Country code selector — custom dropdown */}
                      <div className="relative flex-shrink-0" ref={countryRef}>
                        <button
                          type="button"
                          onClick={() => setCountryOpen(o => !o)}
                          className="h-full pl-3 pr-7 rounded-2xl font-body text-[13px] text-white/60 outline-none cursor-pointer transition-all duration-200 flex items-center whitespace-nowrap"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${countryOpen ? 'rgba(232,85,15,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                            minWidth: 76,
                          }}
                        >
                          {COUNTRIES.find(c => c.code === countryCode)?.label}
                        </button>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                          <svg className="w-3 h-3 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {countryOpen && (
                          <div
                            className="absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden z-20"
                            style={{
                              background: '#1e1410',
                              border: '1px solid rgba(255,255,255,0.08)',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                              minWidth: '100%',
                            }}
                          >
                            {COUNTRIES.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => { setCountryCode(c.code); setPhone(''); setCountryOpen(false); }}
                                className="w-full text-left px-3 py-2.5 font-body text-[13px] transition-colors duration-150 cursor-pointer"
                                style={{
                                  color: countryCode === c.code ? '#e8550f' : 'rgba(255,255,255,0.55)',
                                  background: countryCode === c.code ? 'rgba(232,85,15,0.1)' : 'transparent',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = countryCode === c.code ? 'rgba(232,85,15,0.1)' : 'transparent'; }}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Phone number input */}
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                        onKeyDown={handleKeyDown}
                        placeholder="Phone number"
                        maxLength={12}
                        className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl font-body text-[14px] text-white placeholder:text-white/15 transition-all duration-300 outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(232,85,15,0.3)';
                          e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.2), 0 0 0 3px rgba(232,85,15,0.06)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.06)';
                          e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.2)';
                        }}
                      />
                    </div>

                    <motion.button
                      onClick={initiateDemoCall}
                      disabled={!canCall}
                      className="w-full py-3.5 rounded-2xl font-body font-semibold text-[14px] transition-all duration-300 cursor-pointer outline-none"
                      style={{
                        color: !canCall ? 'rgba(255,255,255,0.2)' : '#fff',
                        background: !canCall
                          ? 'rgba(255,255,255,0.04)'
                          : 'linear-gradient(135deg, #e8550f 0%, #c24a0e 100%)',
                        boxShadow: !canCall
                          ? 'none'
                          : '0 4px 20px rgba(232,85,15,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                        cursor: !canCall ? 'not-allowed' : 'pointer',
                      }}
                      whileHover={canCall ? { scale: 1.01, y: -1 } : {}}
                      whileTap={canCall ? { scale: 0.98 } : {}}
                    >
                      Call Me
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── REQUESTING ── */}
              {callState === 'requesting' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="py-6"
                >
                  <NebulaOrb state="requesting" />
                  <motion.p
                    className="mt-6 text-[14px] text-white/50 font-body"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Connecting...
                  </motion.p>
                </motion.div>
              )}

              {/* ── RINGING ── */}
              {callState === 'ringing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="py-4"
                >
                  <RingPulse />
                  <p className="mt-5 text-[16px] text-white font-display font-semibold tracking-tight">
                    Ringing your phone...
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/30 font-body">
                    Pick up to talk to our AI
                  </p>
                </motion.div>
              )}

              {/* ── CONNECTED ── */}
              {callState === 'connected' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="py-4 w-full"
                >
                  <div className="py-2">
                    <AudioBars speaking={isSpeaking} />
                  </div>
                  <p className="mt-5 text-[16px] text-white font-display font-semibold tracking-tight">
                    You're connected
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/30 font-body">
                    Hang up anytime
                  </p>
                  <p className="mt-4 text-[11px] text-white/15 font-body tabular-nums tracking-widest">
                    {formatTime(callDuration)}
                  </p>
                </motion.div>
              )}

              {/* ── COMPLETED ── */}
              {callState === 'completed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="py-2"
                >
                  <AnimatedCheck />
                  <p className="mt-3 text-[16px] text-white font-display font-semibold tracking-tight">
                    Thanks for trying VoxBharat!
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/30 font-body">
                    Our team will follow up with details
                  </p>
                  <button
                    onClick={reset}
                    className="mt-5 text-[12px] text-[#e8550f]/80 hover:text-[#e8550f] font-body transition-colors cursor-pointer"
                  >
                    Try another number
                  </button>
                </motion.div>
              )}

              {/* ── ERROR ── */}
              {callState === 'error' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="py-2"
                >
                  <NebulaOrb state="error" />
                  <p className="mt-5 text-[13px] text-red-400/80 font-body leading-relaxed max-w-[260px] mx-auto">
                    {error}
                  </p>
                  <button
                    onClick={reset}
                    className="mt-5 px-6 py-2.5 rounded-xl text-[12px] font-body text-white/50 hover:text-white/70 transition-all cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Try again
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingButton
        isOpen={isOpen}
        isHovered={isHovered}
        isActive={isActive}
        onClick={() => setIsOpen(!isOpen)}
        onHover={() => setIsHovered(true)}
        onLeave={() => setIsHovered(false)}
      />
    </div>
  );
}
