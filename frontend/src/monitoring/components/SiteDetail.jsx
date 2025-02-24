import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import styles from '../styles/SiteDetail.module.css';
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

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monitoringToken, setMonitoringToken] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [checkingScript, setCheckingScript] = useState(false);
  const [scriptStatus, setScriptStatus] = useState(null);
  const [emailNotifications, setEmailNotifications] = useState({
    enabled: false,
    addresses: []
  });
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [webhookNotifications, setWebhookNotifications] = useState({
    enabled: false,
    url: '',
    platform: 'discord'
  });
  const [webhookError, setWebhookError] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (id === 'new') {
      navigate('/monitoring/sites/new');
      return;
    }
    fetchSiteDetails();
    fetchMonitoringToken();
  }, [id, navigate]);

  useEffect(() => {
    if (site?.notifications?.email) {
      setEmailNotifications(site.notifications.email);
    }
    if (site?.notifications?.webhook) {
      setWebhookNotifications(site.notifications.webhook);
    }
  }, [site?._id]);

  const fetchSiteDetails = async () => {
    if (id === 'new') return;
    try {
      const response = await api.get(`/api/monitoring/sites/${id}`);
      if (response.data && !response.data.dailyStats) {
        response.data.dailyStats = [];
      }
      setSite(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du site:', error);
      setError(error.response?.data?.message || 'Erreur lors de la récupération des données');
      setLoading(false);
    }
  };

  const fetchMonitoringToken = async () => {
    if (id === 'new') return;
    try {
      const response = await api.get('/api/monitoring/token');
      setMonitoringToken(response.data.token);
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteError(null);
      await api.delete(`/api/monitoring/sites/${id}`, {
        params: { token: monitoringToken }
      });
      navigate('/monitoring/sites', { 
        state: { message: 'Site supprimé avec succès' }
      });
    } catch (error) {
      setDeleteError(
        error.response?.data?.message || 
        'Erreur lors de la suppression du site'
      );
      setShowDeleteConfirm(false);
    }
  };

  const handleCopy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(message);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      setCopySuccess('Erreur lors de la copie');
    }
  };

  const getTrackingScript = (siteId) => {
    return `<!-- Monitoring Script -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var TRACKING_CONFIG = {
      siteId: '${siteId}',
      endpoint: '${process.env.REACT_APP_API_URL}/api/monitoring/tracking'
    };

    // Lire le token depuis le fichier .well-known/monitoring-allowed
    fetch('/.well-known/monitoring-allowed')
      .then(response => response.text())
      .then(content => {
        const token = content.trim().split('=')[1];
        TRACKING_CONFIG.token = token;
        startTracking();
      })
      .catch(error => {
        console.error('Erreur lors de la lecture du token:', error);
      });

    function generateVisitorId() {
      if (!localStorage.getItem('visitorId')) {
        localStorage.setItem('visitorId', 
          Math.random().toString(36).substring(2) + Date.now().toString(36));
      }
      return localStorage.getItem('visitorId');
    }

    function getSessionId() {
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      return sessionId;
    }

    function trackPageView() {
      if (!TRACKING_CONFIG.token) {
        console.error('Token non disponible pour le tracking');
        return;
      }

      try {
        var img = new Image();
        img.style.position = 'absolute';
        img.style.width = '1px';
        img.style.height = '1px';
        img.style.visibility = 'hidden';
        
        var timestamp = new Date().getTime();
        var visitorId = generateVisitorId();
        var sessionId = getSessionId();
        var referrer = document.referrer || '';
        var path = window.location.pathname;
        
        var params = new URLSearchParams({
          t: timestamp,
          vid: visitorId,
          sid: sessionId,
          ref: referrer,
          p: path,
          visit: '1',
          token: TRACKING_CONFIG.token
        });

        var trackingUrl = TRACKING_CONFIG.endpoint + '/' + TRACKING_CONFIG.siteId + '?' + params.toString();
        console.log('Sending tracking request:', trackingUrl);
        
        img.src = trackingUrl;
        
        function cleanup() {
          if (img && img.parentNode) {
            img.parentNode.removeChild(img);
          }
        }
        
        img.onload = function() {
          console.log('Tracking request successful');
          cleanup();
        };
        
        img.onerror = function() {
          console.error('Tracking request failed');
          cleanup();
        };
        
        document.body.appendChild(img);
      } catch (error) {
        console.error('Erreur de tracking:', error);
      }
    }

    function startTracking() {
      trackPageView();

      if (typeof history !== 'undefined') {
        ['pushState', 'replaceState'].forEach(function(type) {
          var original = window.history[type];
          window.history[type] = function() {
            var result = original.apply(this, arguments);
            trackPageView();
            return result;
          };
        });

        window.addEventListener('popstate', trackPageView);
      }
    }
  });
</script>`;
  };

  const checkTrackingScript = async () => {
    try {
      setCheckingScript(true);
      setScriptStatus(null);
      
      const response = await api.get(`/api/monitoring/sites/${id}/check-tracking`);
      setScriptStatus({
        success: true,
        message: 'Le script de tracking est correctement installé'
      });
    } catch (error) {
      setScriptStatus({
        success: false,
        message: error.response?.data?.message || 'Le script de tracking n\'a pas été trouvé sur le site'
      });
    } finally {
      setCheckingScript(false);
    }
  };

  const handleEmailToggle = async () => {
    try {
      const updatedNotifications = {
        ...emailNotifications,
        enabled: !emailNotifications.enabled
      };

      const response = await api.put(`/api/monitoring/sites/${id}/notifications`, {
        email: updatedNotifications
      });

      if (response.data) {
        setEmailNotifications(updatedNotifications);
        setSite(response.data);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications:', error);
    }
  };

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleAddEmail = async () => {
    if (!validateEmail(newEmail)) {
      setEmailError('Email invalide');
      return;
    }

    if (emailNotifications.addresses.includes(newEmail)) {
      setEmailError('Cet email est déjà dans la liste');
      return;
    }

    try {
      const updatedNotifications = {
        ...emailNotifications,
        addresses: [...emailNotifications.addresses, newEmail]
      };

      const response = await api.put(`/api/monitoring/sites/${id}/notifications`, {
        email: updatedNotifications
      });

      if (response.data) {
        setEmailNotifications(updatedNotifications);
        setSite(response.data);
        setNewEmail('');
        setEmailError('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'email:', error);
      setEmailError('Erreur lors de l\'ajout de l\'email');
    }
  };

  const handleRemoveEmail = async (emailToRemove) => {
    try {
      const updatedNotifications = {
        ...emailNotifications,
        addresses: emailNotifications.addresses.filter(email => email !== emailToRemove)
      };

      const response = await api.put(`/api/monitoring/sites/${id}/notifications`, {
        email: updatedNotifications
      });

      if (response.data) {
        setEmailNotifications(updatedNotifications);
        setSite(response.data);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'email:', error);
    }
  };

  const handleWebhookToggle = async () => {
    try {
      const newWebhookState = {
        enabled: !webhookNotifications.enabled,
        url: webhookNotifications.url,
        platform: webhookNotifications.platform
      };

      await api.put(`/api/monitoring/sites/${id}/notifications/webhook`, newWebhookState);
      setWebhookNotifications(newWebhookState);
      setWebhookError('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications webhook:', error);
      setWebhookError(error.response?.data?.message || 'Erreur lors de la mise à jour des notifications webhook');
    }
  };

  const handleWebhookUrlChange = async (event) => {
    const url = event.target.value;
    setWebhookNotifications(prev => ({ ...prev, url }));

    try {
      if (url) {
        // Valider l'URL
        new URL(url);
        
        await api.put(`/api/monitoring/sites/${id}/notifications/webhook`, {
          enabled: webhookNotifications.enabled,
          url: url,
          platform: webhookNotifications.platform
        });
        setWebhookError('');
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setWebhookError('URL invalide');
      } else {
        console.error('Erreur lors de la mise à jour de l\'URL webhook:', error);
        setWebhookError(error.response?.data?.message || 'Erreur lors de la mise à jour de l\'URL webhook');
      }
    }
  };

  const handleWebhookPlatformChange = async (event) => {
    const platform = event.target.value;
    setWebhookNotifications(prev => ({ ...prev, platform }));

    try {
      await api.put(`/api/monitoring/sites/${id}/notifications/webhook`, {
        enabled: webhookNotifications.enabled,
        url: webhookNotifications.url,
        platform: platform
      });
      setWebhookError('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la plateforme webhook:', error);
      setWebhookError(error.response?.data?.message || 'Erreur lors de la mise à jour de la plateforme webhook');
    }
  };

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      await api.post(`/api/monitoring/sites/${id}/test-notification`, {
        type: 'email'
      });
      alert('Email de test envoyé avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de test:', error);
      alert('Erreur lors de l\'envoi de l\'email de test');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestingWebhook(true);
      await api.post(`/api/monitoring/sites/${id}/test-notification`, {
        type: 'webhook'
      });
      alert('Notification webhook de test envoyée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification webhook de test:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'envoi de la notification webhook de test');
    } finally {
      setTestingWebhook(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!site) {
    return <div className={styles.not_found}>Site non trouvé</div>;
  }

  const formatTimeData = (statusHistory, label, color) => {
    if (!statusHistory || statusHistory.length === 0) return {
      labels: [],
      datasets: [{
        label: label.label,
        data: [],
        fill: true,
        backgroundColor: `${color}20`,
        borderColor: color,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };

    // Calculer la période
    const now = new Date();
    const timeLimit = new Date(now);

    if (timeRange === '24h') {
      // On recule de 24h exactement à partir de maintenant
      timeLimit.setTime(now.getTime() - (24 * 60 * 60 * 1000));
    } else if (timeRange === '7d') {
      // Reculer de 7 jours à partir d'aujourd'hui
      timeLimit.setDate(now.getDate() - 7);
      timeLimit.setHours(0, 0, 0, 0); // Début de la journée
      now.setHours(23, 59, 59, 999); // Fin de la journée actuelle
    } else {
      // Reculer de 30 jours à partir d'aujourd'hui
      timeLimit.setDate(now.getDate() - 30);
      timeLimit.setHours(0, 0, 0, 0); // Début de la journée
      now.setHours(23, 59, 59, 999); // Fin de la journée actuelle
    }

    const recentHistory = statusHistory.filter(check => {
      const checkDate = new Date(check.timestamp);
      return checkDate >= timeLimit && checkDate <= now;
    });

    // Grouper par intervalles
    const intervals = {};

    // Initialiser tous les intervalles nécessaires
    if (timeRange !== '24h') {
      // Pour 7j et 30j, on initialise tous les jours
      let currentDate = new Date(timeLimit);
      while (currentDate <= now) {
        const timestamp = currentDate.getTime();
        intervals[timestamp] = {
          upCount: 0,
          totalResponseTime: 0,
          errorCount: 0,
          totalChecks: 0,
          visitors: 0
        };
        
        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Remplir les données
    recentHistory.forEach(check => {
      const checkDate = new Date(check.timestamp);
      
      if (timeRange === '24h') {
        checkDate.setMinutes(0, 0, 0);
      } else {
        checkDate.setHours(0, 0, 0, 0);
      }
      
      const interval = checkDate.getTime();
      
      if (!intervals[interval]) {
        intervals[interval] = {
          upCount: 0,
          totalResponseTime: 0,
          errorCount: 0,
          totalChecks: 0,
          visitors: 0
        };
      }
      
      intervals[interval].totalChecks++;
      if (check.status === 'up') {
        intervals[interval].upCount++;
        intervals[interval].totalResponseTime += check.responseTime;
        if (typeof check.visitors === 'number') {
          intervals[interval].visitors += check.visitors;
        } else if (check.visitors === '1' || check.visitors === true) {
          intervals[interval].visitors += 1;
        }
      } else {
        intervals[interval].errorCount++;
      }
    });

    // Convertir en tableaux pour le graphique
    const sortedIntervals = Object.entries(intervals)
      .sort(([a], [b]) => Number(a) - Number(b));
    const labels = sortedIntervals.map(([timestamp]) => {
      const date = new Date(Number(timestamp));
      if (timeRange === '24h') {
        return date.getHours().toString().padStart(2, '0') + ':00'; // Format "HH:00"
      } else if (timeRange === '7d') {
        return date.toLocaleDateString([], { day: '2-digit' });
      } else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      }
    });

    let data;
    switch(label.key) {
      case 'uptime':
        data = sortedIntervals.map(([, stats]) => 
          stats.totalChecks > 0 ? (stats.upCount / stats.totalChecks) * 100 : 0
        );
        break;
      case 'averageResponseTime':
        data = sortedIntervals.map(([, stats]) => 
          stats.upCount ? Math.round(stats.totalResponseTime / stats.upCount) : 0
        );
        break;
      case 'errorCount':
        data = sortedIntervals.map(([, stats]) => stats.errorCount);
        break;
      case 'visitors':
        data = sortedIntervals.map(([, stats]) => stats.visitors);
        break;
      default:
        data = [];
    }

    return {
      labels,
      datasets: [{
        label: label.label,
        data,
        fill: true,
        backgroundColor: `${color}20`,
        borderColor: color,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  };

  const responseTimeData = formatTimeData(site.statusHistory, {
    label: 'Temps de réponse moyen (ms)',
    key: 'averageResponseTime'
  }, 'rgb(75, 192, 192)');

  const uptimeData = formatTimeData(site.statusHistory, {
    label: 'Disponibilité (%)',
    key: 'uptime'
  }, 'rgb(54, 162, 235)');

  const errorData = formatTimeData(site.statusHistory, {
    label: 'Erreurs',
    key: 'errorCount'
  }, 'rgb(255, 99, 132)');

  const visitorData = formatTimeData(site.statusHistory, {
    label: 'Visiteurs',
    key: 'visitors'
  }, 'rgb(153, 102, 255)');

  // Mise à jour des options du graphique pour l'échelle de temps
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className={styles.site_detail}>
      <header className={styles.site_header}>
        <h1>{site.name}</h1>
        <div className={`status-badge ${styles.status_badge} ${site.status}`}>
          {site.status === 'up' ? 'En ligne' : site.status === 'down' ? 'Hors ligne' : 'En attente'}
        </div>
      </header>

      <div className={styles.site_info}>
        <div className={styles.info_card}>
          <h3>URL</h3>
          <p><a href={site.url} target="_blank" rel="noopener noreferrer">{site.url}</a></p>
        </div>
        <div className={styles.info_card}>
          <h3>Temps de réponse moyen</h3>
          <p>
            {site.statusHistory.length > 0 
              ? `${Math.round(
                  site.statusHistory
                    .slice(-10)
                    .filter(check => check.status === 'up')
                    .reduce((acc, check) => acc + check.responseTime, 0) / 
                  Math.min(10, site.statusHistory.filter(check => check.status === 'up').slice(-10).length)
                )} ms`
              : 'N/A'}
          </p>
        </div>
        <div className={styles.info_card}>
          <h3>Disponibilité</h3>
          <p>{site.uptime.toFixed(2)}%</p>
        </div>
        <div className={styles.info_card}>
          <h3>Dernier check</h3>
          <p>{new Date(site.lastCheck).toLocaleString()}</p>
        </div>
      </div>

      <div className={styles.charts_section}>
        <div className={styles.charts_header}>
          <h2>Statistiques</h2>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={styles.time_range_select}
          >
            <option value="24h">Dernières 24 heures</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
          </select>
        </div>

        <div className={styles.charts_grid}>
          <div className={styles.chart_container_site_detail}>
            {timeRange === '24h' ? (
              <h2>Temps de réponse (par heure)</h2>
            ) : timeRange === '7d' ? (
              <h2>Temps de réponse (sur 7 jours)</h2>
            ) : (
              <h2>Temps de réponse (sur 30 jours)</h2>
            )}
            {site.statusHistory?.length > 0 ? (
              <Line data={responseTimeData} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    title: {
                      display: true,
                      text: 'Millisecondes (ms)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: timeRange === '24h' ? 'Heures' : timeRange === '7d' ? 'Jours' : 'Mois'
                    }
                  }
                }
              }} />
            ) : (
              <p className={styles.no_data}>Aucune donnée disponible</p>
            )}
          </div>

          <div className={styles.chart_container_site_detail}>
            {timeRange === '24h' ? (
              <h2>Disponibilité (par heure)</h2>
            ) : timeRange === '7d' ? (
              <h2>Disponibilité (sur 7 jours)</h2>
            ) : (
              <h2>Disponibilité (sur 30 jours)</h2>
            )}
            {site.statusHistory?.length > 0 ? (
              <Line data={uptimeData} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    min: 0,
                    max: 100,
                    title: {
                      display: true,
                      text: 'Pourcentage (%)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: timeRange === '24h' ? 'Heures' : timeRange === '7d' ? 'Jours' : 'Mois'
                    }
                  }
                }
              }} />
            ) : (
              <p className={styles.no_data}>Aucune donnée disponible</p>
            )}
          </div>

          <div className={styles.chart_container_site_detail}>
            {timeRange === '24h' ? (
              <h2>Erreurs (par heure)</h2>
            ) : timeRange === '7d' ? (
              <h2>Erreurs (sur 7 jours)</h2>
            ) : (
              <h2>Erreurs (sur 30 jours)</h2>
            )}
            {site.statusHistory?.length > 0 ? (
              <Line data={errorData} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    title: {
                      display: true,
                      text: 'Nombre d\'erreurs'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: timeRange === '24h' ? 'Heures' : timeRange === '7d' ? 'Jours' : 'Mois'
                    }
                  }
                }
              }} />
            ) : (
              <p className={styles.no_data}>Aucune donnée disponible</p>
            )}
          </div>

          <div className={styles.chart_container_site_detail}>
            {timeRange === '24h' ? (
              <h2>Visiteurs (par heure)</h2>
            ) : timeRange === '7d' ? (
              <h2>Visiteurs (sur 7 jours)</h2>
            ) : (
              <h2>Visiteurs (sur 30 jours)</h2>
            )}
            {site.statusHistory?.length > 0 ? (
              <Line data={visitorData} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Nombre de visiteurs'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: timeRange === '24h' ? 'Heures' : timeRange === '7d' ? 'Jours' : 'Mois'
                    }
                  }
                }
              }} />
            ) : (
              <p className={styles.no_data}>Aucune donnée disponible</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.history_section}>
        <h2>Historique des événements</h2>
        <div className={styles.history_list}>
          {site.statusHistory.slice(-10).reverse().map((event, index) => (
            <div key={index} className={`${styles.history_item} ${event.status}`}>
              <div className={styles.event_time}>
                {new Date(event.timestamp).toLocaleString()}
              </div>
              <div className={styles.event_status}>
                {event.status === 'up' ? 'En ligne' : 'Hors ligne'}
              </div>
              <div className={styles.event_response}>
                {event.responseTime} ms
              </div>
              {event.error && (
                <div className={styles.event_error}>
                  {event.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.tracking_info_section}>
        <h2>Informations de Tracking</h2>
        <div className={styles.tracking_details}>
          <div className={styles.script_section}>
            <h3>Script de Tracking</h3>
            <div className={styles.code_block}>
              <pre>
                <code id="tracking-script">{getTrackingScript(site._id)}</code>
              </pre>
              <button 
                className={`button button-primary ${styles.copy_button}`}
                onClick={() => handleCopy(getTrackingScript(site._id), 'Script copié !')}
              >
                {copySuccess === 'Script copié !' ? 'Script copié !' : 'Copier le script'}
              </button>
            </div>
            <div className={styles.script_verification}>
              <button 
                className={`button button-primary ${styles.verify_button} ${checkingScript ? 'loading' : ''} ${scriptStatus?.success ? 'success' : scriptStatus?.success === false ? 'error' : ''}`}
                onClick={checkTrackingScript}
                disabled={checkingScript}
              >
                {checkingScript ? 'Vérification...' : 'Vérifier l\'installation du script'}
              </button>
              {scriptStatus && (
                <div className={`status-message ${scriptStatus.success ? 'success' : 'error'}`}>
                  {scriptStatus.message}
                </div>
              )}
            </div>
            <h3>ID du Site</h3>
            <div className={styles.code_block}>
              <code>{site._id}</code>
              <button 
                className={`button button-primary ${styles.copy_button}`}
                onClick={() => handleCopy(site._id, 'ID copié !')}
              >
                {copySuccess === 'ID copié !' ? 'ID copié !' : 'Copier l\'ID'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.notifications_section}>
        <h2>Notifications</h2>
        <div className={styles.notification_settings}>
          <div className={styles.notification_group}>
            <h3>Notifications par Email</h3>
            <div className={styles.email_toggle}>
              <label className={styles.toggle_switch}>
                <input
                  type="checkbox"
                  checked={emailNotifications.enabled}
                  onChange={handleEmailToggle}
                />
                <span className={styles.toggle_slider}></span>
              </label>
              <span>Activer les notifications par email</span>
            </div>

            {emailNotifications.enabled && (
              <div className={styles.email_management}>
                <div className={styles.email_input_group}>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Ajouter un email"
                    className={emailError ? styles.error : ''}
                  />
                  <button onClick={handleAddEmail}>
                    Ajouter
                  </button>
                </div>
                {emailError && (
                  <div className={styles.error_message}>
                    {emailError}
                  </div>
                )}

                <div className={styles.email_list}>
                  {emailNotifications.addresses.map((email, index) => (
                    <div key={index} className={styles.email_item}>
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className={styles.remove_button}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  className={styles.test_button}
                  onClick={handleTestEmail}
                  disabled={testingEmail || emailNotifications.addresses.length === 0}
                >
                  {testingEmail ? 'Envoi en cours...' : 'Tester les notifications email'}
                </button>
              </div>
            )}
          </div>

          <div className={styles.notification_group}>
            <h3>Webhook</h3>
            <div className={styles.webhook_section}>
              <div className={styles.webhook_toggle}>
                <label className={styles.toggle_switch}>
                  <input
                    type="checkbox"
                    checked={webhookNotifications.enabled}
                    onChange={handleWebhookToggle}
                  />
                  <span className={styles.toggle_slider}></span>
                </label>
                <span>Activer les notifications webhook</span>
              </div>

              <div className={styles.webhook_management}>
                <div className={styles.webhook_platform_select}>
                  <select
                    value={webhookNotifications.platform}
                    onChange={handleWebhookPlatformChange}
                    disabled={!webhookNotifications.enabled}
                  >
                    <option value="discord">Discord</option>
                    <option value="slack">Slack</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="google_chat">Google Chat</option>
                    <option value="generic">Webhook Générique (JSON)</option>
                  </select>
                </div>

                <div className={styles.webhook_input_group}>
                  <input
                    type="url"
                    value={webhookNotifications.url}
                    onChange={handleWebhookUrlChange}
                    placeholder={
                      webhookNotifications.platform === 'discord' ? "https://discord.com/api/webhooks/..." :
                      webhookNotifications.platform === 'slack' ? "https://hooks.slack.com/services/..." :
                      webhookNotifications.platform === 'teams' ? "https://outlook.office.com/webhook/..." :
                      webhookNotifications.platform === 'google_chat' ? "https://chat.googleapis.com/v1/spaces/..." :
                      "https://votre-serveur.com/webhook"
                    }
                    className={webhookError ? styles.error : ''}
                    disabled={!webhookNotifications.enabled}
                  />
                  {webhookError && <div className={styles.error_message}>{webhookError}</div>}
                </div>

                <button
                  onClick={handleTestWebhook}
                  disabled={!webhookNotifications.enabled || !webhookNotifications.url || testingWebhook}
                  className={styles.test_button}
                >
                  {testingWebhook ? 'Envoi en cours...' : 'Tester le webhook'}
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.delete_section}>
        <h3>Zone Dangereuse</h3>
        <p className={styles.warning_text}>
          La suppression d'un site est une action irréversible. 
          Toutes les données de monitoring seront définitivement perdues.
        </p>
        
        {deleteError && (
          <div className={styles.error_message}>
            {deleteError}
          </div>
        )}

        {!showDeleteConfirm ? (
          <button 
            className={`button button-danger ${styles.delete_button}`}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Supprimer ce site
          </button>
        ) : (
          <div className={styles.delete_confirm}>
            <p>Êtes-vous sûr de vouloir supprimer ce site ?</p>
            <div className={styles.delete_button_group}>
              <button 
                className="button button-danger"
                onClick={handleDelete}
              >
                Oui, supprimer
              </button>
              <button 
                className="button button-warning"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteDetail; 