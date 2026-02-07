import React from 'react';

export default function SampleCallLogModal({ show, onClose, data }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-[#3d2314] to-[#e8550f] text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Sample Call Log</div>
              <h2 className="font-display text-2xl font-bold">AI Voice Survey - Single Call</h2>
              <p className="text-white/80 mt-1">What each completed call produces</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/20 text-sm">
            <div>
              <div className="text-lg font-bold">{Math.floor(data.duration / 60)}m {data.duration % 60}s</div>
              <div className="text-xs text-white/60">Duration</div>
            </div>
            <div>
              <div className="text-lg font-bold">{data.language}</div>
              <div className="text-xs text-white/60">Language</div>
            </div>
            <div>
              <div className="text-lg font-bold capitalize">{data.status}</div>
              <div className="text-xs text-white/60">Status</div>
            </div>
            <div>
              <div className="text-lg font-bold">{data.phone}</div>
              <div className="text-xs text-white/60">Phone</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* AI Summary */}
          <section>
            <h3 className="font-display text-lg font-bold text-[#3d2314] mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-xs font-bold">1</span>
              AI Summary
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700 italic">
              "{data.summary}"
            </div>
          </section>

          {/* Conversation Transcript */}
          <section>
            <h3 className="font-display text-lg font-bold text-[#3d2314] mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-xs font-bold">2</span>
              Conversation Transcript
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
              {data.transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                      : 'bg-[#e8550f] text-white rounded-br-md'
                  }`}>
                    <div className="text-[10px] uppercase tracking-wider mb-1 opacity-60">
                      {msg.role === 'assistant' ? 'AI Interviewer' : 'Respondent'}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Extracted Data */}
          <section>
            <h3 className="font-display text-lg font-bold text-[#3d2314] mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#e8550f]/10 flex items-center justify-center text-xs font-bold">3</span>
              Extracted Structured Data
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Demographics */}
              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-semibold text-[#3d2314] mb-3 text-sm uppercase tracking-wider">Demographics</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(data.extractedData.demographics).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium text-[#3d2314]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sentiment */}
              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-semibold text-[#3d2314] mb-3 text-sm uppercase tracking-wider">Sentiment Analysis</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(data.extractedData.sentiment).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-gray-500 capitalize">{key}</span>
                      <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                        value === 'positive' || value === 'high' ? 'bg-green-100 text-green-700' :
                        value === 'neutral' || value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Structured Survey Responses */}
            <div className="bg-white border rounded-xl p-4 mt-4">
              <h4 className="font-semibold text-[#3d2314] mb-3 text-sm uppercase tracking-wider">Survey Responses</h4>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-0 text-sm">
                {Object.entries(data.extractedData.structured).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}</span>
                    <span className="font-medium text-[#3d2314]">{value !== null ? String(value).replace(/_/g, ' ') : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Call ID: {data.id} &middot; {new Date(data.timestamp).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'voxbharat-sample-call-log.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 text-sm bg-[#e8550f] text-white rounded-lg hover:bg-[#cc4400]"
            >
              ↓ Download JSON
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
