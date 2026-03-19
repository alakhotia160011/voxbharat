import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBuilder } from '../../contexts/BuilderContext';

const Footer = () => {
  const { setShowBuilder } = useBuilder();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/memo', label: 'Memo' },
    { to: '/about', label: 'About' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/faqs', label: 'FAQs' },
    { to: '/api-docs', label: 'API Docs' },
    { to: '/data-policy', label: 'Data Policy' },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8 }}
      className="bg-[#1a1210] text-[#faf8f5] py-20 px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand column */}
          <div>
            <Link to="/" className="flex items-center">
              <span className="font-display text-2xl font-bold">
                <span className="bg-gradient-to-r from-[#e8550f] to-[#c24a0e] bg-clip-text text-transparent">
                  Vox
                </span>
                <span className="text-[#faf8f5]">Bharat</span>
              </span>
            </Link>
            <p className="text-[#faf8f5]/50 text-sm mt-3">
              AI-powered voice surveys for Bharat.
            </p>
          </div>

          {/* Navigate column */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-[#faf8f5]/40 mb-4">
              Navigate
            </h4>
            <div className="space-y-2">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="block text-[#faf8f5]/60 hover:text-[#e8550f] text-sm transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Get Started column */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-[#faf8f5]/40 mb-4">
              Get Started
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => setShowBuilder(true)}
                className="block text-[#faf8f5]/60 hover:text-[#e8550f] text-sm transition-colors cursor-pointer"
              >
                Create Survey
              </button>
              <a
                href="https://cartesia.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[#faf8f5]/60 hover:text-[#e8550f] text-sm transition-colors"
              >
                Cartesia Voice
              </a>
            </div>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex justify-between items-center">
            <span className="text-[#faf8f5]/30 text-sm">
              &copy; 2026 VoxBharat
            </span>
            <div className="flex gap-6">
              <Link
                to="/data-policy"
                className="text-[#faf8f5]/30 text-xs hover:text-[#e8550f] transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/faqs"
                className="text-[#faf8f5]/30 text-xs hover:text-[#e8550f] transition-colors"
              >
                Support
              </Link>
            </div>
          </div>

          {/* Language script watermark */}
          <div className="mt-8 text-[#c4a04a]/30 text-xs font-serif-indic text-center">
            हिंदी &middot; বাংলা &middot; తెలుగు &middot; मराठी &middot; தமிழ் &middot; ગુજરાતી &middot; ಕನ್ನಡ &middot; മലയാളം &middot; ਪੰਜਾਬੀ &middot; ଓଡ଼ିଆ &middot; অসমীয়া &middot; اردو
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
