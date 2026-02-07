import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '../shared/AnimatedCounter';

const stats = [
  { value: 12, suffix: '', label: 'Languages' },
  { value: 73, suffix: '%', label: 'Rural Reach' },
  { value: 10, suffix: 'x', label: 'Cheaper' },
  { value: 48, suffix: 'hr', label: 'Turnaround' },
];

const StatsBar = () => {
  // Build a subtle sine-wave SVG path for the bottom waveform
  const svgWidth = 1200;
  const svgHeight = 60;
  const midY = svgHeight / 2;
  const frequency = 4;
  const amplitude = 16;
  const steps = 200;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * svgWidth;
    const y =
      midY + Math.sin((i / steps) * frequency * 2 * Math.PI) * amplitude;
    points.push(`${x},${y}`);
  }
  const wavePath = `M${points[0]} ${points
    .slice(1)
    .map((p) => `L${p}`)
    .join(' ')}`;

  return (
    <section className="w-full bg-[#1a1210] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className={`flex flex-col items-center justify-center ${
                i > 0 ? 'md:border-l md:border-[#c4a04a]/20' : ''
              }`}
            >
              <div className="text-[3rem] font-display font-bold leading-none bg-gradient-to-r from-[#e8550f] to-[#c4a04a] bg-clip-text text-transparent">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-[#faf8f5]/60 uppercase tracking-[0.1em] mt-2 font-body">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Subtle Waveform */}
        <div className="w-full overflow-hidden mt-12" aria-hidden="true">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={wavePath}
              fill="none"
              stroke="#faf8f5"
              strokeWidth="1.5"
              strokeOpacity="0.05"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
