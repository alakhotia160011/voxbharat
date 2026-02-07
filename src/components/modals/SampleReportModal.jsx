import React from 'react';
import BarChart from '../shared/BarChart';

export default function SampleReportModal({ show, onClose, data, onCreateSurvey }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Report Header */}
        <div className="p-6 border-b bg-gradient-to-r from-[#3d2314] to-[#e8550f] text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Sample Research Report</div>
              <h2 className="font-display text-2xl font-bold">{data.metadata.title}</h2>
              <p className="text-white/80 mt-1">{data.metadata.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          {/* Key Stats Bar */}
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
            <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">1</span>
              Executive Summary
            </h3>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              {data.insights.map((insight, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#e8550f] mt-2 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-[#3d2314]">{insight.title}</div>
                    <div className="text-sm text-gray-600">{insight.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Demographics */}
          <section>
            <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">2</span>
              Sample Demographics
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <h4 className="font-semibold text-[#3d2314] mb-4">Age Distribution</h4>
                <BarChart data={data.demographics.byAge} labelKey="group" />
              </div>
              <div className="bg-white border rounded-xl p-5">
                <h4 className="font-semibold text-[#3d2314] mb-4">Religious Affiliation</h4>
                <BarChart data={data.demographics.byReligion} labelKey="group" />
              </div>
              <div className="bg-white border rounded-xl p-5">
                <h4 className="font-semibold text-[#3d2314] mb-4">Survey Language</h4>
                <BarChart data={data.demographics.byLanguage} labelKey="group" color="#cc4400" />
              </div>
              <div className="bg-white border rounded-xl p-5">
                <h4 className="font-semibold text-[#3d2314] mb-4">Gender</h4>
                <BarChart data={data.demographics.byGender} labelKey="group" color="#e85d04" />
              </div>
            </div>
          </section>

          {/* Key Findings */}
          <section>
            <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">3</span>
              Key Findings
            </h3>
            <div className="space-y-6">
              {data.keyFindings.map((finding, i) => (
                <div key={i} className="bg-white border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{finding.metric}</div>
                      <h4 className="font-semibold text-[#3d2314] text-lg">{finding.headline}</h4>
                    </div>
                  </div>
                  <BarChart data={finding.breakdown} />
                </div>
              ))}
            </div>
          </section>

          {/* Cross-tabulations */}
          <section>
            <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">4</span>
              Cross-Tabulations
            </h3>

            {/* Age vs Interfaith Marriage */}
            <div className="bg-white border rounded-xl p-5 mb-6">
              <h4 className="font-semibold text-[#3d2314] mb-4">Interfaith Marriage Acceptance by Age Group</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Age Group</th>
                      <th className="text-center py-2 px-3 font-medium text-green-600">Would Accept</th>
                      <th className="text-center py-2 px-3 font-medium text-yellow-600">Difficult</th>
                      <th className="text-center py-2 px-3 font-medium text-red-600">Would Reject</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Depends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crosstabs.ageVsInterfaithMarriage.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
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
                          <span className="inline-block w-12 py-1 rounded bg-gray-100 text-gray-700 font-medium">{row.depends}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                Note: Younger respondents show significantly higher acceptance rates for interfaith marriage
              </p>
            </div>

            {/* Religion vs Interfaith Marriage */}
            <div className="bg-white border rounded-xl p-5">
              <h4 className="font-semibold text-[#3d2314] mb-4">Interfaith Marriage Acceptance by Religion</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Religion</th>
                      <th className="text-center py-2 px-3 font-medium text-green-600">Would Accept</th>
                      <th className="text-center py-2 px-3 font-medium text-yellow-600">Difficult</th>
                      <th className="text-center py-2 px-3 font-medium text-red-600">Would Reject</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Depends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crosstabs.religionVsInterfaithMarriage.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
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
                          <span className="inline-block w-12 py-1 rounded bg-gray-100 text-gray-700 font-medium">{row.depends}%</span>
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
            <h3 className="font-display text-xl font-bold text-[#3d2314] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-sm">5</span>
              Methodology
            </h3>
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-0 text-sm">
                {Object.entries(data.methodology).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[140px_1fr] gap-3 py-3 border-b border-gray-200 last:border-0">
                    <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium text-[#3d2314] text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-[#e8550f] to-[#cc4400] rounded-xl p-6 text-white text-center">
            <h3 className="font-display text-xl font-bold mb-2">Ready to run your own voice survey?</h3>
            <p className="text-white/80 mb-4">Get results like this in days, not months. No enumerators needed.</p>
            <button
              onClick={onCreateSurvey}
              className="px-6 py-3 bg-white text-[#e8550f] rounded-lg font-semibold hover:bg-gray-100"
            >
              Create Your Survey →
            </button>
          </section>

        </div>

        {/* Report Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {data.metadata.conductedBy} • {data.metadata.dateRange}
          </div>
          <div className="flex gap-2">
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
              className="px-3 py-1.5 text-sm bg-[#e8550f] text-white rounded-lg hover:bg-[#cc4400]"
            >
              ↓ Download Report
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
