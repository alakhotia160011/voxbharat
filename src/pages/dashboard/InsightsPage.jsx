import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';

const COLORS = {
  saffron: '#e8550f',
  indigo: '#2d3a6e',
  bark: '#6b4c3a',
  barkLight: '#9a8374',
};

const axisStyle = { fontSize: 11, fill: COLORS.bark, fontFamily: 'DM Sans, sans-serif' };
const axisLine = { stroke: COLORS.barkLight, strokeWidth: 1 };
const tooltipStyle = {
  backgroundColor: '#1a1a1a',
  border: 'none',
  borderRadius: 8,
  color: '#faf8f5',
  fontSize: 12,
  fontFamily: 'DM Sans, sans-serif',
  padding: '8px 12px',
};

function ChartCard({ title, children }) {
  return (
    <div className="bg-white border border-cream-warm rounded-2xl p-6">
      <h3 className="font-heading text-sm font-semibold text-earth mb-4">{title}</h3>
      {children}
    </div>
  );
}

function truncate(str, max = 16) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

export default function InsightsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects()
      .then(d => setProjects(d))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      </div>
    );
  }

  // Aggregate data
  const totalCalls = projects.reduce((s, p) => s + parseInt(p.call_count || 0, 10), 0);

  // Calls by language
  const langMap = {};
  projects.forEach(p => {
    (p.languages || []).forEach(l => {
      langMap[l] = (langMap[l] || 0) + parseInt(p.call_count || 0, 10);
    });
  });
  const langData = Object.entries(langMap)
    .map(([name, value]) => ({ name: name.toUpperCase(), value }))
    .sort((a, b) => b.value - a.value);

  // Calls per survey
  const surveyData = projects
    .map(p => ({
      name: truncate(p.project_name),
      fullName: p.project_name,
      calls: parseInt(p.call_count || 0, 10),
      duration: parseInt(p.call_count || 0, 10) > 0
        ? Math.round((parseInt(p.total_duration || 0, 10) || 0) / parseInt(p.call_count, 10) / 60)
        : 0,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto">
      {projects.length === 0 ? (
        <div className="bg-white border border-cream-warm rounded-xl py-16 px-8 text-center">
          <p className="text-earth-mid text-sm font-body">No data yet. Start making calls to see insights.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calls by Survey */}
          <ChartCard title="Calls by Survey">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={surveyData} margin={{ top: 8, right: 12, left: 0, bottom: 60 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e8e0d6" />
                <XAxis
                  dataKey="name"
                  tick={axisStyle}
                  axisLine={axisLine}
                  tickLine={{ stroke: COLORS.barkLight }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={axisLine}
                  tickLine={{ stroke: COLORS.barkLight }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#faf8f5', fontWeight: 600 }}
                  formatter={(value) => [value, 'Calls']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="calls" fill={COLORS.saffron} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Languages */}
          <ChartCard title="Calls by Language">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={langData} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e8e0d6" />
                <XAxis
                  type="number"
                  tick={axisStyle}
                  axisLine={axisLine}
                  tickLine={{ stroke: COLORS.barkLight }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisStyle}
                  axisLine={axisLine}
                  tickLine={{ stroke: COLORS.barkLight }}
                  width={36}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Calls']}
                />
                <Bar dataKey="value" fill={COLORS.saffron} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Duration by Survey */}
          <ChartCard title="Avg Duration by Survey (min)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={surveyData} margin={{ top: 8, right: 12, left: 0, bottom: 60 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e8e0d6" />
                <XAxis
                  dataKey="name"
                  tick={axisStyle}
                  axisLine={axisLine}
                  tickLine={{ stroke: COLORS.barkLight }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={axisLine}
                  tickLine={{ stroke: COLORS.barkLight }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#faf8f5', fontWeight: 600 }}
                  formatter={(value) => [value, 'Minutes']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="duration" fill={COLORS.indigo} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Summary Stats */}
          <ChartCard title="Summary">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-earth-mid">Total Surveys</span>
                <span className="font-heading text-lg font-bold text-earth">{projects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-earth-mid">Total Calls</span>
                <span className="font-heading text-lg font-bold text-earth">{totalCalls}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-earth-mid">Languages Used</span>
                <span className="font-heading text-lg font-bold text-earth">{Object.keys(langMap).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-earth-mid">Total Duration</span>
                <span className="font-heading text-lg font-bold text-earth">{Math.round(projects.reduce((s, p) => s + (parseInt(p.total_duration || 0, 10) || 0), 0) / 60)} min</span>
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
