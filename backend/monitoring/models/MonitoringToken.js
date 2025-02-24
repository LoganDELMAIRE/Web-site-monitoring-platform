const mongoose = require('mongoose');

const monitoringTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MonitoringUser',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    collection: 'monitoring_tokens'
});

// Méthode pour mettre à jour la date de dernière utilisation
monitoringTokenSchema.methods.updateLastUsed = function() {
    this.lastUsed = new Date();
    return this.save();
};

// Ajouter des index
monitoringTokenSchema.index({ userId: 1, isActive: 1 });
monitoringTokenSchema.index({ token: 1 }, { unique: true });

module.exports = { monitoringTokenSchema }; 