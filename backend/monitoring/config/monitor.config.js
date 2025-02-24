module.exports = {
    // Configuration du monitoring
    checkInterval: process.env.MONITOR_CHECK_INTERVAL || 300000, // 5 minutes par défaut
    timeout: process.env.MONITOR_TIMEOUT || 30000, // 30 secondes par défaut
    retries: process.env.MONITOR_RETRIES || 3,
    retryDelay: process.env.MONITOR_RETRY_DELAY || 5000, // 5 secondes par défaut

    // Configuration des notifications
    notifications: {
        enabled: process.env.MONITOR_NOTIFICATIONS_ENABLED === 'true' || false,
        email: {
            enabled: process.env.MONITOR_EMAIL_NOTIFICATIONS_ENABLED === 'true' || false,
            from: process.env.MONITOR_EMAIL_FROM || 'monitoring@sandbox.logandelmairedev.com',
            subject: process.env.MONITOR_EMAIL_SUBJECT || 'Alerte de monitoring - {siteName}',
        },
    },

    // Configuration de la validation des sites
    validation: {
        tokenFile: '.well-known/monitoring-allowed',
        tokenPrefix: 'MONITOR_TOKEN=',
    },

    // Configuration des seuils d'alerte
    thresholds: {
        responseTime: process.env.MONITOR_THRESHOLD_RESPONSE_TIME || 5000, // 5 secondes
        availability: process.env.MONITOR_THRESHOLD_AVAILABILITY || 99.9, // 99.9%
        errorRate: process.env.MONITOR_THRESHOLD_ERROR_RATE || 1, // 1%
    },

    // Configuration de la rétention des données
    retention: {
        dailyStats: process.env.MONITOR_RETENTION_DAILY_STATS || 30, // 30 jours
        detailedLogs: process.env.MONITOR_RETENTION_DETAILED_LOGS || 7, // 7 jours
    }
}; 