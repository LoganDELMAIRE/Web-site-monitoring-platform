#!/usr/bin/env node

const { setupMonitoringToken } = require('./utils/tokenGenerator');
const fs = require('fs').promises;
const path = require('path');

async function createDirectories() {
  const dirs = [
    path.join(__dirname, 'config'),
    path.join(__dirname, 'logs')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

async function setup() {
  console.log('\n=== Configuration du Service de Monitoring ===\n');
  
  try {
    // 1. Créer les répertoires nécessaires
    console.log('1. Création des répertoires...');
    await createDirectories();
    console.log('\x1b[32m%s\x1b[0m', '✓ Répertoires créés avec succès');

    // 2. Générer et sauvegarder le token
    console.log('\n2. Génération du token de monitoring...');
    const token = await setupMonitoringToken();
    console.log('\x1b[32m%s\x1b[0m', '✓ Token généré avec succès');

    // 3. Afficher les instructions finales
    console.log('\n=== Instructions d\'utilisation ===\n');
    console.log('1. Ajoutez ce token dans le fichier .well-known/monitoring-allowed de chaque site à monitorer:');
    console.log('\x1b[36m%s\x1b[0m', `MONITOR_TOKEN=${token}`);
    console.log('\n2. Assurez-vous que le fichier est accessible à:');
    console.log('\x1b[36m%s\x1b[0m', 'https://votre-site.com/.well-known/monitoring-allowed');
    console.log('\n3. Vous pouvez maintenant ajouter des sites à monitorer depuis l\'interface web');
    
    console.log('\n\x1b[32m%s\x1b[0m', '✓ Configuration terminée avec succès !');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '✗ Erreur lors de la configuration:');
    console.error('\x1b[31m%s\x1b[0m', error.message);
    process.exit(1);
  }
}

// Exécuter la configuration
setup(); 