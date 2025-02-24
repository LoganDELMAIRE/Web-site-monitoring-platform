const axios = require('axios');
const logger = require('../../utils/logger');

function formatDiscordPayload(site, event) {
  return {
    embeds: [{
      title: `${event.emoji} ${event.title}`,
      description: event.description,
      color: event.color,
      fields: [
        {
          name: "Site",
          value: site.name,
          inline: true
        },
        {
          name: "URL",
          value: site.url,
          inline: true
        },
        ...event.fields
      ],
      timestamp: new Date().toISOString()
    }]
  };
}

function formatSlackPayload(site, event) {
  const fields = event.fields.map(field => `*${field.name}:* ${field.value}`).join('\n');
  return {
    text: `${event.emoji} ${event.title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Site:* ${site.name}\n*URL:* ${site.url}\n${fields}`
        }
      }
    ]
  };
}

function formatTeamsPayload(site, event) {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": event.color.toString(16),
    "title": `${event.emoji} ${event.title}`,
    "text": event.description,
    "sections": [
      {
        "facts": [
          {
            name: "Site",
            value: site.name
          },
          {
            name: "URL",
            value: site.url
          },
          ...event.fields.map(field => ({
            name: field.name,
            value: field.value
          }))
        ]
      }
    ]
  };
}

function formatGoogleChatPayload(site, event) {
  return {
    cards: [
      {
        header: {
          title: `${event.emoji} ${event.title}`
        },
        sections: [
          {
            widgets: [
              {
                keyValue: {
                  topLabel: "Site",
                  content: site.name
                }
              },
              {
                keyValue: {
                  topLabel: "URL",
                  content: site.url
                }
              },
              ...event.fields.map(field => ({
                keyValue: {
                  topLabel: field.name,
                  content: field.value
                }
              }))
            ]
          }
        ]
      }
    ]
  };
}

function formatGenericPayload(site, event) {
  return {
    event: event.type,
    site: {
      name: site.name,
      url: site.url
    },
    status: event.type.includes('down') ? 'down' : 'up',
    timestamp: new Date().toISOString(),
    details: event.fields.reduce((acc, field) => {
      acc[field.name.toLowerCase()] = field.value;
      return acc;
    }, {})
  };
}

async function sendWebhookNotification(site, event) {
  if (!site.notifications?.webhook?.enabled || !site.notifications?.webhook?.url) {
    logger.warn('Webhook non configuré ou désactivé pour le site:', site.name);
    return;
  }

  const webhookUrl = site.notifications.webhook.url;
  let payload;

  try {
    // Sélectionner le format en fonction de la plateforme
    switch (site.notifications.webhook.platform) {
      case 'discord':
        payload = formatDiscordPayload(site, event);
        break;
      case 'slack':
        payload = formatSlackPayload(site, event);
        break;
      case 'teams':
        payload = formatTeamsPayload(site, event);
        break;
      case 'google_chat':
        payload = formatGoogleChatPayload(site, event);
        break;
      default:
        payload = formatGenericPayload(site, event);
    }

    logger.info(`Envoi d'une notification webhook (${site.notifications.webhook.platform}) pour ${site.name}:`, {
      event: event.type,
      url: webhookUrl
    });

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Monitoring-Webhook/1.0'
      },
      timeout: 5000
    });

    logger.info(`Webhook envoyé avec succès pour ${site.name} (${event.type}):`, {
      status: response.status,
      statusText: response.statusText
    });
  } catch (error) {
    logger.error(`Erreur lors de l'envoi du webhook pour ${site.name}:`, {
      error: error.message,
      response: error.response?.data,
      platform: site.notifications.webhook.platform,
      event: event.type
    });
    throw error;
  }
}

// Fonction pour envoyer une notification de site down
async function sendDownWebhook(site, error) {
  await sendWebhookNotification(site, {
    type: 'site_down',
    emoji: '🔴',
    title: 'Site Inaccessible',
    description: 'Le site est actuellement inaccessible.',
    color: 15158332, // Rouge
    fields: [
      {
        name: 'Erreur',
        value: error || 'Site inaccessible',
        inline: false
      }
    ]
  });
}

// Fonction pour envoyer une notification de site rétabli
async function sendUpWebhook(site, downtime) {
  await sendWebhookNotification(site, {
    type: 'site_up',
    emoji: '🟢',
    title: 'Site Rétabli',
    description: 'Le site est de nouveau accessible.',
    color: 3066993, // Vert
    fields: [
      {
        name: 'Durée de l\'interruption',
        value: `${downtime} minutes`,
        inline: false
      }
    ]
  });
}

// Fonction pour envoyer une notification de temps de réponse élevé
async function sendHighResponseTimeWebhook(site, responseTime) {
  await sendWebhookNotification(site, {
    type: 'high_response_time',
    emoji: '⚠️',
    title: 'Temps de Réponse Élevé',
    description: 'Le site présente un temps de réponse anormalement élevé.',
    color: 16776960, // Jaune
    fields: [
      {
        name: 'Temps de réponse',
        value: `${responseTime}ms`,
        inline: false
      }
    ]
  });
}

// fonction pour envoyer une notification de test
async function sendTestWebhook(site, webhook) {
  await sendWebhookNotification(site, {
    type: 'test',
    emoji: '📌',
    title: 'Test de notification webhook',
    description: `La notification webhook pour le site ${site.name} fonctionne correctement.`,
    color: 3066993, // Vert
    fields: [
      {
        name: 'Test notification webhook',
        value: `La notification webhook pour le site ${site.name} fonctionne correctement.`,
        inline: false
      }
    ]
  });
}


module.exports = {
  sendDownWebhook,
  sendUpWebhook,
  sendHighResponseTimeWebhook,
  sendTestWebhook
}; 