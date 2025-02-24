import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import SiteList from './monitoring/components/SiteList';
import SiteDetail from './monitoring/components/SiteDetail';
import TokenManager from './monitoring/components/TokenManager';
import MonitoringDashboard from './monitoring/components/Dashboard';
import MonitoringLoginForm from './monitoring/components/LoginForm';
import MonitoringAdminForm from './monitoring/components/AdminForm';
import InitialSetup from './monitoring/components/InitialSetup';
import { MonitoringAuthProvider } from './monitoring/contexts/AuthContext';
import ProtectedMonitoringRoute from './monitoring/components/ProtectedMonitoringRoute';
import HomeMonitoring from './monitoring/components/MonitoringHome';
import AddSite from './monitoring/components/AddSite';
import Navbar from './components/navbar';

function AppContent() {
  return (
    <div className="App">
      <main className='main-content'>
        <Routes>
          <Route path="/" element={<Navigate to="/monitoring/home" replace />} />
          <Route path="/monitoring/*" element={
            <MonitoringAuthProvider>
              <Routes>
                <Route path="login" element={<MonitoringLoginForm />} />
                <Route path="register" element={<MonitoringAdminForm />} />
                <Route path="setup" element={<InitialSetup />} />
                <Route path="dashboard" element={
                  <ProtectedMonitoringRoute>
                    <Navbar />
                    <MonitoringDashboard />
                  </ProtectedMonitoringRoute>
                } />
                <Route path="home" element={
                  <ProtectedMonitoringRoute>
                    <Navbar />
                    <HomeMonitoring />
                  </ProtectedMonitoringRoute>
                } />
                <Route path="sites/new" element={
                  <ProtectedMonitoringRoute>
                    <Navbar />
                    <AddSite />
                  </ProtectedMonitoringRoute>
                } />
                <Route path="sites" element={
                  <ProtectedMonitoringRoute>
                    <Navbar />
                    <SiteList />
                  </ProtectedMonitoringRoute>
                } />
                <Route path="sites/:id" element={
                  <ProtectedMonitoringRoute>
                    <Navbar />
                    <SiteDetail />
                  </ProtectedMonitoringRoute>
                } />
                <Route path="tokens" element={
                  <ProtectedMonitoringRoute>
                    <Navbar />
                    <TokenManager />
                  </ProtectedMonitoringRoute>
                } />
              </Routes>
            </MonitoringAuthProvider>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
