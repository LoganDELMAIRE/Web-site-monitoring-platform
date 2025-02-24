const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'site',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  }
});

// Méthode pour récupérer les alertes récentes
alertSchema.statics.getRecentAlerts = async function(userId) {
  try {
    return await this.find({ acknowledged: false })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate({
        path: 'site',
        match: { userId: userId },
        select: 'name'
      })
      .lean();
  } catch (error) {
    throw error;
  }
};

// Méthode pour acquitter une alerte
alertSchema.methods.acknowledge = function() {
  this.acknowledged = true;
  return this.save();
};

// Index pour améliorer les performances des requêtes
alertSchema.index({ timestamp: -1 });
alertSchema.index({ acknowledged: 1 });
alertSchema.index({ site: 1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = {alertSchema, Alert}; 