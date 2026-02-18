import React from 'react';
import { motion } from 'framer-motion';

const CTASection = ({ onCreateSurvey }) => {
  return (
    <section className="bg-gradient-to-r from-[#e8550f] to-[#c24a0e] w-full py-20 lg:py-32 px-6">
      <motion.div
        className="max-w-3xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <h2 className="font-display text-[2rem] md:text-[2.5rem] lg:text-[3.5rem] text-white font-bold leading-tight">
          Ready to Hear Bharat?
        </h2>
        <p className="text-white/80 text-lg mt-4">
          Create your first voice survey in minutes. No coding required.
        </p>
        <motion.button
          onClick={onCreateSurvey}
          className="px-10 py-5 bg-white text-[#e8550f] rounded-full text-lg font-semibold mt-10 hover:bg-white/90 transition-colors cursor-pointer"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Create Survey | Free Trial
        </motion.button>
        <div className="mt-10 text-white/30 text-sm font-serif-indic">
          शुरू &middot; শুরু &middot; தொடங்கு &middot; ప్రారంభం &middot; सुरू &middot; શરૂ &middot; ಆರಂಭ &middot; ആരംഭം &middot; ਸ਼ੁਰੂ &middot; ଆରମ୍ଭ &middot; আৰম্ভ &middot; شروع
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
