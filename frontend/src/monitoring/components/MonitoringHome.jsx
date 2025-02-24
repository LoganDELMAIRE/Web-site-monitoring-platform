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
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import styles from '../styles/MonitoringHome.module.css';
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

const MonitoringHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/monitoring/stats');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      setError('Erreur lors de la récupération des statistiques');
      setLoading(false);
    }
  };

  const formatDailyStats = (dailyStats) => {
    if (!dailyStats || dailyStats.length === 0) return {
      labels: [],
      datasets: []
    };

    const labels = dailyStats.map(stat => 
      new Date(stat.date).toLocaleDateString('fr-FR', { 
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
    return <div className={styles.monitoring_home}>Chargement...</div>;
  }

  if (error) {
    return <div className={styles.monitoring_home}>{error}</div>;
  }

  return (
    <div className={styles.monitoring_home}>
      <header className={styles.monitoring_header}>
        <h1>Monitoring de Sites Web</h1>
        <p>Surveillez la disponibilité et les performances de vos sites web en temps réel</p>
      </header>

      <div className={styles.quick_stats}>
        <div className={`${styles.stat_card} ${styles.total_sites}`}>
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
        <div className={styles.stat_card}>
          <h3>Disponibilité Moyenne</h3>
          <div className={styles.stat_value}>
            {stats?.averageUptime ? `${stats.averageUptime.toFixed(2)}%` : '0%'}
          </div>
        </div>
      </div>

      <div className={styles.monitoring_features}>
        <div className={styles.feature_card}>
          <div className={styles.feature_icon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" color="var(--primary-color)" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
          </svg>
          </div>
          <h3>Surveillance Continue</h3>
          <p>Vérification automatique de vos sites toutes les 5 minutes</p>
        </div>
        <div className={styles.feature_card}>
          <div className={styles.feature_icon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" color="var(--primary-color)" fill="currentColor" class="bi bi-bar-chart-fill" viewBox="0 0 16 16">
            <path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"/>
          </svg>
          </div>
          <h3>Statistiques Détaillées</h3>
          <p>Suivi des temps de réponse et de la disponibilité</p>
        </div>
        <div className={styles.feature_card}>
          <div className={styles.feature_icon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" color="var(--primary-color)" fill="currentColor" class="bi bi-bell-fill" viewBox="0 0 16 16">
            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/>
          </svg>
          </div>
          <h3>Notifications</h3>
          <p>Alertes par email et webhooks en cas de problème</p>
        </div>
        <div className={styles.feature_card}>
          <div className={styles.feature_icon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" color="var(--primary-color)" fill="currentColor" class="bi bi-people-fill" viewBox="0 0 16 16">
            <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
          </svg>
          </div>
          <h3>Suivi des Visiteurs</h3>
          <p>Statistiques de fréquentation en temps réel</p>
        </div>
      </div>

      {stats?.dailyStats && stats.dailyStats.length > 0 && (
        <div className={styles.stats_chart}>
          <h2>Statistiques des 30 derniers jours</h2>
          <div className={styles.chart_container}>
            <Line 
              data={formatDailyStats(stats.dailyStats)} 
              options={chartOptions}
            />
          </div>
        </div>
      )}

      <div className={styles.cta_section}>
        <Link to="/monitoring/sites" className="button button-primary">
          Voir Mes Sites
        </Link>
        <Link to="/monitoring/sites/new" className="button button-secondary">
          Ajouter un Site
        </Link>
      </div>
    </div>
  );
};

export default MonitoringHome; 