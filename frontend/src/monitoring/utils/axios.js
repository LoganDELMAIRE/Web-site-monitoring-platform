import axios from 'axios';

const BASE_URL = 'https://api.monitoring.logandelmairedev.com';

// Routes qui ne nécessitent pas de token
const PUBLIC_ROUTES = [
  '/api/monitoring/auth/check-admin',
  '/api/monitoring/auth/login',
  '/api/monitoring/auth/register'
];

// Instance Axios pour toutes les routes monitoring
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Ajouter le token aux requêtes authentifiées
api.interceptors.request.use((config) => {
  const isPublicRoute = PUBLIC_ROUTES.some(route => config.url?.includes(route));
  
  if (!isPublicRoute) {
    const token = localStorage.getItem('monitoringAuthToken');
    
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    } else {
      window.location.href = '/monitoring/login';
      return Promise.reject('Token manquant');
    }
  }

  // Ajouter un timestamp pour éviter le cache
  const separator = config.url.includes('?') ? '&' : '?';
  config.url = `${config.url}${separator}_t=${Date.now()}`;

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur pour gérer les réponses et les erreurs
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Vérifier si l'erreur vient d'une route d'ajout de site
      if (error.config.url.includes('/api/monitoring/sites')) {
        return Promise.reject(error);
      }
      
      // Pour les autres routes, déconnecter l'utilisateur
      const token = localStorage.getItem('monitoringAuthToken');
      if (token) {
        localStorage.removeItem('monitoringAuthToken');
        window.location.href = '/monitoring/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 