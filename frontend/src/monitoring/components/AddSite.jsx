import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import TokenManager from './TokenManager';
import styles from '../styles/AddSite.module.css';
import '../styles/common.css';

const AddSite = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Récupérer le token de monitoring
      const tokenResponse = await api.get('/api/monitoring/token');
      const token = tokenResponse.data.token;

      // Ajouter le site
      await api.post('/api/monitoring/sites', {
        ...formData,
        monitoringToken: token
      });

      navigate('/monitoring/sites', { 
        state: { message: 'Site ajouté avec succès' }
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du site:', error);
      if (error.response?.data?.code === 'INVALID_MONITORING_TOKEN') {
        setError('Token de monitoring invalide. Veuillez générer un nouveau token.');
      } else {
        setError(error.response?.data?.message || 'Erreur lors de l\'ajout du site');
      }
      setLoading(false);
    }
  };

  return (
    <div className={styles.add_site_page}>
      <header className={styles.page_header}>
        <h1>Ajouter un Site</h1>
      </header>

      <div className={styles.add_site_container}>
        <TokenManager />
        <form onSubmit={handleSubmit} className={styles.add_site_form}>
          <div className={styles.form_group}>
            <h3 id="site_info">Informations du site</h3>
            <label htmlFor="name" className={styles.form_label}>Nom du site</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.form_input}
              required
              placeholder="Mon Site Web"
            />
          </div>

          <div className={styles.form_group}>
            <label htmlFor="url" className={styles.form_label}>URL du site</label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              className={styles.form_input}
              required
              placeholder="https://monsite.com"
            />
          </div>

          <div className={styles.form_group}>
            <label htmlFor="description" className={styles.form_label}>Description (optionnelle)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.form_input}
              rows="4"
              placeholder="Description de votre site..."
            />
          </div>

          {error && (
            <div className={styles.error_message}>
              {error}
            </div>
          )}

          <div className={styles.form_actions}>
            <button 
              type="button" 
              onClick={() => navigate('/monitoring/sites')}
              className="button button-danger"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="button button-primary"
              disabled={loading}
            >
              {loading ? 'Ajout en cours...' : 'Ajouter le site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSite; 