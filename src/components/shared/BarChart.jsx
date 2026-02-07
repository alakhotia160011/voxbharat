import React from 'react';

const BarChart = ({ data, valueKey = 'pct', labelKey = 'label', color = '#e8550f', showValue = true }) => (
  <div className="space-y-2">
    {data.map((item, i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="w-28 text-sm text-gray-600 truncate">{item[labelKey] || item.group}</div>
        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${item[valueKey]}%`, backgroundColor: item.color || color }}
          >
            {showValue && item[valueKey] > 10 && (
              <span className="text-xs text-white font-medium">{item[valueKey]}%</span>
            )}
          </div>
        </div>
        {showValue && item[valueKey] <= 10 && (
          <span className="text-xs text-gray-500 w-10">{item[valueKey]}%</span>
        )}
      </div>
    ))}
  </div>
);

export default BarChart;
