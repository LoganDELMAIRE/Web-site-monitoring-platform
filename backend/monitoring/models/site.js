const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: ['up', 'down', 'pending']
  },
  responseTime: {
    type: Number,
    required: true
  },
  statusCode: {
    type: Number
  },
  error: {
    type: String
  },
  visitors: {
    type: Number,
    default: 0
  }
});

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: props => `${props.value} n'est pas une URL valide!`
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoringUser',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['up', 'down', 'pending'],
    default: 'pending'
  },
  responseTime: {
    type: Number,
    default: 0
  },
  lastCheck: {
    type: Date,
    default: Date.now
  },
  uptime: {
    type: Number,
    default: 100
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  totalErrors: {
    type: Number,
    default: 0
  },
  errorHistory: [{
    date: Date,
    count: Number
  }],
  dailyStats: [{
    date: {
      type: Date,
      required: true
    },
    uptime: {
      type: Number,
      default: 100
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    },
    totalChecks: {
      type: Number,
      default: 0
    },
    visitors: {
      type: Number,
      default: 0
    }
  }],
  statusHistory: [statusHistorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String
  }],
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      addresses: [{
        type: String
      }]
    },
    webhook: {
      enabled: {
        type: Boolean,
        default: false
      },
      url: String
    }
  },
  monitoringToken: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Méthode pour calculer l'uptime
siteSchema.methods.calculateUptime = function() {
  const recentHistory = this.statusHistory.slice(-1000); // Utiliser les 1000 derniers checks
  if (recentHistory.length === 0) return 100;

  const upChecks = recentHistory.filter(check => check.status === 'up').length;
  return (upChecks / recentHistory.length) * 100;
};

// Méthode pour calculer le temps de réponse moyen
siteSchema.methods.calculateAverageResponseTime = function() {
  const recentHistory = this.statusHistory.slice(-1000);
  if (recentHistory.length === 0) return 0;

  const totalResponseTime = recentHistory.reduce((sum, check) => sum + (check.responseTime || 0), 0);
  return totalResponseTime / recentHistory.length;
};

// Méthode pour mettre à jour les statistiques quotidiennes
siteSchema.methods.updateDailyStats = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Initialiser les statistiques si elles n'existent pas
  if (!this.dailyStats) {
    this.dailyStats = [];
  }

  let todayStats = this.dailyStats.find(stat => 
    new Date(stat.date).toDateString() === today.toDateString()
  );

  if (!todayStats) {
    todayStats = {
      date: today,
      uptime: 100,
      averageResponseTime: 0,
      errorCount: 0,
      totalChecks: 0,
      visitors: 0
    };
    this.dailyStats.push(todayStats);
  }

  // Mettre à jour les statistiques
  const todayHistory = this.statusHistory.filter(check => 
    new Date(check.timestamp).toDateString() === today.toDateString()
  );

  if (todayHistory.length > 0) {
    const upChecks = todayHistory.filter(check => check.status === 'up').length;
    const totalResponseTime = todayHistory.reduce((sum, check) => sum + (check.responseTime || 0), 0);
    const errorCount = todayHistory.filter(check => check.status === 'down').length;
    const totalVisitors = todayHistory.reduce((sum, check) => sum + (check.visitors || 0), 0);

    todayStats.uptime = (upChecks / todayHistory.length) * 100;
    todayStats.averageResponseTime = Math.round(totalResponseTime / todayHistory.length);
    todayStats.errorCount = errorCount;
    todayStats.totalChecks = todayHistory.length;
    todayStats.visitors = totalVisitors;

    // Mettre à jour l'entrée dans le tableau
    const index = this.dailyStats.findIndex(stat => 
      new Date(stat.date).toDateString() === today.toDateString()
    );
    if (index !== -1) {
      this.dailyStats[index] = todayStats;
    }
  }

  // Trier les statistiques par date
  this.dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Limiter l'historique à 30 jours
  if (this.dailyStats.length > 30) {
    this.dailyStats = this.dailyStats.slice(-30);
  }
};

// Ajouter un hook pre-save pour mettre à jour les statistiques
siteSchema.pre('save', async function(next) {
  if (this.isModified('statusHistory')) {
    this.updateDailyStats();
  }
  next();
});

// Index pour améliorer les performances
siteSchema.index({ userId: 1, status: 1 });
siteSchema.index({ url: 1 }, { unique: true });

module.exports = {
  siteSchema
}; 