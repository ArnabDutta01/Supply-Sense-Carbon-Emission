import React, { useState, useEffect } from 'react';
import { getEmissionDashboard, getVendorStats, getShipmentAnalytics } from '../services/api';
import ScopeBreakdown from './ScopeBreakdown';
import MonthlyTrends from './MonthlyTrends';
import TransportAnalysis from './TransportAnalysis';
import VendorLeaderboard from './VendorLeaderboard';

/**
 * Dashboard – Main analytics overview page
 * Fetches data from all three analytics endpoints and displays
 * summary cards + 4 chart components
 */
function Dashboard() {
  const [emissionData, setEmissionData] = useState(null);
  const [vendorStats, setVendorStats] = useState(null);
  const [shipmentData, setShipmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const [emRes, vendorRes, shipRes] = await Promise.all([
          getEmissionDashboard(),
          getVendorStats(),
          getShipmentAnalytics(),
        ]);
        setEmissionData(emRes.data.data);
        setVendorStats(vendorRes.data.data);
        setShipmentData(shipRes.data.data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <>
        <header className="main-header"><h2>📊 Dashboard</h2></header>
        <div className="page-content">
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading dashboard data…</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <header className="main-header"><h2>📊 Dashboard</h2></header>
        <div className="page-content">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  const totalEmissions = emissionData?.summary?.totalEmissionsKgCO2e ?? 0;
  const totalVendors = vendorStats?.totalVendors ?? 0;
  const totalShipments = shipmentData?.totalShipments ?? 0;
  const avgScore = vendorStats?.avgSustainabilityScore ?? 0;

  return (
    <>
      <header className="main-header"><h2>📊 Dashboard</h2></header>
      <div className="page-content">
        {/* ─── Summary Cards ─── */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-icon">💨</div>
            <div className="card-info">
              <h4>Total Emissions</h4>
              <div className="card-value">{totalEmissions.toLocaleString()}</div>
              <div className="card-sub">kg CO₂e</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">🏭</div>
            <div className="card-info">
              <h4>Total Vendors</h4>
              <div className="card-value">{totalVendors}</div>
              <div className="card-sub">across all tiers</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">🚚</div>
            <div className="card-info">
              <h4>Total Shipments</h4>
              <div className="card-value">{totalShipments}</div>
              <div className="card-sub">{(shipmentData?.totalCarbon ?? 0).toLocaleString()} kg CO₂e</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">🌱</div>
            <div className="card-info">
              <h4>Avg Sustainability</h4>
              <div className="card-value">{avgScore}</div>
              <div className="card-sub">out of 100</div>
            </div>
          </div>
        </div>

        {/* ─── Charts ─── */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>🔵 Scope Breakdown</h3>
            <ScopeBreakdown data={emissionData?.scopeBreakdown} />
          </div>
          <div className="chart-card">
            <h3>📈 Monthly Emission Trends</h3>
            <MonthlyTrends data={emissionData?.monthlyTrends} />
          </div>
          <div className="chart-card">
            <h3>🚛 Transport Mode Analysis</h3>
            <TransportAnalysis data={shipmentData?.transportModeBreakdown} />
          </div>
          <div className="chart-card">
            <h3>🏆 Top Emitting Vendors</h3>
            <VendorLeaderboard data={emissionData?.topVendors} />
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
