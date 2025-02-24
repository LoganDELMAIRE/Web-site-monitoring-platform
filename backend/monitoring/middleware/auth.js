const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');
const { getModel } = require('../config/db');

const auth = async (req, res, next) => {
    try {
        // Log de la requête entrante
        logger.debug('Headers de la requête:', req.headers);
        logger.debug('Méthode:', req.method);
        logger.debug('URL:', req.url);

        // Gestion des requêtes OPTIONS pour CORS
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Vérification du header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.warn('Tentative d\'accès sans header d\'autorisation');
            return res.status(401).json({ 
                message: 'Token d\'authentification manquant',
                code: 'AUTH_HEADER_MISSING'
            });
        }

        // Vérification du format Bearer
        if (!authHeader.startsWith('Bearer ')) {
            logger.warn('Format de token invalide');
            return res.status(401).json({ 
                message: 'Format de token invalide',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        const token = authHeader.split(' ')[1];
        logger.debug('Token reçu:', token);

        try {
            // Vérification et décodage du token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            logger.debug('Token décodé:', decoded);
            
            // Vérification de l'existence de l'utilisateur
            const MonitoringUser = getModel('MonitoringUser');
            const user = await MonitoringUser.findOne({ _id: decoded.userId });

            if (!user) {
                logger.warn(`Utilisateur non trouvé pour l'ID: ${decoded.userId}`);
                return res.status(401).json({ 
                    message: 'Utilisateur non trouvé',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Si le token contient un monitoringToken, on vérifie qu'il est valide
            if (decoded.monitoringToken) {
                const MonitoringToken = getModel('MonitoringToken');
                const monitoringToken = await MonitoringToken.findOne({ 
                    userId: decoded.userId,
                    token: decoded.monitoringToken,
                    isActive: true 
                });

                if (!monitoringToken) {
                    logger.warn(`Token de monitoring invalide pour l'utilisateur: ${decoded.userId}`);
                    return res.status(401).json({ 
                        message: 'Token de monitoring invalide',
                        code: 'INVALID_MONITORING_TOKEN'
                    });
                }

                // Mettre à jour la date de dernière utilisation
                monitoringToken.lastUsed = new Date();
                await monitoringToken.save();
            }

            // Ajout des informations de l'utilisateur à la requête
            req.user = user;
            req.userId = decoded.userId;
            if (decoded.monitoringToken) {
                req.monitoringToken = decoded.monitoringToken;
            }
            
            logger.debug(`Authentification réussie pour l'utilisateur: ${decoded.userId}`);
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                logger.warn('Token JWT invalide:', error.message);
                return res.status(401).json({ 
                    message: 'Token invalide',
                    code: 'INVALID_TOKEN'
                });
            } else if (error.name === 'TokenExpiredError') {
                logger.warn('Token JWT expiré');
                return res.status(401).json({ 
                    message: 'Token expiré',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            logger.error('Erreur lors de la vérification du token:', error);
            return res.status(401).json({ 
                message: 'Erreur d\'authentification',
                code: 'AUTH_ERROR'
            });
        }
    } catch (error) {
        logger.error('Erreur serveur lors de l\'authentification:', error);
        res.status(500).json({ 
            message: 'Erreur serveur',
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = auth; 