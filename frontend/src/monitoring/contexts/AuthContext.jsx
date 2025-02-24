import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';

const MonitoringAuthContext = createContext(null);

export const MonitoringAuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('monitoringAuthToken'));
  const [hasAdmin, setHasAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Vérification de l'existence d'un admin
  const checkAdmin = async () => {
    try {
      const response = await api.get('/api/monitoring/auth/check-admin');
      setHasAdmin(response.data.hasAdmin);
    } catch (error) {
      setHasAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier le token au chargement et périodiquement
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('monitoringAuthToken');
      if (storedToken) {
        try {
          const response = await api.get('/api/monitoring/auth/me');
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          localStorage.removeItem('monitoringAuthToken');
          setToken(null);
          setUser(null);
          window.location.href = '/monitoring/login';
        }
      } else {
        setToken(null);
        setUser(null);
      }
      checkAdmin();
    };

    verifyToken();

    // Vérifier le token toutes les minutes
    const interval = setInterval(verifyToken, 60000);

    return () => clearInterval(interval);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/monitoring/auth/login', {
        email,
        password,
      });
      
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('monitoringAuthToken', newToken);
      setToken(newToken);
      setUser(userData);
      
      // Vérifier immédiatement que le token fonctionne
      await api.get('/api/monitoring/auth/me');
      
      return response.data;
    } catch (error) {
      localStorage.removeItem('monitoringAuthToken');
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const register = async (email, password) => {
    try {
      const response = await api.post('/api/monitoring/auth/register', {
        email,
        password,
        isFirstAdmin: !hasAdmin
      });
      
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('monitoringAuthToken', newToken);
      setToken(newToken);
      setUser(userData);
      setHasAdmin(true);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('monitoringAuthToken');
    setToken(null);
    setUser(null);
    window.location.href = '/monitoring/login';
  };

  const value = {
    token,
    user,
    hasAdmin,
    isLoading,
    login,
    register,
    logout,
    api
  };

  return (
    <MonitoringAuthContext.Provider value={value}>
      {children}
    </MonitoringAuthContext.Provider>
  );
};

export const useMonitoringAuth = () => {
  const context = useContext(MonitoringAuthContext);
  if (!context) {
    throw new Error('useMonitoringAuth must be used within a MonitoringAuthProvider');
  }
  return context;
};

export default MonitoringAuthProvider; 