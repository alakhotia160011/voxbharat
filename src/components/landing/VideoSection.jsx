import React from 'react';
import { motion } from 'framer-motion';

const VideoSection = () => {
  return (
    <section className="bg-[#1a1210] w-full py-20 lg:py-40 px-6">
      <div className="max-w-5xl mx-auto text-center">
        {/* Heading */}
        <motion.h2
          className="font-display text-[1.75rem] md:text-[2.5rem] lg:text-[3.5rem] leading-tight"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <span className="text-[#faf8f5]/60">India Speaks in</span>
          <span className="text-[#e8550f] font-bold"> 1,652 </span>
          <span className="text-[#faf8f5]/60">Languages.</span>
          <br />
          <span className="text-[#faf8f5]">We Listen in 12. And Counting.</span>
        </motion.h2>

        {/* Video placeholder */}
        <motion.div
          className="mt-12 aspect-video rounded-2xl overflow-hidden bg-[#2a1f1a] border border-white/10 flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {/* Play button */}
          <button
            className="w-20 h-20 rounded-full border-2 border-[#faf8f5]/20 flex items-center justify-center hover:border-[#e8550f]/60 transition-colors duration-300 cursor-pointer"
            aria-label="Play video"
          >
            <svg
              width="28"
              height="32"
              viewBox="0 0 28 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="ml-1"
            >
              <path
                d="M2 2L26 16L2 30V2Z"
                fill="#faf8f5"
                fillOpacity="0.6"
                stroke="#faf8f5"
                strokeOpacity="0.3"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <p className="mt-4 text-sm text-[#faf8f5]/40">
            Coming soon &mdash; cultural storytelling powered by Google Veo
          </p>
        </motion.div>

        {/* Poetic paragraph */}
        <motion.p
          className="mt-8 text-[#faf8f5]/50 text-lg italic max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          From the streets of Varanasi to the backwaters of Kerala, every voice
          carries a story. We're building the technology to hear them all.
        </motion.p>
      </div>
    </section>
  );
};

export default VideoSection;
