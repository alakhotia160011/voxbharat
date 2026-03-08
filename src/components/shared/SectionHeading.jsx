import React from 'react';

const devanagariNumerals = ['१', '२', '३', '४', '५', '६', '७', '८'];

const SectionHeading = ({
  number,
  title,
  subtitle,
  light = false,
  className = '',
}) => {
  const numeral = number != null ? (devanagariNumerals[number - 1] || String(number)) : null;

  return (
    <div className={className}>
      {/* Numeral row with extending line */}
      {numeral && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-gold font-serif-indic text-lg leading-none">
            {numeral}
          </span>
          <div className="flex-1 h-px bg-gold/30" />
        </div>
      )}

      {/* Title */}
      <h2
        className={`font-display font-bold leading-tight text-[1.75rem] md:text-[2.5rem] lg:text-[3.5rem] ${
          light ? 'text-cream' : 'text-earth'
        }`}
      >
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`mt-4 font-body text-lg leading-relaxed ${
            light ? 'text-cream/70' : 'text-earth-mid'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
