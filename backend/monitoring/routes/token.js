const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { generateToken } = require('../utils/tokenGenerator');
const logger = require('../../utils/logger');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'monitor.config.js');

// S'assurer que le fichier de configuration existe
async function ensureConfigFile() {
  try {
    await fs.access(CONFIG_PATH);
  } catch (error) {
    const token = generateToken();
    const configContent = `module.exports = {
  MONITOR_TOKEN: '${token}',
  CHECK_INTERVAL: 5 * 60 * 1000,
  RETRY_ATTEMPTS: 3,
  TIMEOUT: 10000
};`;
    await fs.writeFile(CONFIG_PATH, configContent, 'utf8');
  }
}

// Récupérer le token actuel
router.get('/', async (req, res) => {
  try {
    await ensureConfigFile();
    
    // Vider le cache pour obtenir la dernière version
    delete require.cache[CONFIG_PATH];
    const config = require(CONFIG_PATH);
    
    res.json({ token: config.MONITOR_TOKEN });
  } catch (error) {
    logger.error('Erreur lors de la récupération du token:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du token',
      error: error.message 
    });
  }
});

// Générer un nouveau token
router.post('/generate', async (req, res) => {
  try {
    const token = generateToken();
    const configContent = `module.exports = {
  MONITOR_TOKEN: '${token}',
  CHECK_INTERVAL: 5 * 60 * 1000,
  RETRY_ATTEMPTS: 3,
  TIMEOUT: 10000
};`;

    await fs.writeFile(CONFIG_PATH, configContent, 'utf8');
    
    // Vider le cache du module de configuration
    delete require.cache[CONFIG_PATH];
    
    logger.info('Nouveau token de monitoring généré');
    res.json({ token });
  } catch (error) {
    logger.error('Erreur lors de la génération du token:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du token',
      error: error.message 
    });
  }
});

module.exports = router; 