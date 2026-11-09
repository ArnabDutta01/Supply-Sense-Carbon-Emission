import axios from 'axios';

/**
 * Axios-based API service layer for SupplySense
 * Centralizes all API calls with base URL and API key configuration
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach API key to every request if configured
api.interceptors.request.use((config) => {
  const apiKey = process.env.REACT_APP_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

// ─── Vendors ────────────────────────────────────────────────────
export const getVendors = (params) => api.get('/vendors', { params });
export const getVendor = (id) => api.get(`/vendors/${id}`);
export const createVendor = (data) => api.post('/vendors', data);
export const updateVendor = (id, data) => api.put(`/vendors/${id}`, data);
export const deleteVendor = (id) => api.delete(`/vendors/${id}`);
export const getVendorStats = () => api.get('/vendors/stats/overview');

// ─── Shipments ──────────────────────────────────────────────────
export const getShipments = (params) => api.get('/shipments', { params });
export const getShipment = (id) => api.get(`/shipments/${id}`);
export const createShipment = (data) => api.post('/shipments', data);
export const getShipmentAnalytics = () => api.get('/shipments/analytics/overview');

// ─── Emissions ──────────────────────────────────────────────────
export const getEmissions = (params) => api.get('/emissions', { params });
export const getEmission = (id) => api.get(`/emissions/${id}`);
export const createEmission = (data) => api.post('/emissions', data);
export const getEmissionDashboard = () => api.get('/emissions/dashboard/overview');

export default api;
