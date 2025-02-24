const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

// Créer le transporteur pour l'envoi d'emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false // Ignorer la vérification du certificat SSL
  }
});

// Fonction pour envoyer une notification de site down
async function sendDownNotification(site, error) {
  if (!site.notifications?.email?.enabled || !site.notifications?.email?.addresses?.length) {
    return;
  }

  const emailAddresses = site.notifications.email.addresses;
  const subject = `🔴 Site Down - ${site.name}`;
  const html = `
    <h2>⚠️ Alerte : Site Inaccessible</h2>
    <p>Le site <strong>${site.name}</strong> est actuellement inaccessible.</p>
    <hr>
    <h3>Détails :</h3>
    <ul>
      <li><strong>URL :</strong> ${site.url}</li>
      <li><strong>Date :</strong> ${new Date().toLocaleString()}</li>
      <li><strong>Erreur :</strong> ${error || 'Site inaccessible'}</li>
    </ul>
    <p>Nous vous informerons dès que le site sera de nouveau accessible.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: emailAddresses.join(', '),
      subject,
      html
    });
    logger.info(`Notification d'erreur envoyée pour ${site.name} à ${emailAddresses.join(', ')}`);
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la notification par email:', error);
  }
}

// Fonction pour envoyer une notification de site rétabli
async function sendUpNotification(site, downtime) {
  if (!site.notifications?.email?.enabled || !site.notifications?.email?.addresses?.length) {
    return;
  }

  const emailAddresses = site.notifications.email.addresses;
  const subject = `🟢 Site UP - ${site.name}`;
  const html = `
    <h2>✅ Site UP</h2>
    <p>Le site <strong>${site.name}</strong> est de nouveau accessible.</p>
    <hr>
    <h3>Détails :</h3>
    <ul>
      <li><strong>URL :</strong> ${site.url}</li>
      <li><strong>Date :</strong> ${new Date().toLocaleString()}</li>
      <li><strong>Durée de l'interruption :</strong> ${downtime} minutes</li>
    </ul>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: emailAddresses.join(', '),
      subject,
      html
    });
    logger.info(`Notification de rétablissement envoyée pour ${site.name} à ${emailAddresses.join(', ')}`);
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la notification par email:', error);
  }
}

// Fonction pour envoyer une notification de temps de réponse élevé
async function sendHighResponseTimeNotification(site, responseTime) {
  if (!site.notifications?.email?.enabled || !site.notifications?.email?.addresses?.length) {
    return;
  }

  const emailAddresses = site.notifications.email.addresses;
  const subject = `⚠️ Temps de réponse élevé - ${site.name}`;
  const html = `
    <h2>⚠️ Alerte : Temps de réponse élevé</h2>
    <p>Le site <strong>${site.name}</strong> présente un temps de réponse anormalement élevé.</p>
    <hr>
    <h3>Détails :</h3>
    <ul>
      <li><strong>URL :</strong> ${site.url}</li>
      <li><strong>Date :</strong> ${new Date().toLocaleString()}</li>
      <li><strong>Temps de réponse :</strong> ${responseTime}ms</li>
    </ul>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: emailAddresses.join(', '),
      subject,
      html
    });
    logger.info(`Notification de temps de réponse élevé envoyée pour ${site.name}`);
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la notification par email:', error);
  }
}

// fonction pour envoyer une notification de test
async function sendTestNotification(site, email) {
  if (!site.notifications?.email?.enabled || !site.notifications?.email?.addresses?.length) {
    return;
  }

  const emailAddresses = site.notifications.email.addresses;
  const subject = `📌 Test de notification par email`;
  const html = `
    <h2>📌 Test de notification par email</h2>
    <p>La notification par email pour le site ${site.name} fonctionne correctement.</p>
    <br>
    <h3>Informations de test :</h3>
    <ul>
    <li><strong>Site :</strong> ${site.url}</li>
      <li><strong>Date :</strong> ${new Date().toLocaleString()}</li>
      <li><strong>Email :</strong> ${email}</li>
    </ul>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: emailAddresses.join(', '),
      subject,
      html
    });
    logger.info(`Notification de test envoyée pour ${site.name} à ${emailAddresses.join(', ')}`);
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la notification de test par email:', error);
  }
}

module.exports = {
  sendDownNotification,
  sendUpNotification,
  sendHighResponseTimeNotification,
  sendTestNotification
};