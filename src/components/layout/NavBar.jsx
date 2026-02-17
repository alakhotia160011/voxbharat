import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NavBar = ({ currentPage, navigateTo, setShowBuilder }) => {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 100);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on navigation
  const handleNav = (page) => {
    setMobileOpen(false);
    navigateTo(page);
  };

  const navLinks = [
    { page: 'home', label: 'Home' },
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'how-it-works', label: 'How It Works' },
    { page: 'about', label: 'About' },
    { page: 'faqs', label: 'FAQs' },
    { page: 'data-policy', label: 'Data Policy' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? 'bg-[#faf8f5]/90 backdrop-blur-xl border-b border-[#e8550f]/10'
          : 'bg-transparent'
      }`}
    >
      {/* Scroll progress bar */}
      <div
        className="h-0.5 bg-[#e8550f] transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => handleNav('home')} className="flex items-center cursor-pointer">
          <span className="font-display text-2xl font-bold">
            <span className="bg-gradient-to-r from-[#e8550f] to-[#c24a0e] bg-clip-text text-transparent">
              Vox
            </span>
            <span className="text-[#3d2314]">Bharat</span>
          </span>
        </button>

        {/* Desktop nav links + CTA */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ page, label }) => (
            <button
              key={page}
              onClick={() => handleNav(page)}
              className={`font-body text-sm transition-colors cursor-pointer ${
                currentPage === page
                  ? 'text-[#e8550f] font-medium'
                  : 'text-[#6b4c3a] hover:text-[#e8550f]'
              }`}
            >
              {label}
            </button>
          ))}
          <motion.button
            onClick={() => setShowBuilder(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2 bg-[#e8550f] text-white rounded-full font-body text-sm font-medium hover:bg-[#c24a0e] transition-colors cursor-pointer"
          >
            Create Survey &rarr;
          </motion.button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-[#3d2314] cursor-pointer"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden bg-[#faf8f5]/95 backdrop-blur-xl border-t border-[#e8550f]/10"
          >
            <div className="px-6 py-4 space-y-3">
              {navLinks.map(({ page, label }) => (
                <button
                  key={page}
                  onClick={() => handleNav(page)}
                  className={`block w-full text-left font-body text-base py-2 transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'text-[#e8550f] font-medium'
                      : 'text-[#3d2314] hover:text-[#e8550f]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => { setMobileOpen(false); setShowBuilder(true); }}
                className="w-full mt-2 px-5 py-3 bg-[#e8550f] text-white rounded-full font-body text-sm font-medium hover:bg-[#c24a0e] transition-colors cursor-pointer"
              >
                Create Survey &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavBar;
