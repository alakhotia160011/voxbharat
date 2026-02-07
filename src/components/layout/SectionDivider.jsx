import React from 'react';
import { motion } from 'framer-motion';

const WaveformDivider = ({
  frequency = 3,
  amplitude = 20,
  color = '#e8550f',
  opacity = 0.15,
  className = '',
}) => {
  const width = 1200;
  const height = 60;
  const midY = height / 2;

  // Build a smooth sine wave path
  const points = [];
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = midY + Math.sin((i / steps) * frequency * 2 * Math.PI) * amplitude;
    points.push(`${x},${y}`);
  }
  const d = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(' ')}`;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={opacity}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
};

export default WaveformDivider;
