import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/**
 * MonthlyTrends – Bar chart showing monthly emission totals over time
 * Uses green gradient fill, formatted month labels
 */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(yyyymm) {
  if (!yyyymm) return '';
  const [year, month] = yyyymm.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1] || month} ${year}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '0.75rem 1rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontSize: '0.85rem',
    }}>
      <p style={{ fontWeight: 600, color: '#0f172a' }}>{formatMonth(label)}</p>
      <p style={{ color: '#059669' }}>
        {payload[0].value.toLocaleString()} kg CO₂e
      </p>
      {payload[0].payload.recordCount && (
        <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
          {payload[0].payload.recordCount} records
        </p>
      )}
    </div>
  );
};

function MonthlyTrends({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📈</div>
        <p>No monthly trend data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    month: item.month,
    totalEmissions: item.totalEmissions,
    recordCount: item.recordCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="totalEmissions"
          fill="url(#greenGradient)"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MonthlyTrends;
