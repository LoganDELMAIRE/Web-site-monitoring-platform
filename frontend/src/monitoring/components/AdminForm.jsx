import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonitoringAuth } from '../contexts/AuthContext';
import styles from '../styles/Auth.module.css';
import '../styles/common.css';
const AdminForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useMonitoringAuth();

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
      await register(email, password, adminKey);
      navigate('/monitoring/dashboard');
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Une erreur est survenue lors de l\'inscription'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.auth_container}>
      <div className={styles.auth_form_container}>
        <h2>Création Compte Admin Monitoring</h2>
        <p className={styles.setup_info}>
          Pour créer un compte administrateur supplémentaire, vous devez fournir la clé d'administration.
          Cette clé est différente du mot de passe et sert à protéger la création de nouveaux comptes admin.
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

          <div className={styles.form_group}>
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirmez votre mot de passe"
            />
          </div>

          <div className={styles.form_group}>
            <label htmlFor="adminKey">
              Clé d'administration
              <span className={styles.input_help}>
                Cette clé est requise pour créer des comptes admin supplémentaires
              </span>
            </label>
            <input
              type="password"
              id="adminKey"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              required
              placeholder="Clé d'administration"
            />
          </div>

          {error && <div className={styles.error_message}>{error}</div>}

          <button 
            type="submit" 
            className={styles.submit_button}
            disabled={isLoading}
          >
            {isLoading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminForm; 