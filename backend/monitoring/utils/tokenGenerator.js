const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

// Fonction pour générer un token unique
function generateToken() {
  // Générer 32 octets aléatoires et les convertir en base64
  const randomBytes = crypto.randomBytes(32);
  // Préfixer avec 'sandbox_monitor_' et formater pour être URL-safe
  return 'sandbox_monitor_' + randomBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Fonction pour sauvegarder le token dans un fichier de configuration
async function saveToken(token) {
  const configPath = path.join(__dirname, '..', 'config', 'monitor.config.js');
  const configContent = `module.exports = {
  MONITOR_TOKEN: '${token}',
  // Autres configurations peuvent être ajoutées ici
  CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes en millisecondes
  RETRY_ATTEMPTS: 3,
  TIMEOUT: 10000 // 10 secondes
};`;

  try {
    await fs.writeFile(configPath, configContent, 'utf8');
    logger.info('Token de monitoring généré et sauvegardé avec succès');
    return true;
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde du token:', error);
    throw error;
  }
}

// Fonction pour générer et sauvegarder un nouveau token
async function setupMonitoringToken() {
  try {
    const token = generateToken();
    await saveToken(token);
    
    // Afficher les instructions
    console.log('\n=== Configuration du Token de Monitoring ===\n');
    console.log('Un nouveau token a été généré avec succès !');
    console.log('\nVotre token de monitoring est:');
    console.log('\x1b[32m%s\x1b[0m', token);
    console.log('\nAjoutez ce token dans le fichier .well-known/monitoring-allowed de chaque site à monitorer:');
    console.log('\x1b[36m%s\x1b[0m', `MONITOR_TOKEN=${token}`);
    console.log('\nLe token a été sauvegardé dans: monitoring/config/monitor.config.js');
    console.log('\nIMPORTANT: Gardez ce token secret et ne le partagez qu\'avec les sites que vous souhaitez monitorer.');
    
    return token;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Erreur lors de la génération du token:', error.message);
    throw error;
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  setupMonitoringToken()
    .then(() => {
      console.log('\nConfiguration terminée avec succès !');
    })
    .catch(error => {
      console.error('\x1b[31m%s\x1b[0m', 'Erreur lors de la configuration:', error.message);
      process.exit(1);
    });
}

module.exports = {
  generateToken,
  setupMonitoringToken
}; 