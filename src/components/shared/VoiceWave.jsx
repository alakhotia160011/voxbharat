import React, { useState, useEffect } from 'react';

const VoiceWave = ({ active, color = '#e8550f' }) => {
  const [heights, setHeights] = useState([4,4,4,4,4,4,4,4]);

  useEffect(() => {
    if (!active) {
      setHeights([4,4,4,4,4,4,4,4]);
      return;
    }
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => Math.random() * 20 + 8));
    }, 100);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-10">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-100"
          style={{ backgroundColor: color, height: `${active ? h : 4}px`, opacity: active ? 0.9 : 0.3 }}
        />
      ))}
    </div>
  );
};

export default VoiceWave;
