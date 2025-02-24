const express = require('express');
const router = express.Router();
const trackingRouter = express.Router(); // Nouveau routeur pour le tracking
const axios = require('axios');
const logger = require('../../utils/logger');
const { getModel } = require('../config/db');
const validateSite = require('../middleware/siteAuth');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { 
  sendDownNotification, 
  sendUpNotification, 
  sendHighResponseTimeNotification,
  sendTestNotification
} = require('../utils/emailNotifier');
const {
  sendDownWebhook,
  sendUpWebhook,
  sendHighResponseTimeWebhook,
  sendTestWebhook
} = require('../utils/webhookNotifier');

const Site = require('../models/site');
const Alert = require('../models/Alert');
const { checkSite } = require('../utils/monitoring');

// Fonction de nettoyage automatique des statistiques
async function cleanupOldStats() {
  try {
    logger.info('Début du nettoyage automatique des anciennes statistiques');
    
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    
    const Site = getModel('Site');
    const sites = await Site.find({});
    let totalStatsRemoved = 0;
    
    for (const site of sites) {
      const originalLength = site.dailyStats.length;
      site.dailyStats = site.dailyStats.filter(stat => 
        new Date(stat.date) > thirtyOneDaysAgo
      );
      totalStatsRemoved += originalLength - site.dailyStats.length;
      await site.save();
    }
    
    logger.info(`Nettoyage automatique terminé. ${totalStatsRemoved} statistiques supprimées`);
  } catch (error) {
    logger.error('Erreur lors du nettoyage automatique des statistiques:', error);
  }
}

// Planifier le nettoyage automatique pour s'exécuter tous les jours à 00:00
function scheduleStatsCleanup() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // demain
    0, // 00 heures
    0, // 00 minutes
    0  // 00 secondes
  );
  
  const timeUntilMidnight = night.getTime() - now.getTime();
  
  // Première exécution à minuit
  setTimeout(() => {
    cleanupOldStats();
    // Ensuite, exécuter tous les jours
    setInterval(cleanupOldStats, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
  
  logger.info(`Nettoyage automatique des statistiques programmé. Première exécution dans ${Math.floor(timeUntilMidnight / 1000 / 60)} minutes`);
}

// Démarrer la planification du nettoyage
scheduleStatsCleanup();

// Middleware pour vérifier la connexion à la base de données
const checkDBConnection = (req, res, next) => {
  try {
    const Site = getModel('Site');
    const MonitoringToken = getModel('MonitoringToken');
    req.Site = Site;
    req.MonitoringToken = MonitoringToken;
    next();
  } catch (error) {
    logger.error('Database connection error:', error);
    res.status(500).json({ message: 'Erreur de connexion à la base de données' });
  }
};

// Route de tracking sur un routeur séparé
trackingRouter.get('/:siteId', checkDBConnection, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { token, visit } = req.query;

    // Vérifier le site
    const site = await req.Site.findById(siteId);

    if (!site) {
      return res.status(404).send('Site non trouvé');
    }

    // Vérifier le token avec le fichier .well-known/monitoring-allowed
    try {
      const response = await axios.get(`${site.url}/.well-known/monitoring-allowed`);
      const content = response.data;
      const fileToken = content.trim().split('MONITOR_TOKEN=')[1];

      if (!fileToken || token !== fileToken) {
        logger.error('Token invalide:', { 
          receivedToken: token, 
          fileToken: fileToken,
          siteUrl: site.url 
        });
        return res.status(401).send('Token invalide');
      }

      // Mettre à jour les statistiques de visite
      site.statusHistory.push({
        timestamp: new Date(),
        status: 'up',
        responseTime: 0,
        visitors: 1
      });

      await site.save();

      // Renvoyer un pixel transparent 1x1
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error) {
      logger.error('Erreur lors de la vérification du token:', error);
      res.status(401).send('Erreur de vérification du token');
    }
  } catch (error) {
    logger.error('Erreur de tracking:', error);
    res.status(500).send('Erreur interne');
  }
});

// Utiliser le routeur de tracking avant l'authentification
router.use('/tracking', trackingRouter);

// Appliquer l'authentification pour toutes les autres routes
router.use(auth);
router.use(checkDBConnection);

// Route pour récupérer le token de monitoring
router.get('/token', auth, async (req, res) => {
  try {
    const MonitoringToken = getModel('MonitoringToken');
    
    const token = await MonitoringToken.findOne({ 
      userId: req.userId,
      isActive: true 
    });

    if (!token) {
      return res.status(404).json({ message: 'Aucun token actif trouvé' });
    }

    res.json({ token: token.token });
  } catch (error) {
    logger.error('Erreur lors de la récupération du token');
    res.status(500).json({ message: 'Erreur lors de la récupération du token' });
  }
});

// Route pour générer un nouveau token
router.post('/token/generate', auth, async (req, res) => {
  try {
    const MonitoringToken = getModel('MonitoringToken');
    
    // Désactiver tous les tokens existants
    await MonitoringToken.updateMany(
      { userId: req.userId },
      { isActive: false }
    );

    // Créer un nouveau token
    const newToken = new MonitoringToken({
      userId: req.userId,
      token: crypto.randomBytes(32).toString('hex'),
      isActive: true
    });
    await newToken.save();

    res.json({ token: newToken.token });
  } catch (error) {
    logger.error('Erreur lors de la génération du token');
    res.status(500).json({ message: 'Erreur lors de la génération du token' });
  }
});

// Récupérer tous les sites
router.get('/sites', async (req, res) => {
  try {
    logger.info('Récupération de la liste des sites');
    const sites = await getModel('Site').find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-statusHistory')
      .lean()
      .exec();
    
    logger.info(`${sites.length} sites trouvés`);
    res.json(sites);
  } catch (error) {
    logger.error('Erreur lors de la récupération des sites:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des sites',
      error: error.message 
    });
  }
});

// Récupérer un site spécifique
router.get('/sites/:id', async (req, res) => {
  try {
    logger.info(`Récupération du site avec l'ID: ${req.params.id}`);
    const site = await req.Site.findById(req.params.id).exec();
    
    if (!site) {
      logger.warn(`Site non trouvé avec l'ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Site non trouvé' });
    }
    
    logger.info(`Site trouvé: ${site.name}`);
    res.json(site);
  } catch (error) {
    logger.error('Erreur lors de la récupération du site:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du site',
      error: error.message 
    });
  }
});

// Ajouter un nouveau site
router.post('/sites', auth, checkDBConnection, async (req, res) => {
  try {
    const { name, url, description, monitoringToken } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ message: 'Le nom et l\'URL sont requis' });
    }

    // Vérifier que le token de monitoring correspond à celui de l'utilisateur
    const MonitoringToken = getModel('MonitoringToken');
    const validToken = await MonitoringToken.findOne({
      userId: req.userId,
      token: monitoringToken,
      isActive: true
    });

    if (!validToken) {
      return res.status(401).json({ 
        message: 'Token de monitoring invalide',
        code: 'INVALID_MONITORING_TOKEN'
      });
    }

    const site = new (getModel('Site'))({
      name,
      url,
      description,
      userId: req.userId,
      status: 'pending',
      lastCheck: new Date(),
      monitoringToken,
      notifications: {
        email: {
          enabled: false,
          addresses: []
        },
        webhook: {
          enabled: false,
          url: '',
          platform: 'discord'
        }
      }
    });

    const newSite = await site.save();
    logger.info(`Nouveau site ajouté: ${name} (${url})`);
    res.status(201).json(newSite);
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du site:', error);
    res.status(400).json({ message: error.message });
  }
});

// Vérifier le statut d'un site
async function checkSiteStatus(site) {
  const startTime = Date.now();
  try {
    const response = await axios.get(site.url, { 
      timeout: 10000,
      validateStatus: false,
      headers: {
        'User-Agent': 'MonitoringBot/1.0'
      }
    });
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.status >= 200 && response.status < 400 ? 'up' : 'down',
      responseTime,
      statusCode: response.status
    };
  } catch (error) {
    logger.error(`Erreur lors de la vérification du site ${site.url}:`, error.message);
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

// Mettre à jour le statut d'un site
router.put('/sites/:id/status', async (req, res) => {
  try {
    const site = await req.Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }

    const previousStatus = site.status;
    const lastDownTime = site.statusHistory.findLast(stat => stat.status === 'down')?.timestamp;
    
    const status = await checkSiteStatus(site);
    site.status = status.status;
    site.responseTime = status.responseTime;
    site.lastCheck = new Date();
    site.statusHistory.push({
      timestamp: new Date(),
      status: status.status,
      responseTime: status.responseTime,
      statusCode: status.statusCode,
      error: status.error
    });

    // Limiter l'historique à 1000 entrées
    if (site.statusHistory.length > 1000) {
      site.statusHistory = site.statusHistory.slice(-1000);
    }

    // Gérer les notifications
    if (status.status === 'down' && previousStatus === 'up') {
      // Le site vient de tomber
      await sendDownNotification(site, status.error);
    } else if (status.status === 'up' && previousStatus === 'down') {
      // Le site vient de se rétablir
      const downtime = lastDownTime ? 
        Math.round((new Date() - new Date(lastDownTime)) / 1000 / 60) : 0;
      await sendUpNotification(site, downtime);
    } else if (status.status === 'up' && status.responseTime > 5000) {
      // Temps de réponse anormalement élevé (> 5s)
      await sendHighResponseTimeNotification(site, status.responseTime);
    }

    // Mettre à jour les statistiques
    site.uptime = site.calculateUptime();
    site.averageResponseTime = site.calculateAverageResponseTime();
    site.updateDailyStats();
    
    const updatedSite = await site.save();
    logger.info(`Statut mis à jour pour ${site.name}: ${status.status}`);
    res.json(updatedSite);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: error.message });
  }
});

// Récupérer les logs d'un site
router.get('/sites/:id/logs', async (req, res) => {
  try {
    const site = await req.Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }
    res.json(site.statusHistory);
  } catch (error) {
    logger.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Récupérer les statistiques globales
router.get('/stats', auth, checkDBConnection, async (req, res) => {
  try {
    logger.info(`Récupération des statistiques pour l'utilisateur: ${req.userId}`);
    logger.info('Headers de la requête:', req.headers);
    
    const sites = await req.Site.find({ userId: req.userId });
    
    const stats = {
      totalSites: sites.length,
      sitesUp: sites.filter(site => site.status === 'up').length,
      sitesDown: sites.filter(site => site.status === 'down').length,
      averageUptime: 0,
      totalErrors: 0,
      dailyStats: []
    };

    // Calculer les statistiques moyennes
    if (sites.length > 0) {
      stats.averageUptime = sites.reduce((sum, site) => sum + site.uptime, 0) / sites.length;
      stats.totalErrors = sites.reduce((sum, site) => sum + (site.totalErrors || 0), 0);

      // Calculer les statistiques quotidiennes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // Créer un tableau de dates pour les 30 derniers jours
      const dates = [];
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      // Calculer les statistiques pour chaque jour
      stats.dailyStats = dates.map(date => {
        const dailyStats = {
          date,
          uptime: 0,
          averageResponseTime: 0,
          errorCount: 0,
          totalChecks: 0
        };

        sites.forEach(site => {
          const siteDailyStat = site.dailyStats.find(stat => 
            new Date(stat.date).toDateString() === date.toDateString()
          );

          if (siteDailyStat) {
            dailyStats.uptime += siteDailyStat.uptime;
            dailyStats.averageResponseTime += siteDailyStat.averageResponseTime;
            dailyStats.errorCount += siteDailyStat.errorCount;
            dailyStats.totalChecks += siteDailyStat.totalChecks;
          }
        });

        // Calculer les moyennes
        if (sites.length > 0) {
          dailyStats.uptime /= sites.length;
          dailyStats.averageResponseTime /= sites.length;
        }

        return dailyStats;
      });
    }

    logger.info(`Statistiques calculées pour ${sites.length} sites`);
    res.json(stats);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message 
    });
  }
});

// Route pour supprimer un site
router.delete('/sites/:id', auth, checkDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    // Vérifier que le token est valide
    const MonitoringToken = getModel('MonitoringToken');
    const validToken = await MonitoringToken.findOne({
      userId: req.userId,
      token: token,
      isActive: true
    });

    if (!validToken) {
      return res.status(401).json({ 
        message: 'Token de monitoring invalide',
        code: 'INVALID_MONITORING_TOKEN'
      });
    }

    // Trouver et supprimer le site
    const site = await req.Site.findOneAndDelete({ 
      _id: id,
      userId: req.userId 
    });

    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }

    // Supprimer également les alertes associées
    await Alert.deleteMany({ site: id });

    logger.info(`Site supprimé avec succès: ${site.url}`);
    res.json({ message: 'Site supprimé avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la suppression du site:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du site' });
  }
});

// Route pour nettoyer les anciennes statistiques quotidiennes
router.delete('/cleanup-stats', auth, checkDBConnection, async (req, res) => {
  try {
    logger.info('Début du nettoyage des anciennes statistiques');
    
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    
    const sites = await req.Site.find({ userId: req.userId });
    let totalStatsRemoved = 0;
    
    for (const site of sites) {
      const originalLength = site.dailyStats.length;
      site.dailyStats = site.dailyStats.filter(stat => 
        new Date(stat.date) > thirtyOneDaysAgo
      );
      totalStatsRemoved += originalLength - site.dailyStats.length;
      await site.save();
    }
    
    logger.info(`Nettoyage terminé. ${totalStatsRemoved} statistiques supprimées`);
    res.json({ 
      message: 'Nettoyage effectué avec succès',
      statsRemoved: totalStatsRemoved
    });
  } catch (error) {
    logger.error('Erreur lors du nettoyage des statistiques:', error);
    res.status(500).json({ 
      message: 'Erreur lors du nettoyage des statistiques',
      error: error.message 
    });
  }
});

// Route pour mettre à jour les notifications d'un site
router.put('/sites/:id/notifications', auth, checkDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, webhook } = req.body;

    const site = await req.Site.findById(id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }

    // Initialiser l'objet notifications s'il n'existe pas
    if (!site.notifications) {
      site.notifications = {};
    }

    // Mettre à jour les notifications email
    if (email) {
      site.notifications.email = {
        enabled: email.enabled,
        addresses: email.addresses || []
      };
    }

    // Mettre à jour les notifications webhook
    if (webhook) {
      site.notifications.webhook = {
        enabled: webhook.enabled,
        url: webhook.url || '',
        platform: webhook.platform || site.notifications?.webhook?.platform || 'discord'
      };
    }

    await site.save();
    logger.info(`Notifications mises à jour pour le site ${site.name}`);
    res.json(site);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour des notifications' });
  }
});

// Route pour tester les notifications
router.post('/sites/:id/test-notification', auth, checkDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const site = await req.Site.findById(id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }

    if (type === 'email') {
      if (!site.notifications?.email?.enabled) {
        return res.status(400).json({ message: 'Les notifications par email ne sont pas activées' });
      }
      // Tester la notification email
      await sendTestNotification(site, 'Ceci est un test de notification');
    } else if (type === 'webhook') {
      if (!site.notifications?.webhook?.enabled) {
        return res.status(400).json({ message: 'Les notifications webhook ne sont pas activées' });
      }
      if (!site.notifications?.webhook?.url) {
        return res.status(400).json({ message: 'Aucune URL de webhook configurée' });
      }

      // S'assurer que la plateforme est définie
      if (!site.notifications.webhook.platform) {
        site.notifications.webhook.platform = 'discord';
        await site.save();
      }

      logger.info('Test webhook avec la configuration:', {
        platform: site.notifications.webhook.platform,
        url: site.notifications.webhook.url
      });

      // Tester la notification webhook
      try {
        await sendTestWebhook(site, 'Ceci est un test de notification');
      } catch (webhookError) {
        logger.error('Erreur détaillée du webhook:', {
          error: webhookError.message,
          response: webhookError.response?.data,
          platform: site.notifications.webhook.platform,
          url: site.notifications.webhook.url
        });
        return res.status(400).json({ 
          message: 'Erreur lors de l\'envoi du webhook',
          details: webhookError.response?.data?.message || webhookError.message,
          platform: site.notifications.webhook.platform
        });
      }
    }

    res.json({ message: 'Test de notification envoyé avec succès' });
  } catch (error) {
    logger.error('Erreur lors du test de notification:', error);
    res.status(500).json({ 
      message: 'Erreur lors du test de notification',
      details: error.message
    });
  }
});

// Route pour mettre à jour les notifications webhook
router.put('/sites/:id/notifications/webhook', async (req, res) => {
  try {
    const { enabled, url, platform } = req.body;
    
    const site = await req.Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }

    // Vérifier que l'utilisateur est propriétaire du site
    if (site.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Mettre à jour les notifications webhook
    site.notifications.webhook = {
      enabled: enabled,
      url: url,
      platform: platform || 'discord' // Par défaut Discord si non spécifié
    };

    await site.save();
    
    res.json({ message: 'Notifications webhook mises à jour avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des notifications webhook:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour des notifications webhook',
      error: error.message 
    });
  }
});

// Route pour récupérer les alertes récentes
router.get('/alerts/recent', auth, async (req, res) => {
  try {
    const Alert = getModel('Alert');
    const alerts = await Alert.getRecentAlerts(req.userId);

    // Filtrer les alertes qui n'ont pas de site associé (site peut être null après le populate)
    const validAlerts = alerts.filter(alert => alert.site);

    const formattedAlerts = validAlerts.map(alert => ({
      _id: alert._id,
      siteName: alert.site.name,
      message: alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp
    }));

    res.json(formattedAlerts);
  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des alertes',
      error: process.env.DEBUG_MODE === 'true' ? error.message : undefined
    });
  }
});

// Route pour acquitter une alerte
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.alertId,
      { acknowledged: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json({ message: 'Alerte acquittée avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'acquittement de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de l\'acquittement de l\'alerte' });
  }
});

// Route pour vérifier le script de tracking
router.get('/sites/:id/check-tracking', auth, async (req, res) => {
  try {
    const site = await req.Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé' });
    }

    logger.info(`Vérification du script pour le site: ${site.url}`);

    // 1. Vérifier le fichier .well-known/monitoring-allowed
    let wellKnownResponse;
    try {
      const wellKnownUrl = `${site.url}/.well-known/monitoring-allowed`;
      logger.info(`Tentative d'accès au fichier well-known: ${wellKnownUrl}`);
      
      wellKnownResponse = await axios.get(wellKnownUrl, {
        timeout: 5000,
        validateStatus: false
      });

      logger.info(`Réponse well-known status: ${wellKnownResponse.status}`);
      
      if (wellKnownResponse.status !== 200) {
        return res.status(400).json({ 
          message: `Le fichier .well-known/monitoring-allowed n'est pas accessible (status: ${wellKnownResponse.status})`
        });
      }

      const fileContent = wellKnownResponse.data;
      logger.info(`Contenu du fichier well-known: ${fileContent}`);
      
      if (!fileContent.includes('MONITOR_TOKEN=')) {
        return res.status(400).json({ 
          message: 'Le fichier .well-known/monitoring-allowed ne contient pas de token valide'
        });
      }

      const fileToken = fileContent.trim().split('MONITOR_TOKEN=')[1];
      logger.info(`Token trouvé: ${fileToken ? fileToken.substring(0, 10) : 'non défini'}...`);

      if (!site.monitoringToken) {
        logger.info('Mise à jour du token de monitoring pour le site');
        site.monitoringToken = fileToken;
        await site.save();
      }

      logger.info(`Token attendu: ${site.monitoringToken.substring(0, 10)}...`);

      if (fileToken !== site.monitoringToken) {
        return res.status(400).json({ 
          message: 'Le token dans le fichier .well-known/monitoring-allowed ne correspond pas au token du site'
        });
      }

    } catch (error) {
      logger.error('Erreur lors de la vérification du fichier well-known:', {
        error: error.message,
        url: site.url
      });
      return res.status(400).json({ 
        message: 'Le fichier .well-known/monitoring-allowed n\'est pas accessible',
        details: error.message
      });
    }

    // 2. Vérifier la présence du script sur la page
    try {
      logger.info(`Tentative d'accès à la page: ${site.url}`);
      const pageResponse = await axios.get(site.url, {
        timeout: 5000,
        validateStatus: false
      });

      logger.info(`Réponse page status: ${pageResponse.status}`);

      if (pageResponse.status !== 200) {
        return res.status(400).json({ 
          message: `La page n'est pas accessible (status: ${pageResponse.status})`
        });
      }

      const pageContent = pageResponse.data;

      const siteIdPattern = new RegExp(`siteId:\\s*['"]${site._id}['"]`);
      if (!siteIdPattern.test(pageContent)) {
        logger.info(`ID du site non trouvé. Attendu: ${site._id}`);
        return res.status(400).json({ 
          message: 'L\'ID du site dans le script de tracking ne correspond pas à l\'ID attendu'
        });
      }

      const endpointPattern = /endpoint:\s*['"][^'"]*\/api\/monitoring\/tracking['"]/;
      if (!endpointPattern.test(pageContent)) {
        logger.info('Endpoint de tracking non trouvé ou incorrect');
        return res.status(400).json({ 
          message: 'L\'endpoint de tracking n\'est pas correctement configuré dans le script'
        });
      }

    } catch (error) {
      logger.error('Erreur lors de la vérification de la page:', {
        error: error.message,
        url: site.url
      });
      return res.status(400).json({ 
        message: 'Impossible d\'accéder à la page pour vérifier le script',
        details: error.message
      });
    }

    logger.info('Vérification du script réussie');
    res.json({ 
      message: 'Le script de tracking est correctement installé',
      details: {
        wellKnownFile: true,
        trackingScript: true,
        tokenMatch: true,
        siteIdMatch: true,
        endpointMatch: true
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la vérification du script:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la vérification du script de tracking',
      details: error.message
    });
  }
});

module.exports = router; 