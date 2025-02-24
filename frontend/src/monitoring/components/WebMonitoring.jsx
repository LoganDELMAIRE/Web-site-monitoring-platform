import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import styles from '../styles/WebMonitoring.module.css';
import '../styles/common.css';

const WebMonitoring = () => {
  const [sites, setSites] = useState([]);
  const [newSite, setNewSite] = useState({ url: '', name: '' });
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
  };

  const addSite = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/monitoring/sites', newSite);
      setNewSite({ url: '', name: '' });
      fetchSites();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du site:', error);
    }
  };

  return (
    <div className={styles.monitoring_container}>
      <h1>Monitoring des Sites Web</h1>
      
      <div className={styles.add_site_form}>
        <h2>Ajouter un nouveau site</h2>
        <form onSubmit={addSite}>
          <input
            type="text"
            placeholder="Nom du site"
            value={newSite.name}
            onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
            required
          />
          <input
            type="url"
            placeholder="URL du site"
            value={newSite.url}
            onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
            required
          />
          <button type="submit">Ajouter</button>
        </form>
      </div>

      <div className={styles.sites_grid}>
        {loading ? (
          <p className={styles.info_message}>Chargement...</p>
        ) : sites.length === 0 ? (
          <p className={styles.info_message}>Aucun site enregistré. Ajoutez votre premier site à surveiller !</p>
        ) : (
          sites.map((site) => (
            <div key={site._id} className={styles.site_card}>
              <h3>{site.name}</h3>
              <p>URL: {site.url}</p>
              <div className={styles.status_info}>
                <div className={`${styles.status_indicator} ${site.status}`}>
                  {site.status === 'up' ? 'En ligne' : 'Hors ligne'}
                </div>
                <p>Temps de réponse: {site.responseTime}ms</p>
                <p>Dernier check: {new Date(site.lastCheck).toLocaleString()}</p>
              </div>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <h4>Trafic</h4>
                  <p>{site.traffic || '0'} visiteurs/h</p>
                </div>
                <div className={styles.metric}>
                  <h4>Disponibilité</h4>
                  <p>{site.uptime || '100'}%</p>
                </div>
              </div>
              <button onClick={() => window.open(`/monitoring/logs/${site._id}`, '_blank')}>
                Voir les logs
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WebMonitoring; 