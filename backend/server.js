const express = require('express');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');
const app = express();
const axios = require('axios');

const { connectDB: connectMonitoringDB } = require('./monitoring/config/db');
const { Site } = require('./monitoring/models/site');

// Configuration CORS détaillée
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));

// Middleware pour gérer les requêtes OPTIONS
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  if (process.env.DEBUG_MODE === 'true') {
    logger.info(`${req.method} ${req.url}`);
    logger.debug('Headers:', req.headers);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

const initializeServer = async () => {
  try {
    // Créer le dossier de configuration pour le monitoring s'il n'existe pas
    const monitoringConfigPath = path.join(__dirname, 'monitoring', 'config');
    try {
      await fs.access(monitoringConfigPath);
    } catch (error) {
      await fs.mkdir(monitoringConfigPath, { recursive: true });
      logger.info('Monitoring config directory created');
    }

    // Connexion à la base de données monitoring
    const monitoringConnection = await connectMonitoringDB();
    app.set('monitoringConnection', monitoringConnection);
    logger.info('Monitoring database connected');

    // Routes de monitoring
    const monitoringRoutes = require('./monitoring/routes/monitoring');
    const monitoringAuthRoutes = require('./monitoring/routes/auth');
    const monitoringAuth = require('./monitoring/middleware/auth');

    // Route publique de tracking (AVANT l'authentification)
    app.get('/api/monitoring/tracking/:siteId', async (req, res) => {
      try {
        const { siteId } = req.params;
        const { token } = req.query;
        const monitoringConnection = app.get('monitoringConnection');
        if (!monitoringConnection) {
          logger.error('Monitoring connection not available');
          return res.status(500).send();
        }

        const Site = monitoringConnection.model('Site');
        const site = await Site.findById(siteId);

        if (!site) {
          return res.status(404).send();
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

          // Ajouter le visiteur à l'historique du site
          const lastHistoryEntry = site.statusHistory[site.statusHistory.length - 1];
          if (lastHistoryEntry) {
            lastHistoryEntry.visitors = (lastHistoryEntry.visitors || 0) + 1;
            await site.save();
          }

          // Envoyer une image transparente 1x1
          const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
          res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': transparentPixel.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          res.end(transparentPixel);
        } catch (error) {
          logger.error('Erreur lors de la vérification du token:', error);
          res.status(401).send('Erreur de vérification du token');
        }
      } catch (error) {
        logger.error('Erreur lors du tracking:', error);
        res.status(500).send();
      }
    });

    // Routes publiques de monitoring
    app.use('/api/monitoring/auth', monitoringAuthRoutes);

    // Routes protégées de monitoring
    app.use('/api/monitoring', monitoringAuth, (req, res, next) => {
      // Vérifier si l'utilisateur est authentifié
      if (!req.userId) {
        logger.warn('Tentative d\'accès sans userId');
        return res.status(401).json({ 
          message: 'Non autorisé - Token manquant ou invalide',
          code: 'AUTH_REQUIRED'
        });
      }
      next();
    });

    // Appliquer les routes de monitoring après l'authentification
    app.use('/api/monitoring', monitoringRoutes);

    // Route pour les statistiques globales
    app.get('/api/monitoring/stats', monitoringAuth, async (req, res) => {
      try {
        logger.info(`Récupération des statistiques pour l'utilisateur: ${req.userId}`);
        const Site = getModel('Site');
        const sites = await Site.find({ userId: req.userId });
        
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

    // Route pour les statistiques d'un site spécifique
    app.get('/api/monitoring/sites/:id/stats', monitoringAuth, async (req, res) => {
      try {
        const Site = getModel('Site');
        const site = await Site.findOne({ _id: req.params.id, userId: req.userId });
        
        if (!site) {
          return res.status(404).json({ message: 'Site non trouvé' });
        }

        res.json({
          dailyStats: site.dailyStats,
          uptime: site.uptime,
          averageResponseTime: site.averageResponseTime,
          totalErrors: site.totalErrors
        });
      } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques du site:', error);
        res.status(500).json({ message: 'Erreur serveur' });
      }
    });

    // Route pour récupérer l'historique des statuts d'un site
    app.get('/api/monitoring/sites/:id/history', monitoringAuth, async (req, res) => {
      try {
        const Site = getModel('Site');
        const site = await Site.findOne({ _id: req.params.id, userId: req.userId });
        
        if (!site) {
          return res.status(404).json({ message: 'Site non trouvé' });
        }

        res.json(site.statusHistory);
      } catch (error) {
        logger.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ message: 'Erreur serveur' });
      }
    });

    // Route pour vérifier l'installation du script de tracking
    app.get('/api/monitoring/sites/:id/check-tracking', monitoringAuth, async (req, res) => {
      try {
        const monitoringConnection = app.get('monitoringConnection');
        if (!monitoringConnection) {
          logger.error('Monitoring connection not available');
          return res.status(500).json({ message: 'Erreur de connexion à la base de données' });
        }

        const Site = monitoringConnection.model('Site');
        const site = await Site.findOne({ _id: req.params.id, userId: req.userId });
        
        if (!site) {
          return res.status(404).json({ message: 'Site non trouvé' });
        }

        // Récupérer le contenu HTML du site
        const response = await axios.get(site.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'MonitoringBot/1.0'
          }
        });

        const html = response.data;
        
        // Vérifier si le script de tracking est présent
        const trackingEndpoint = `${process.env.API_URL}/api/monitoring/tracking`;
        if (html.includes(trackingEndpoint)) {
          res.json({ message: 'Le script de tracking est correctement installé' });
        } else {
          res.status(404).json({ message: 'Le script de tracking n\'a pas été trouvé sur le site' });
        }
      } catch (error) {
        logger.error('Erreur lors de la vérification du script:', error);
        if (error.response?.status === 404) {
          return res.status(404).json({ 
            message: 'Le site n\'est pas accessible. Vérifiez que l\'URL est correcte et que le site est en ligne.' 
          });
        }
        res.status(500).json({ 
          message: 'Impossible de vérifier le script de tracking. Assurez-vous que le site est accessible.',
          error: error.message
        });
      }
    });

    // Gestion des erreurs
    app.use((err, req, res, next) => {
      logger.error('Server error:', err.stack);
      res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.DEBUG_MODE === 'true' ? err.message : undefined
      });
    });

    const PORT = process.env.PORT || 3003;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Démarrer le service de monitoring
    startMonitoringService();
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

// Service de monitoring en arrière-plan
async function checkAllSites() {
  try {
    const monitoringConnection = app.get('monitoringConnection');
    if (!monitoringConnection) {
      logger.error('Monitoring connection not available');
      return;
    }

    const Site = monitoringConnection.model('Site');
    const sites = await Site.find();
    logger.info(`Checking ${sites.length} sites...`);
    
    for (const site of sites) {
      try {
        const startTime = Date.now();
        const response = await axios.get(site.url, { 
          timeout: 10000,
          validateStatus: false,
          headers: {
            'User-Agent': 'MonitoringBot/1.0'
          }
        });
        const responseTime = Date.now() - startTime;
        
        site.status = response.status >= 200 && response.status < 400 ? 'up' : 'down';
        site.responseTime = responseTime;
        site.lastCheck = new Date();
        site.statusHistory.push({
          timestamp: new Date(),
          status: site.status,
          responseTime
        });
        
        // Limiter l'historique à 1000 entrées
        if (site.statusHistory.length > 1000) {
          site.statusHistory = site.statusHistory.slice(-1000);
        }
        
        // Mettre à jour l'uptime
        site.uptime = site.calculateUptime();
        
        await site.save();
        logger.info(`Site ${site.name} checked: ${site.status} (${responseTime}ms)`);
      } catch (error) {
        site.status = 'down';
        site.lastCheck = new Date();
        site.statusHistory.push({
          timestamp: new Date(),
          status: 'down',
          responseTime: 0
        });
        
        site.uptime = site.calculateUptime();
        await site.save();
        logger.error(`Error checking site ${site.name}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('Error in monitoring service:', error);
  }
}

function startMonitoringService() {
  // Attendre 5 secondes avant de démarrer le service pour s'assurer que tout est initialisé
  setTimeout(() => {
    logger.info('Starting monitoring service...');
    // Vérifier les sites immédiatement
    checkAllSites();
    // Puis toutes les 5 minutes
    setInterval(checkAllSites, 5 * 60 * 1000);
    logger.info('Monitoring service started');
  }, 5000);
}

initializeServer(); 