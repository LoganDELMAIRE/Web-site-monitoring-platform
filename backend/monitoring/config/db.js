const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { siteSchema } = require('../models/site');
const { monitoringUserSchema } = require('../models/MonitoringUser');
const { monitoringTokenSchema } = require('../models/MonitoringToken');
const { alertSchema } = require('../models/Alert');
let monitoringConnection = null;

const connectDB = async () => {
    try {
        const Uri = process.env.MONGODB_URI;
        monitoringConnection = await mongoose.createConnection(Uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        logger.info('MongoDB Monitoring connected');

        // Enregistrer les modèles sur cette connexion
        monitoringConnection.model('Site', siteSchema);
        monitoringConnection.model('MonitoringUser', monitoringUserSchema);
        monitoringConnection.model('MonitoringToken', monitoringTokenSchema);
        monitoringConnection.model('Alert', alertSchema);

        // Créer les index nécessaires
        const Site = monitoringConnection.model('Site');
        await Site.createIndexes();

        const MonitoringUser = monitoringConnection.model('MonitoringUser');
        await MonitoringUser.createIndexes();

        const MonitoringToken = monitoringConnection.model('MonitoringToken');
        await MonitoringToken.createIndexes();

        const Alert = monitoringConnection.model('Alert');
        await Alert.createIndexes();

        return monitoringConnection;
    } catch (error) {
        logger.error('Error connecting to MongoDB Monitoring:', error);
        throw error;
    }
};

const getConnection = () => monitoringConnection;

const getModel = (modelName) => {
    if (!monitoringConnection) {
        throw new Error('Database connection not initialized');
    }
    return monitoringConnection.model(modelName);
};

module.exports = {
    connectDB,
    getConnection,
    getModel
};