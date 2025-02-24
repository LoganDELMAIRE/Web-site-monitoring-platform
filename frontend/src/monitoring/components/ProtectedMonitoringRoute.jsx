import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMonitoringAuth } from '../contexts/AuthContext';

const ProtectedMonitoringRoute = ({ children }) => {
  const { token: monitoringToken, hasAdmin } = useMonitoringAuth();

  // Si on n'a pas encore vérifié s'il y a un admin
  if (hasAdmin === null) {
    return <div>Chargement...</div>;
  }

  // S'il n'y a pas d'admin, rediriger vers la configuration initiale
  if (hasAdmin === false) {
    return <Navigate to="/monitoring/setup" />;
  }

  // Si pas de token monitoring, rediriger vers la page de connexion monitoring
  if (!monitoringToken) {
    return <Navigate to="/monitoring/login" />;
  }

  return children;
};

export default ProtectedMonitoringRoute; 