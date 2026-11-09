import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * ScopeBreakdown – Pie chart showing Scope 1 / 2 / 3 emission distribution
 * Custom colors: Scope 1 = red, Scope 2 = amber, Scope 3 = blue
 */

const SCOPE_COLORS = {
  'Scope 1': '#ef4444',
  'Scope 2': '#f59e0b',
  'Scope 3': '#3b82f6',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const { scope, totalEmissions, recordCount } = payload[0].payload;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '0.75rem 1rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontSize: '0.85rem',
    }}>
      <p style={{ fontWeight: 600, color: SCOPE_COLORS[scope] || '#333' }}>{scope}</p>
      <p style={{ color: '#475569' }}>{totalEmissions.toLocaleString()} kg CO₂e</p>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{recordCount} records</p>
    </div>
  );
};

function ScopeBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔵</div>
        <p>No scope data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    scope: item.scope,
    totalEmissions: item.totalEmissions,
    recordCount: item.recordCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          dataKey="totalEmissions"
          nameKey="scope"
          paddingAngle={2}
          label={({ scope, percent }) => `${scope} (${(percent * 100).toFixed(1)}%)`}
          labelLine={true}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={SCOPE_COLORS[entry.scope] || '#6b7280'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          formatter={(value) => <span style={{ color: '#475569', fontSize: '0.8rem' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default ScopeBreakdown;
