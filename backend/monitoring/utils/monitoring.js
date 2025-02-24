const axios = require('axios');
const Site = require('../models/site');
const Alert = require('../models/Alert');
const { 
  sendDownNotification, 
  sendUpNotification, 
  sendHighResponseTimeNotification 
} = require('./emailNotifier');
const {
  sendDownWebhook,
  sendUpWebhook,
  sendHighResponseTimeWebhook
} = require('./webhookNotifier');

const checkSite = async (site) => {
  try {
    const startTime = Date.now();
    const response = await axios.get(site.url, {
      timeout: 10000 // 10 secondes de timeout
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Mise à jour du statut et des statistiques
    const status = response.status >= 200 && response.status < 400 ? 'up' : 'down';
    const previousStatus = site.status;
    site.status = status;
    site.lastCheck = new Date();
    site.responseTime = responseTime;
    site.checks.push({
      timestamp: new Date(),
      status,
      responseTime
    });

    // Nettoyage des anciennes vérifications (garder seulement les 30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    site.checks = site.checks.filter(check => check.timestamp > thirtyDaysAgo);

    // Calcul de la disponibilité
    const totalChecks = site.checks.length;
    const upChecks = site.checks.filter(check => check.status === 'up').length;
    site.uptime = (upChecks / totalChecks) * 100;

    // Création d'alertes et envoi de notifications si nécessaire
    if (status === 'down') {
      const alert = await Alert.create({
        site: site._id,
        message: 'Le site est inaccessible',
        severity: 'critical',
      });

      // Envoyer les notifications seulement si le site était précédemment en ligne
      if (previousStatus === 'up') {
        if (site.notifications?.email?.enabled) {
          await sendDownNotification(site, 'Le site est inaccessible');
        }
        if (site.notifications?.webhook?.enabled) {
          await sendDownWebhook(site, 'Le site est inaccessible');
        }
      }
    } else if (responseTime > 2000) { // Alerte si temps de réponse > 2 secondes
      const alert = await Alert.create({
        site: site._id,
        message: `Temps de réponse élevé: ${responseTime}ms`,
        severity: 'warning',
      });

      if (site.notifications?.email?.enabled) {
        await sendHighResponseTimeNotification(site, responseTime);
      }
      if (site.notifications?.webhook?.enabled) {
        await sendHighResponseTimeWebhook(site, responseTime);
      }
    } else if (site.uptime < 95) { 
      const alert = await Alert.create({
        site: site._id,
        message: `Disponibilité faible: ${site.uptime.toFixed(2)}%`,
        severity: 'warning',
      });

      const message = `La disponibilité du site est tombée en dessous de 95% (${site.uptime.toFixed(2)}%)`;
      if (site.notifications?.email?.enabled) {
        await sendDownNotification(site, message);
      }
      if (site.notifications?.webhook?.enabled) {
        await sendDownWebhook(site, message);
      }
    }

    // Si le site était down et qu'il est maintenant up, envoyer une notification de rétablissement
    if (status === 'up' && previousStatus === 'down') {
      const lastDownTime = site.checks.findLast(check => check.status === 'down')?.timestamp;
      const downtime = lastDownTime ? Math.round((new Date() - new Date(lastDownTime)) / 1000 / 60) : 0;

      if (site.notifications?.email?.enabled) {
        await sendUpNotification(site, downtime);
      }
      if (site.notifications?.webhook?.enabled) {
        await sendUpWebhook(site, downtime);
      }

      // Créer une alerte info pour le rétablissement
      await Alert.create({
        site: site._id,
        message: `Le site est de nouveau accessible après ${downtime} minutes d'interruption`,
        severity: 'info',
      });
    }

    await site.save();
    return true;
  } catch (error) {
    console.error(`Erreur lors de la vérification de ${site.url}:`, error);
    
    const previousStatus = site.status;
    site.status = 'down';
    site.lastCheck = new Date();
    site.checks.push({
      timestamp: new Date(),
      status: 'down',
      responseTime: null
    });

    // Création d'une alerte pour l'erreur
    const alert = await Alert.create({
      site: site._id,
      message: `Erreur de connexion: ${error.message}`,
      severity: 'critical',
    });

    // Envoyer les notifications seulement si le site était précédemment en ligne
    if (previousStatus === 'up') {
      if (site.notifications?.email?.enabled) {
        await sendDownNotification(site, `Erreur de connexion: ${error.message}`);
      }
      if (site.notifications?.webhook?.enabled) {
        await sendDownWebhook(site, `Erreur de connexion: ${error.message}`);
      }
    }

    await site.save();
    return false;
  }
};

module.exports = {
  checkSite
}; 