const logger = require('../../utils/logger');
const axios = require('axios');
const config = require('../config/monitor.config');
const jwt = require('jsonwebtoken');
const { getModel } = require('../config/db');

// Liste des protocoles autorisés
const allowedProtocols = ['http:', 'https:'];

// Fonction pour extraire le domaine d'une URL
const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
};

// Fonction pour vérifier le fichier monitoring-allowed
async function checkMonitoringFile(url, token) {
  try {
    const monitoringFileUrl = `${url}/${config.validation.tokenFile}`;
    const response = await axios.get(monitoringFileUrl, {
      timeout: config.timeout,
      headers: {
        'User-Agent': 'SandboxMonitor/1.0',
      }
    });

    if (response.status !== 200) {
      throw new Error('Fichier monitoring-allowed non accessible');
    }

    // Analyser le contenu du fichier
    const content = response.data;
    const lines = content.split('\n');
    let foundToken = null;

    // Chercher le token dans le fichier
    for (const line of lines) {
      if (line.startsWith(config.validation.tokenPrefix)) {
        foundToken = line.substring(config.validation.tokenPrefix.length).trim();
        break;
      }
    }

    if (!foundToken || foundToken !== token) {
      throw new Error('Token d\'autorisation invalide ou manquant');
    }

    return true;
  } catch (error) {
    logger.warn(`Erreur lors de la vérification du fichier monitoring-allowed: ${error.message}`);
    throw error;
  }
}

// Middleware pour vérifier l'authentification et les autorisations
const validateSite = async (req, res, next) => {
  try {
    // Vérifier l'authentification JWT d'abord
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const MonitoringUser = getModel('MonitoringUser');
      const user = await MonitoringUser.findOne({ _id: decoded.userId });

      if (!user) {
        logger.error('Utilisateur non trouvé pour le token:', decoded);
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      req.user = user;
      req.userId = decoded.userId;

      // Pour les requêtes GET, on passe directement à la suite
      if (req.method === 'GET') {
        return next();
      }

      // Vérifications spécifiques pour POST et DELETE
      if (req.method === 'POST' || req.method === 'DELETE') {
        const { url, monitoringToken } = req.body;
        if (!url) {
          return res.status(400).json({ message: 'URL requise' });
        }

        if (!monitoringToken) {
          return res.status(400).json({ message: 'Token de monitoring requis' });
        }

        // Vérifier si l'URL est valide
        let urlObj;
        try {
          urlObj = new URL(url);
        } catch (error) {
          return res.status(400).json({ message: 'URL invalide' });
        }

        // Vérifier le protocole
        if (!allowedProtocols.includes(urlObj.protocol)) {
          return res.status(403).json({ 
            message: 'Protocole non autorisé. Utilisez HTTP ou HTTPS.' 
          });
        }

        // Extraire et vérifier le domaine
        const domain = extractDomain(url);
        if (!domain) {
          return res.status(400).json({ message: 'Impossible d\'extraire le domaine de l\'URL' });
        }

        // Vérifier si le domaine est autorisé
        const isAllowed = allowedDomains.some(allowedDomain => 
          domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
        );

        if (!isAllowed) {
          logger.warn(`Tentative d'ajout d'un site non autorisé: ${domain}`);
          return res.status(403).json({ 
            message: 'Ce domaine n\'est pas autorisé pour le monitoring' 
          });
        }

        // Vérifier le fichier monitoring-allowed et le token
        try {
          await checkMonitoringFile(url, monitoringToken);
        } catch (error) {
          return res.status(403).json({ 
            message: 'Ce site n\'autorise pas le monitoring ou le token est invalide. ' +
                    'Vérifiez que le fichier .well-known/monitoring-allowed existe et contient le bon token.' 
          });
        }

        // Ajouter le token vérifié à la requête pour une utilisation ultérieure
        req.monitoringToken = monitoringToken;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification du token:', error);
      return res.status(401).json({ message: 'Token invalide' });
    }
  } catch (error) {
    logger.error('Erreur lors de la validation:', error);
    res.status(500).json({ message: 'Erreur lors de la validation' });
  }
};

module.exports = validateSite; 