import React, { useState, useEffect } from 'react';
import { getVendors } from '../services/api';

/**
 * VendorList – Full vendor table with search, filters, and pagination
 * Shows sustainability score as a colored progress bar
 */

function getScoreColor(score) {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#f97316';
  return '#ef4444';
}

function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [tier, setTier] = useState('');
  const [riskLevel, setRiskLevel] = useState('');

  const industries = [
    'Manufacturing', 'Logistics', 'Technology', 'Agriculture',
    'Energy', 'Retail', 'Construction', 'Textile', 'Chemical', 'Automotive',
  ];
  const tiers = ['Tier 1', 'Tier 2', 'Tier 3'];
  const riskLevels = ['Low', 'Medium', 'High', 'Critical'];

  useEffect(() => {
    async function fetchVendors() {
      try {
        setLoading(true);
        const params = { page, limit: 10 };
        if (search) params.search = search;
        if (industry) params.industry = industry;
        if (tier) params.tier = tier;
        if (riskLevel) params.riskLevel = riskLevel;
        const res = await getVendors(params);
        setVendors(res.data.data);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        setError(err.message || 'Failed to load vendors');
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, [page, search, industry, tier, riskLevel]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, industry, tier, riskLevel]);

  const riskBadgeClass = (level) => {
    const map = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical' };
    return `badge ${map[level] || 'badge-medium'}`;
  };

  return (
    <>
      <header className="main-header"><h2>🏭 Vendors</h2></header>
      <div className="page-content">
        {/* ─── Filters ─── */}
        <div className="filters-bar">
          <input
            type="text"
            placeholder="🔍 Search vendors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">All Industries</option>
            {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">All Tiers</option>
            {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
            <option value="">All Risk Levels</option>
            {riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* ─── Content ─── */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading vendors…</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏭</div>
            <p>No vendors found</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Tier</th>
                    <th>Sustainability Score</th>
                    <th>Risk Level</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{v.name}</td>
                      <td>{v.industry}</td>
                      <td>{v.tier}</td>
                      <td>
                        <div className="progress-bar-container">
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${v.sustainabilityScore || 0}%`,
                                background: getScoreColor(v.sustainabilityScore),
                              }}
                            />
                          </div>
                          <span className="progress-bar-value">{v.sustainabilityScore}</span>
                        </div>
                      </td>
                      <td>
                        <span className={riskBadgeClass(v.riskLevel)}>{v.riskLevel}</span>
                      </td>
                      <td>{v.location?.country || '—'}{v.location?.region ? `, ${v.location.region}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination ─── */}
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default VendorList;
