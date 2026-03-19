import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useBuilder } from '../../contexts/BuilderContext';

const scriptWords = [
  { word: 'सुनिए', lang: 'Hindi' },
  { word: 'শুনুন', lang: 'Bengali' },
  { word: 'கேளுங்கள்', lang: 'Tamil' },
  { word: 'వినండి', lang: 'Telugu' },
  { word: 'ऐका', lang: 'Marathi' },
  { word: 'સાંભળો', lang: 'Gujarati' },
  { word: 'ಕೇಳಿ', lang: 'Kannada' },
  { word: 'കേൾക്കൂ', lang: 'Malayalam' },
  { word: 'ਸੁਣੋ', lang: 'Punjabi' },
];

const floatingScripts = [
  'हिंदी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'मराठी', 'ગુજરાતી',
  'ಕನ್ನಡ', 'മലയാളം', 'ਪੰਜਾਬੀ', 'English',
];

function Waveform() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-48">
      {Array.from({ length: 60 }, (_, i) => {
        const phase = i * 0.15;
        const height = 20 + Math.sin(phase) * 60 + Math.cos(phase * 0.7) * 30;
        return (
          <motion.div
            key={i}
            className="w-[3px] bg-saffron/60 rounded-full"
            animate={{
              scaleY: [1, 0.3 + Math.sin(phase + 1) * 0.7, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 1.5,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.03,
              ease: 'easeInOut',
            }}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

export default function HeroSectionV2({ onCreateSurvey, onWatchDemo }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setShowBuilder } = useBuilder();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(i => (i + 1) % scriptWords.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative bg-dark min-h-screen flex items-center overflow-hidden">
      {/* Floating scripts as watermark */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {floatingScripts.map((s, i) => (
          <span
            key={i}
            className="absolute font-serif-indic text-cream/[0.04] text-6xl md:text-8xl"
            style={{
              top: `${10 + (i * 9) % 80}%`,
              left: `${5 + (i * 13) % 90}%`,
              transform: `rotate(${-15 + (i * 7) % 30}deg)`,
            }}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-32 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-[11px] tracking-[0.25em] text-saffron/60 uppercase">
                AI Voice Surveys for India
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-heading text-[3rem] md:text-[4rem] lg:text-[5.5rem] font-bold text-cream leading-[0.95] mt-6"
            >
              Hear Every
              <br />
              Voice.
              <br />
              <span className="text-saffron">In Every</span>
              <br />
              <span className="text-saffron">Language.</span>
            </motion.h1>

            {/* Cycling script word */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 h-14"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="font-serif-indic text-3xl text-cream/40 block"
                >
                  {scriptWords[currentIndex].word}
                  <span className="text-cream/20 text-sm font-body ml-3">{scriptWords[currentIndex].lang}</span>
                </motion.span>
              </AnimatePresence>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-body text-cream/60 text-lg max-w-lg mt-4"
            >
              Reach 900M+ Indians who prefer speaking over typing. AI-powered phone surveys in 10 languages, on any phone, over 2G.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-4 mt-10"
            >
              <button
                onClick={onCreateSurvey}
                className="px-8 py-4 bg-saffron text-white rounded-full font-body text-sm font-semibold hover:bg-saffron-deep transition-colors cursor-pointer"
              >
                Create Your Survey
              </button>
              <button
                onClick={onWatchDemo}
                className="px-8 py-4 border border-cream/20 text-cream rounded-full font-body text-sm font-semibold hover:bg-cream/5 transition-colors cursor-pointer"
              >
                Hear Demo
              </button>
            </motion.div>
          </div>

          {/* Right — Waveform */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden lg:block"
          >
            <Waveform />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
