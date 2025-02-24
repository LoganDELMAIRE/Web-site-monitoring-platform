import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import styles from '../styles/SiteList.module.css';  
import '../styles/common.css';

const SiteList = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await api.get('/api/monitoring/sites');
      setSites(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
      setError('Erreur lors de la récupération des sites');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading_state}>Chargement...</div>;
  }

  if (error) {
    return <div className={styles.error_state}>{error}</div>;
  }

  return (
    <div className={styles.site_list_container}>
      <header className={styles.list_header}>
        <h1>Mes Sites</h1>
        {sites.length > 0 && (
          <Link to="/monitoring/sites/new" className="button button-secondary">
            Ajouter un Site
          </Link>
        )}
      </header>

      {sites.length === 0 ? (
        <div className={styles.no_sites}>
            <div className={styles.empty_state}>
            <div className={styles.empty_icon}>🔍</div>
            <h3>Aucun site surveillé</h3>
            <p>Commencez par ajouter un site pour le surveiller</p>
            <Link to="/monitoring/sites/new" className="button button-secondary">
              Ajouter un Site
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.sites_grid}>
          {sites.map(site => (
            <Link to={`/monitoring/sites/${site._id}`} key={site._id} className={styles.site_card}>
              <div className={styles.site_info}>
                <div className="status-indicator">
                  <div className={`status-badge ${site.status}`}></div>
                  <h3 className={styles.card_header}>{site.name}</h3>
                </div>
                <p className={styles.site_url}>{site.url}</p>
                <div className={styles.site_metrics}>
                  <div className={styles.metric}>
                    <span className={styles.metric_label}>Disponibilité</span>
                    <span className={styles.metric_value}>{site.uptime?.toFixed(2)}%</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metric_label}>Temps de réponse</span>
                    <span className={styles.metric_value}>{site.responseTime || 0} ms</span>
                  </div>
                </div>
                <div className={styles.last_check}>
                  Dernière vérification: {new Date(site.lastCheck).toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteList; 