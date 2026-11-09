import React from 'react';

/**
 * VendorLeaderboard – Top 10 vendors ranked by total emissions
 * Shows rank, vendor name, emissions, risk level badge, and record count
 */

const RISK_COLORS = {
  Low: { bg: '#dcfce7', color: '#166534' },
  Medium: { bg: '#fef9c3', color: '#854d0e' },
  High: { bg: '#ffedd5', color: '#9a3412' },
  Critical: { bg: '#fee2e2', color: '#991b1b' },
};

function VendorLeaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏆</div>
        <p>No vendor emission data available</p>
      </div>
    );
  }

  return (
    <ul className="leaderboard-list">
      {data.map((vendor, index) => {
        const riskStyle = RISK_COLORS[vendor.riskLevel] || RISK_COLORS.Medium;
        return (
          <li key={vendor._id || index} className="leaderboard-item">
            <div className={`leaderboard-rank ${index < 3 ? 'top-3' : ''}`}>
              {index + 1}
            </div>
            <div className="leaderboard-info">
              <div className="vendor-name">{vendor.vendorName || 'Unknown Vendor'}</div>
              <div className="vendor-meta">
                {vendor.industry || ''} • {vendor.tier || ''}
                <span
                  className="badge"
                  style={{
                    background: riskStyle.bg,
                    color: riskStyle.color,
                    marginLeft: '0.5rem',
                  }}
                >
                  {vendor.riskLevel || 'N/A'}
                </span>
              </div>
            </div>
            <div className="leaderboard-value">
              <div className="emission-value">
                {(vendor.totalEmissions || 0).toLocaleString()}
              </div>
              <div className="record-count">{vendor.records || 0} records</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default VendorLeaderboard;
