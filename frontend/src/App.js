import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import VendorList from './components/VendorList';
import ShipmentList from './components/ShipmentList';
import EmissionList from './components/EmissionList';

/**
 * SupplySense – Main Application Shell
 * Sidebar navigation with React Router for page-level routing
 */
function App() {
  return (
    <Router>
      <div className="app">
        {/* ─── Sidebar Navigation ─── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>
              <span className="logo-icon">🌍</span>
              <span className="logo-text">SupplySense</span>
            </h1>
            <p>Carbon Emission Tracker</p>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/vendors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🏭</span>
              <span>Vendors</span>
            </NavLink>
            <NavLink to="/shipments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🚚</span>
              <span>Shipments</span>
            </NavLink>
            <NavLink to="/emissions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">💨</span>
              <span>Emissions</span>
            </NavLink>
          </nav>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendors" element={<VendorList />} />
            <Route path="/shipments" element={<ShipmentList />} />
            <Route path="/emissions" element={<EmissionList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
