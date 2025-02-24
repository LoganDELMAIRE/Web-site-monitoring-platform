import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  retry: 3,
  retryDelay: 1000,
});

// Intercepteur pour les requêtes
axiosInstance.interceptors.request.use(
  (config) => {
    // Ajout d'un timestamp pour éviter le cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Gestion des erreurs réseau
    if (error.code === 'ERR_NETWORK') {
      if (!originalRequest._retry && originalRequest.retry > 0) {
        originalRequest._retry = true;
        originalRequest.retry--;
        
        // Attente progressive avant la nouvelle tentative
        const delay = (3 - originalRequest.retry) * originalRequest.retryDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return axiosInstance(originalRequest);
      }
      throw {
        ...error,
        message: 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet et réessayer.'
      };
    }

    // Si l'erreur est un timeout
    if (error.code === 'ECONNABORTED' && originalRequest.retry > 0) {
      originalRequest.retry--;
      await new Promise(resolve => setTimeout(resolve, originalRequest.retryDelay));
      return axiosInstance(originalRequest);
    }

    // Si l'erreur est une erreur d'authentification (401)
    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true;
      
    //   // Ne pas rediriger si on est déjà sur une route protégée
    //   const currentPath = window.location.pathname;
    //   if (!currentPath.startsWith('/monitoring')) {
    //     window.location.href = '/login';
    //   }
    //   return Promise.reject(error);
    // }

    return Promise.reject(error);
  }
);

export default axiosInstance; 