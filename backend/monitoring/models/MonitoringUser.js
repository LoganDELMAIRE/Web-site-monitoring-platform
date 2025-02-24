const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const monitoringUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'monitoring_users'
});

// Méthode pour hasher le mot de passe
monitoringUserSchema.methods.setPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(password, salt);
};

// Méthode pour vérifier le mot de passe
monitoringUserSchema.methods.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Méthode pour mettre à jour la date de dernière connexion
monitoringUserSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

module.exports = { monitoringUserSchema }; 