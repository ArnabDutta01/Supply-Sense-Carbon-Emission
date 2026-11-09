import React, { useState, useEffect } from 'react';
import { getShipments } from '../services/api';

/**
 * ShipmentList – Shipment table with transport mode emojis, status badges,
 * filters, and pagination
 */

const MODE_EMOJI = {
  Air: '✈️',
  Road: '🚛',
  Rail: '🚂',
  Sea: '🚢',
  Multimodal: '🔄',
};

function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [transportMode, setTransportMode] = useState('');
  const [status, setStatus] = useState('');

  const transportModes = ['Road', 'Rail', 'Sea', 'Air', 'Multimodal'];
  const statuses = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];

  useEffect(() => {
    async function fetchShipments() {
      try {
        setLoading(true);
        const params = { page, limit: 10 };
        if (transportMode) params.transportMode = transportMode;
        if (status) params.status = status;
        const res = await getShipments(params);
        setShipments(res.data.data);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        setError(err.message || 'Failed to load shipments');
      } finally {
        setLoading(false);
      }
    }
    fetchShipments();
  }, [page, transportMode, status]);

  useEffect(() => { setPage(1); }, [transportMode, status]);

  const statusBadgeClass = (s) => {
    const map = {
      Pending: 'badge-pending',
      'In Transit': 'badge-in-transit',
      Delivered: 'badge-delivered',
      Cancelled: 'badge-cancelled',
    };
    return `badge ${map[s] || 'badge-pending'}`;
  };

  return (
    <>
      <header className="main-header"><h2>🚚 Shipments</h2></header>
      <div className="page-content">
        <div className="filters-bar">
          <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
            <option value="">All Transport Modes</option>
            {transportModes.map((m) => (
              <option key={m} value={m}>{MODE_EMOJI[m]} {m}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading shipments…</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <p>No shipments found</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Shipment ID</th>
                    <th>Vendor</th>
                    <th>Route</th>
                    <th>Mode</th>
                    <th>Distance (km)</th>
                    <th>Weight (kg)</th>
                    <th>Carbon (kg CO₂e)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {s.shipmentId}
                      </td>
                      <td>{s.vendor?.name || '—'}</td>
                      <td>
                        {s.origin?.city}, {s.origin?.country} → {s.destination?.city}, {s.destination?.country}
                      </td>
                      <td>
                        <span style={{ fontSize: '1.1rem', marginRight: '0.3rem' }}>
                          {MODE_EMOJI[s.transportMode] || '📦'}
                        </span>
                        {s.transportMode}
                      </td>
                      <td>{s.distance?.toLocaleString()}</td>
                      <td>{s.weight?.toLocaleString()}</td>
                      <td style={{ fontWeight: 600, color: '#059669' }}>
                        {s.carbonEmission?.toFixed(2)}
                      </td>
                      <td>
                        <span className={statusBadgeClass(s.status)}>{s.status}</span>
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

export default ShipmentList;
