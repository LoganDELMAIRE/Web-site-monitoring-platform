import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../styles/Dashboard.module.css';
import '../styles/common.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MonitoringDashboard = () => {
  const [sites, setSites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [criticalSites, setCriticalSites] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // Rafraîchissement toutes les 5 minutes
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const sitesResponse = await api.get('/api/monitoring/sites');
      setSites(sitesResponse.data);

      const statsResponse = await api.get(`/api/monitoring/stats?timeRange=${timeRange}`);
      setStats(statsResponse.data);

      try {
        const alertsResponse = await api.get('/api/monitoring/alerts/recent');
        setAlerts(alertsResponse.data);
      } catch (alertError) {
        console.error('Erreur lors de la récupération des alertes:', alertError);
        setAlerts([]);
      }

      // Modifier la logique des sites critiques
      const critical = sitesResponse.data.filter(site => {
        const lastCheckTime = new Date(site.lastCheck).getTime();
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000); // 5 minutes en millisecondes
        
        return (
          (site.status === 'down' && lastCheckTime > fiveMinutesAgo) || // Site down dans les 5 dernières minutes
          (site.uptime < 95 && lastCheckTime > fiveMinutesAgo) || // Uptime faible récent
          (site.responseTime > 2000 && lastCheckTime > fiveMinutesAgo) // Temps de réponse élevé récent
        );
      });
      
      setCriticalSites(critical);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Erreur lors de la récupération des données');
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await api.post(`/api/monitoring/alerts/${alertId}/acknowledge`);
      setAlerts(alerts.filter(alert => alert._id !== alertId));
    } catch (error) {
      console.error('Erreur lors de la confirmation de l\'alerte:', error);
    }
  };

  const formatDailyStats = (dailyStats) => {
    if (!dailyStats || dailyStats.length === 0) return {
      labels: [],
      datasets: []
    };

    const labels = dailyStats.map(stat => 
      new Date(stat.date).toLocaleDateString('frFR', { 
        day: 'numeric',
        month: 'short'
      })
    );

    return {
      labels,
      datasets: [
        {
          label: 'Disponibilité moyenne (%)',
          data: dailyStats.map(stat => stat.uptime),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4
        },
        {
          label: 'Temps de réponse moyen (ms)',
          data: dailyStats.map(stat => stat.averageResponseTime),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          yAxisID: 'responseTime'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Disponibilité (%)'
        }
      },
      responseTime: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        title: {
          display: true,
          text: 'Temps de réponse (ms)'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  if (loading) {
    return <div className="loading-state">Chargement...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboard_header}>
        <div className={styles.header_main}>
          <h1>Dashboard</h1>
        </div>
        <div className={styles.header_actions}>
          {sites.length > 0 && (
            <Link to="/monitoring/sites/new" className="button button-secondary">
              Ajouter un Site
            </Link>
          )}
        </div>
      </header>

      <div className={styles.dashboard_grid}>
        <div className={`${styles.dashboard_column} ${styles.main_stats}`}>
          <div className={styles.stat_cards}>
            <div className={`${styles.stat_card} ${styles.totalsites}`}>
              <h3>Sites Surveillés</h3>
              <div className={styles.stat_value}>{stats?.totalSites || 0}</div>
            </div>
            <div className={`${styles.stat_card} ${styles.sites_up}`}>
              <h3>Sites En Ligne</h3>
              <div className={styles.stat_value}>{stats?.sitesUp || 0}</div>
            </div>
            <div className={`${styles.stat_card} ${styles.sites_down}`}>
              <h3>Sites Hors Ligne</h3>
              <div className={styles.stat_value}>{stats?.sitesDown || 0}</div>
            </div>
            <div className={`${styles.stat_card} ${styles.response_time}`}>
              <h3>Temps de Réponse Moyen</h3>
              <div className={styles.stat_value}>
                {sites.length > 0 
                  ? `${Math.round(sites.reduce((acc, site) => acc + site.responseTime, 0) / sites.length)} ms`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {criticalSites.length > 0 && (
            <div className={styles.critical_sites}>
              <h2>Sites Critiques</h2>
              <div className={styles.critical_sites_list}>
                {criticalSites.map(site => (
                  <Link to={`/monitoring/sites/${site._id}`} key={site._id} className={styles.critical_site_card}>
                    <div className={styles.site_info}>
                      <div className="status-indicator">
                        <div className={`status-badge ${site.status}`}></div>
                        <h3>{site.name}</h3>
                      </div>
                      <div className={styles.site_metrics}>
                        <span className={styles.metric}>
                          Disponibilité: {site.uptime?.toFixed(2)}%
                        </span>
                        <span className={styles.metric}>
                          Temps de réponse: {site.responseTime} ms
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className={styles.alerts_section}>  
            <h2>Alertes Récentes</h2>
            {alerts.length > 0 ? (
            <div className={styles.alerts_list}>
              {alerts.map(alert => (
                <div key={alert._id} className={`${styles.alert_item} ${styles[alert.severity]}`}>
                  <div className={styles.alert_content}>
                    <span className={styles.alerttime}>{new Date(alert.timestamp).toLocaleString()}</span>
                    <strong>{alert.siteName}</strong>: {alert.message}
                  </div>
                  <button 
                    onClick={() => acknowledgeAlert(alert._id)}
                    className={styles.acknowledgebtn}
                  >
                    Acquitter
                  </button>
                </div>
              ))}
            </div>
            ) : (
            <div className={styles.alerts_list}>
              <div className={styles.alert_item}>
                <div className={styles.alert_content}>
                  <span className={styles.alerttime}>Aucune alerte récente</span>
                </div>
              </div>
            </div> 
            )}
          </div>
        </div>

        <div className={`${styles.dashboard_column} ${styles.site_status}`}>
          <h2>État des Sites</h2>
          <div className={styles.sites_list}>
            {sites.map(site => (
              <Link to={`/monitoring/sites/${site._id}`} key={site._id} className={styles.site_status_card}>
                <div className={styles.site_info}>
                  <div className="status-indicator">
                    <div className={`status-badge ${site.status}`}></div>
                    <h3>{site.name}</h3>
                  </div>
                  <p className={styles.site_url}>{site.url}</p>
                  <div className={styles.site_metrics}>
                    <div className={styles.metric}>
                      <span className={styles.label}>Disponibilité</span>
                      <span className={styles.value}>{site.uptime?.toFixed(2)}%</span>
                    </div>
                    <div className={styles.metric}>
                      <span className={styles.label}>Temps de réponse</span>
                      <span className={styles.value}>{site.responseTime} ms</span>
                    </div>
                    <div className={styles.metric}>
                      <span className={styles.label}>Dernier check</span>
                      <span className={styles.value}>{new Date(site.lastCheck).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {sites.length === 0 && (
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
      )}
    </div>
  );
};

export default MonitoringDashboard; 