import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

/**
 * TransportAnalysis – Horizontal bar chart showing emissions by transport mode
 * Each mode gets a distinct color, shows total carbon and shipment count
 */

const MODE_COLORS = {
  Air: '#ef4444',
  Road: '#f59e0b',
  Multimodal: '#8b5cf6',
  Rail: '#3b82f6',
  Sea: '#10b981',
};

const MODE_EMOJIS = {
  Air: '✈️',
  Road: '🚛',
  Rail: '🚂',
  Sea: '🚢',
  Multimodal: '🔄',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '0.75rem 1rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontSize: '0.85rem',
    }}>
      <p style={{ fontWeight: 600, color: '#0f172a' }}>
        {MODE_EMOJIS[d.transportMode] || ''} {d.transportMode}
      </p>
      <p style={{ color: '#059669' }}>{d.totalCarbon.toLocaleString()} kg CO₂e</p>
      <p style={{ color: '#64748b' }}>{d.shipmentCount} shipments</p>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
        Avg: {d.avgCarbon.toLocaleString()} kg CO₂e
      </p>
    </div>
  );
};

function TransportAnalysis({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚛</div>
        <p>No transport data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    transportMode: item.transportMode,
    totalCarbon: item.totalCarbon,
    shipmentCount: item.shipmentCount,
    avgCarbon: item.avgCarbon,
    label: `${MODE_EMOJIS[item.transportMode] || ''} ${item.transportMode}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: '#475569' }}
          axisLine={{ stroke: '#e5e7eb' }}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="totalCarbon" radius={[0, 4, 4, 0]} maxBarSize={30}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={MODE_COLORS[entry.transportMode] || '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TransportAnalysis;
