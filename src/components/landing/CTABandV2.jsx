import React from 'react';
import { motion } from 'framer-motion';

export default function CTABandV2({ onCreateSurvey }) {
  return (
    <section className="bg-saffron py-16 lg:py-20 px-6">
      <motion.div
        className="max-w-3xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
          Ready to Hear Bharat?
        </h2>
        <p className="font-body text-white/80 text-lg mt-4">
          Create your first voice survey in minutes. No coding required.
        </p>
        <motion.button
          onClick={onCreateSurvey}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="mt-8 px-10 py-4 bg-transparent border-2 border-cream text-cream rounded-full font-body text-lg font-semibold hover:bg-cream hover:text-saffron transition-colors cursor-pointer"
        >
          Start Free Trial
        </motion.button>
        <div className="mt-8 text-white/30 text-sm font-serif-indic">
          शुरू &middot; শুরু &middot; தொடங்கு &middot; ప్రారంభం &middot; सुरू &middot; શરૂ &middot; ಆರಂಭ &middot; ആരംഭം &middot; ਸ਼ੁਰੂ &middot; ଆରମ୍ଭ
        </div>
      </motion.div>
    </section>
  );
}
