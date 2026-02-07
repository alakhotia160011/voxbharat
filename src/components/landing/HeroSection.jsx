import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

const listenTranslations = [
  'सुनिए',
  'শুনুন',
  'கேளுங்கள்',
  'వినండి',
  'ऐका',
  'સાંભળો',
  'ಕೇಳಿ',
  'കേൾക്കൂ',
  'ਸੁਣੋ',
  'ଶୁଣନ୍ତୁ',
  'শুনক',
  'سنیے',
];

const languageNames = [
  'हिंदी',
  'বাংলা',
  'తెలుగు',
  'मराठी',
  'தமிழ்',
  'ગુજરાતી',
  'ಕನ್ನಡ',
  'മലయാളം',
  'ਪੰਜਾਬੀ',
  'ଓଡ଼ିଆ',
  'অসমীয়া',
  'اردو',
];

// Hand-crafted positions for a scattered typographic composition
const languageWallItems = [
  { text: 'हिंदी', size: '6rem', top: '2%', left: '5%', opacity: 0.2 },
  { text: 'বাংলা', size: '3rem', top: '8%', left: '60%', opacity: 0.12 },
  { text: 'తెలుగు', size: '2rem', top: '18%', left: '35%', opacity: 0.1 },
  { text: 'मराठी', size: '3rem', top: '25%', left: '70%', opacity: 0.18 },
  { text: 'தமிழ்', size: '6rem', top: '30%', left: '10%', opacity: 0.25 },
  { text: 'ગુજરાતી', size: '2rem', top: '42%', left: '55%', opacity: 0.08 },
  { text: 'ಕನ್ನಡ', size: '3rem', top: '50%', left: '25%', opacity: 0.15 },
  { text: 'മലയാളം', size: '2rem', top: '55%', left: '68%', opacity: 0.12 },
  { text: 'ਪੰਜਾਬੀ', size: '6rem', top: '62%', left: '40%', opacity: 0.2 },
  { text: 'ଓଡ଼ିଆ', size: '2rem', top: '72%', left: '8%', opacity: 0.1 },
  { text: 'অসমীয়া', size: '3rem', top: '78%', left: '58%', opacity: 0.15 },
  { text: 'اردو', size: '3rem', top: '88%', left: '30%', opacity: 0.18 },
];

const headlineWords = ['Hear', 'Every', 'Voice.', '\n', 'In', 'Every', 'Language.'];

const HeroSection = ({ onCreateSurvey, onWatchDemo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for disabling parallax
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Parallax: disabled on mobile for performance
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 600], [0, isMobile ? 0 : -40]);
  const wallY = useTransform(scrollY, [0, 600], [0, isMobile ? 0 : 20]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % listenTranslations.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen flex items-center py-20 lg:py-32 px-6 bg-[#faf8f5] overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Left Column — Copy */}
        <motion.div
          className="flex flex-col gap-8"
          style={{ y: textY }}
        >
          {/* Overline */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="uppercase text-xs tracking-[0.2em] text-[#c4a04a] font-body"
          >
            Voice AI for Bharat
          </motion.span>

          {/* Headline — two lines */}
          <h1 className="font-display font-bold text-[2.5rem] lg:text-[4rem] leading-[1.1] text-[#3d2314]">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="block whitespace-nowrap"
            >
              Hear Every Voice.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="block whitespace-nowrap"
            >
              In Every Language.
            </motion.span>
          </h1>

          {/* Cycling Translation */}
          <div className="h-[3rem] lg:h-[4.5rem] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute left-0 top-0 text-[2rem] lg:text-[3.5rem] font-serif-indic text-[#e8550f] leading-tight"
              >
                {listenTranslations[currentIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-lg text-[#6b4c3a] max-w-lg leading-relaxed font-body"
          >
            Reach 900M+ Indians who prefer speaking over typing. AI voice
            surveys in 12 languages, at 10x lower cost.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex flex-wrap gap-4 mt-2"
          >
            <motion.button
              onClick={onCreateSurvey}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-gradient-to-r from-[#e8550f] to-[#c24a0e] text-white rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            >
              Create Your First Survey
            </motion.button>
            <motion.button
              onClick={onWatchDemo}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 border-2 border-[#3d2314]/20 text-[#3d2314] rounded-full font-medium text-lg hover:border-[#3d2314]/40 transition-colors duration-300 flex items-center gap-2 cursor-pointer"
            >
              <span className="text-sm">&#9654;</span>
              Watch Demo
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Right Column — The Language Wall (hidden on mobile) */}
        <motion.div
          className="hidden lg:block relative w-full h-[600px] select-none"
          aria-hidden="true"
          style={{ y: wallY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
        >
          {languageWallItems.map((item, i) => (
            <motion.span
              key={i}
              className="absolute font-serif-indic text-[#3d2314] whitespace-nowrap cursor-default"
              style={{
                fontSize: item.size,
                top: item.top,
                left: item.left,
                opacity: item.opacity,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: item.opacity, scale: 1 }}
              whileHover={{ scale: 1.3, opacity: 0.5, transition: { type: 'spring', stiffness: 150, damping: 15 } }}
              transition={{ duration: 0.8, delay: 1.0 + i * 0.06 }}
            >
              {item.text}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
