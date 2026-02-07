import React from 'react';

const positionClasses = {
  left: 'left-0 -translate-x-1/4',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0 translate-x-1/4',
};

const ScriptWatermark = ({
  character,
  opacity = 0.04,
  position = 'right',
  size = '400px',
  className = '',
}) => {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-1/2 -translate-y-1/2 pointer-events-none select-none overflow-hidden leading-none ${positionClasses[position] || positionClasses.right} ${className}`}
      style={{
        fontFamily: "'Noto Serif Devanagari', serif",
        fontSize: size,
        color: '#3d2314',
        opacity,
      }}
    >
      {character}
    </span>
  );
};

export default ScriptWatermark;
