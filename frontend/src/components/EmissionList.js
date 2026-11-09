import React, { useState, useEffect } from 'react';
import { getEmissions } from '../services/api';

/**
 * EmissionList – Emission records table with scope badges,
 * verification status, data quality, filters, and pagination
 */

function EmissionList() {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scope, setScope] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');

  const scopes = ['Scope 1', 'Scope 2', 'Scope 3'];
  const verificationStatuses = ['Pending', 'Verified', 'Rejected'];

  useEffect(() => {
    async function fetchEmissions() {
      try {
        setLoading(true);
        const params = { page, limit: 10 };
        if (scope) params.scope = scope;
        if (verificationStatus) params.verificationStatus = verificationStatus;
        const res = await getEmissions(params);
        setEmissions(res.data.data);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        setError(err.message || 'Failed to load emissions');
      } finally {
        setLoading(false);
      }
    }
    fetchEmissions();
  }, [page, scope, verificationStatus]);

  useEffect(() => { setPage(1); }, [scope, verificationStatus]);

  const scopeBadgeClass = (s) => {
    const map = { 'Scope 1': 'badge-scope1', 'Scope 2': 'badge-scope2', 'Scope 3': 'badge-scope3' };
    return `badge ${map[s] || ''}`;
  };

  const verBadgeClass = (v) => {
    const map = { Pending: 'badge-pending', Verified: 'badge-verified', Rejected: 'badge-rejected' };
    return `badge ${map[v] || 'badge-pending'}`;
  };

  const qualBadgeClass = (q) => {
    const map = { Measured: 'badge-measured', Calculated: 'badge-calculated', Estimated: 'badge-estimated' };
    return `badge ${map[q] || ''}`;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <>
      <header className="main-header"><h2>💨 Emissions</h2></header>
      <div className="page-content">
        <div className="filters-bar">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">All Scopes</option>
            {scopes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value)}>
            <option value="">All Verification Status</option>
            {verificationStatuses.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading emissions…</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        ) : emissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💨</div>
            <p>No emission records found</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Scope</th>
                    <th>Category</th>
                    <th>Amount (kg CO₂e)</th>
                    <th>Verification</th>
                    <th>Data Quality</th>
                    <th>Reporting Period</th>
                  </tr>
                </thead>
                <tbody>
                  {emissions.map((e) => (
                    <tr key={e._id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {e.vendor?.name || '—'}
                      </td>
                      <td>
                        <span className={scopeBadgeClass(e.scope)}>{e.scope}</span>
                      </td>
                      <td>{e.category}</td>
                      <td style={{ fontWeight: 600, color: '#059669' }}>
                        {e.amount?.toLocaleString()}
                      </td>
                      <td>
                        <span className={verBadgeClass(e.verificationStatus)}>
                          {e.verificationStatus}
                        </span>
                      </td>
                      <td>
                        <span className={qualBadgeClass(e.dataQuality)}>
                          {e.dataQuality}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatDate(e.reportingPeriod?.startDate)} – {formatDate(e.reportingPeriod?.endDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

export default EmissionList;
