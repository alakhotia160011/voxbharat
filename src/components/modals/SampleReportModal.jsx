import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BarChart from '../shared/BarChart';
import { modalBackdrop, modalContainer } from '../../styles/animations';

const sectionNumerals = ['१', '२', '३', '४', '५'];

export default function SampleReportModal({ show, onClose, data, onCreateSurvey }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          variants={modalBackdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col"
            variants={modalContainer}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Report Header */}
            <div className="p-6 border-b bg-gradient-to-r from-earth to-saffron text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Sample Research Report</div>
                  <h2 className="font-display text-2xl font-bold">{data.metadata.title}</h2>
                  <p className="text-white/80 mt-1">{data.metadata.subtitle}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
                <div>
                  <div className="text-2xl font-bold">{data.metadata.totalResponses}</div>
                  <div className="text-xs text-white/60">Responses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">±{data.metadata.marginOfError}%</div>
                  <div className="text-xs text-white/60">Margin of Error</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.metadata.completionRate}%</div>
                  <div className="text-xs text-white/60">Completion Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.metadata.avgDuration}</div>
                  <div className="text-xs text-white/60">Avg Duration</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-xs text-white/60">Languages</div>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* Executive Summary */}
              <section>
                <h3 className="font-display text-xl font-bold text-earth mb-4 flex items-center gap-3">
                  <span className="text-2xl font-serif-indic text-gold leading-none">{sectionNumerals[0]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Executive Summary</span>
                </h3>
                <div className="bg-cream-warm rounded-xl p-5 space-y-3">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-saffron mt-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-earth">{insight.title}</div>
                        <div className="text-sm text-earth-mid">{insight.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Demographics */}
              <section>
                <h3 className="font-display text-xl font-bold text-earth mb-4 flex items-center gap-3">
                  <span className="text-2xl font-serif-indic text-gold leading-none">{sectionNumerals[1]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Sample Demographics</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-cream-warm rounded-xl p-5">
                    <h4 className="font-semibold text-earth mb-4">Age Distribution</h4>
                    <BarChart data={data.demographics.byAge} labelKey="group" />
                  </div>
                  <div className="bg-white border border-cream-warm rounded-xl p-5">
                    <h4 className="font-semibold text-earth mb-4">Religious Affiliation</h4>
                    <BarChart data={data.demographics.byReligion} labelKey="group" />
                  </div>
                  <div className="bg-white border border-cream-warm rounded-xl p-5">
                    <h4 className="font-semibold text-earth mb-4">Survey Language</h4>
                    <BarChart data={data.demographics.byLanguage} labelKey="group" color="#c24a0e" />
                  </div>
                  <div className="bg-white border border-cream-warm rounded-xl p-5">
                    <h4 className="font-semibold text-earth mb-4">Gender</h4>
                    <BarChart data={data.demographics.byGender} labelKey="group" color="#e8550f" />
                  </div>
                </div>
              </section>

              {/* Key Findings */}
              <section>
                <h3 className="font-display text-xl font-bold text-earth mb-4 flex items-center gap-3">
                  <span className="text-2xl font-serif-indic text-gold leading-none">{sectionNumerals[2]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Key Findings</span>
                </h3>
                <div className="space-y-6">
                  {data.keyFindings.map((finding, i) => (
                    <div key={i} className="bg-white border border-cream-warm rounded-xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-earth-mid/60 mb-1">{finding.metric}</div>
                          <h4 className="font-semibold text-earth text-lg">{finding.headline}</h4>
                        </div>
                      </div>
                      <BarChart data={finding.breakdown} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Cross-tabulations */}
              <section>
                <h3 className="font-display text-xl font-bold text-earth mb-4 flex items-center gap-3">
                  <span className="text-2xl font-serif-indic text-gold leading-none">{sectionNumerals[3]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Cross-Tabulations</span>
                </h3>

                <div className="bg-white border border-cream-warm rounded-xl p-5 mb-6">
                  <h4 className="font-semibold text-earth mb-4">Interfaith Marriage Acceptance by Age Group</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-cream-warm">
                          <th className="text-left py-2 px-3 font-medium text-earth-mid">Age Group</th>
                          <th className="text-center py-2 px-3 font-medium text-green-600">Would Accept</th>
                          <th className="text-center py-2 px-3 font-medium text-yellow-600">Difficult</th>
                          <th className="text-center py-2 px-3 font-medium text-red-600">Would Reject</th>
                          <th className="text-center py-2 px-3 font-medium text-earth-mid">Depends</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.crosstabs.ageVsInterfaithMarriage.map((row, i) => (
                          <tr key={i} className="border-b border-cream-warm last:border-0">
                            <td className="py-3 px-3 font-medium">{row.age}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-green-100 text-green-700 font-medium">{row.accept}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">{row.difficult}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-red-100 text-red-700 font-medium">{row.reject}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-cream-warm text-earth-mid font-medium">{row.depends}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-earth-mid/60 mt-3 italic">
                    Note: Younger respondents show significantly higher acceptance rates for interfaith marriage
                  </p>
                </div>

                <div className="bg-white border border-cream-warm rounded-xl p-5">
                  <h4 className="font-semibold text-earth mb-4">Interfaith Marriage Acceptance by Religion</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-cream-warm">
                          <th className="text-left py-2 px-3 font-medium text-earth-mid">Religion</th>
                          <th className="text-center py-2 px-3 font-medium text-green-600">Would Accept</th>
                          <th className="text-center py-2 px-3 font-medium text-yellow-600">Difficult</th>
                          <th className="text-center py-2 px-3 font-medium text-red-600">Would Reject</th>
                          <th className="text-center py-2 px-3 font-medium text-earth-mid">Depends</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.crosstabs.religionVsInterfaithMarriage.map((row, i) => (
                          <tr key={i} className="border-b border-cream-warm last:border-0">
                            <td className="py-3 px-3 font-medium">{row.religion}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-green-100 text-green-700 font-medium">{row.accept}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">{row.difficult}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-red-100 text-red-700 font-medium">{row.reject}%</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block w-12 py-1 rounded bg-cream-warm text-earth-mid font-medium">{row.depends}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Methodology */}
              <section>
                <h3 className="font-display text-xl font-bold text-earth mb-4 flex items-center gap-3">
                  <span className="text-2xl font-serif-indic text-gold leading-none">{sectionNumerals[4]}</span>
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-sm font-body text-earth-mid font-normal">Methodology</span>
                </h3>
                <div className="bg-cream-warm rounded-xl p-5">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-0 text-sm">
                    {Object.entries(data.methodology).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[140px_1fr] gap-3 py-3 border-b border-earth/10 last:border-0">
                        <span className="text-earth-mid capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium text-earth text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* CTA */}
              <section className="bg-gradient-to-r from-saffron to-saffron-deep rounded-xl p-6 text-white text-center">
                <h3 className="font-display text-xl font-bold mb-2">Ready to run your own voice survey?</h3>
                <p className="text-white/80 mb-4">Get results like this in days, not months. No enumerators needed.</p>
                <button
                  onClick={onCreateSurvey}
                  className="px-6 py-3 bg-white text-saffron rounded-lg font-semibold hover:bg-cream transition-colors cursor-pointer"
                >
                  Create Your Survey →
                </button>
              </section>

            </div>

            {/* Report Footer */}
            <div className="p-4 border-t bg-cream-warm flex items-center justify-between">
              <div className="text-xs text-earth-mid/60">
                {data.metadata.conductedBy} • {data.metadata.dateRange}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const rows = [['Section', 'Category', 'Label', 'Value', 'Percentage']];
                    data.demographics.byAge.forEach(r => rows.push(['Demographics', 'Age', r.group, r.count, r.pct + '%']));
                    data.demographics.byReligion.forEach(r => rows.push(['Demographics', 'Religion', r.group, r.count, r.pct + '%']));
                    data.demographics.byLanguage.forEach(r => rows.push(['Demographics', 'Language', r.group, r.count, r.pct + '%']));
                    data.demographics.byGender.forEach(r => rows.push(['Demographics', 'Gender', r.group, r.count, r.pct + '%']));
                    data.keyFindings.forEach(f => {
                      f.breakdown.forEach(b => rows.push(['Key Findings', f.metric, b.label, '', b.pct + '%']));
                    });
                    data.crosstabs.ageVsInterfaithMarriage.forEach(r => rows.push(['Cross-tab: Age vs Marriage', r.age, 'Accept/Difficult/Reject/Depends', '', `${r.accept}%/${r.difficult}%/${r.reject}%/${r.depends}%`]));
                    data.crosstabs.religionVsInterfaithMarriage.forEach(r => rows.push(['Cross-tab: Religion vs Marriage', r.religion, 'Accept/Difficult/Reject/Depends', '', `${r.accept}%/${r.difficult}%/${r.reject}%/${r.depends}%`]));
                    Object.entries(data.methodology).forEach(([k, v]) => rows.push(['Methodology', k.replace(/([A-Z])/g, ' $1').trim(), '', v, '']));
                    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'voxbharat-sample-report.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 text-sm bg-saffron text-white rounded-lg hover:bg-saffron-deep cursor-pointer"
                >
                  ↓ CSV
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'voxbharat-sample-report.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 text-sm bg-saffron text-white rounded-lg hover:bg-saffron-deep cursor-pointer"
                >
                  ↓ JSON
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm bg-earth/10 text-earth-mid rounded-lg hover:bg-earth/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
