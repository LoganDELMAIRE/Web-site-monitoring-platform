import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonitoringAuth } from '../contexts/AuthContext';
import styles from '../styles/Auth.module.css';
import '../styles/common.css';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, hasAdmin } = useMonitoringAuth();

  useEffect(() => {
    // Rediriger vers la configuration initiale s'il n'y a pas d'admin
    if (hasAdmin === false) {
      navigate('/monitoring/setup');
    }
  }, [hasAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/monitoring/dashboard');
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Une erreur est survenue lors de la connexion'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.auth_container}>
      <div className={styles.auth_form_container}>
        <h2>Connexion Monitoring</h2>
        <p className={styles.setup_info}>
          Connectez-vous au module de monitoring pour gérer vos sites.
        </p>
        <form onSubmit={handleSubmit} className={styles.auth_form}>
          <div className={styles.form_group}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
            />
          </div>

          <div className={styles.form_group}>
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Votre mot de passe"
            />
          </div>

          {error && <div className={styles.error_message}>{error}</div>}

          <button 
            type="submit" 
            className={styles.submit_button}
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm; 