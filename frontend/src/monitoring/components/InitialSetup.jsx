import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonitoringAuth } from '../contexts/AuthContext';
import styles from '../styles/Auth.module.css';
import '../styles/common.css';

const InitialSetup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, hasAdmin } = useMonitoringAuth();

  useEffect(() => {

    // Rediriger vers le dashboard s'il y a déjà un admin
    if (hasAdmin === true) {
      navigate('/monitoring/dashboard');
    }
  }, [hasAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    try {
      await register(email, password);
      navigate('/monitoring/dashboard');
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Une erreur est survenue lors de la création du compte'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.auth_container}>
      <div className={styles.auth_form_container}>
        <h2>Configuration Initiale du Monitoring</h2>
        <p className={styles.setup_info}>
          Bienvenue dans la configuration initiale du système de monitoring.
          Veuillez créer votre compte administrateur principal.
        </p>
        <form onSubmit={handleSubmit} className={styles.auth_form}>
          <div className={styles.form_group}>
            <label htmlFor="email">Email de l'administrateur</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@votre-domaine.com"
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
              placeholder="Choisissez un mot de passe sécurisé"
              minLength="8"
            />
          </div>

          <div className={styles.form_group}>
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirmez votre mot de passe"
              minLength="8"
            />
          </div>

          {error && <div className={styles.error_message}>{error}</div>}

          <button 
            type="submit" 
            className={styles.submit_button}
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer le compte administrateur'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitialSetup; 