const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { getModel } = require('../config/db');
const auth = require('../middleware/auth');

// Middleware d'authentification simplifié pour le token
const simpleAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token d\'authentification manquant' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        logger.error('Erreur d\'authentification:', error);
        res.status(401).json({ message: 'Token invalide' });
    }
};

// Route publique pour vérifier s'il existe déjà un admin
router.get('/check-admin', async (req, res) => {
    try {
        const MonitoringUser = getModel('MonitoringUser');
        const adminExists = await MonitoringUser.exists({});
        res.json({ hasAdmin: !!adminExists });
    } catch (error) {
        logger.error('Erreur lors de la vérification admin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route publique d'inscription (pour le premier admin)
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const MonitoringUser = getModel('MonitoringUser');
        const MonitoringToken = getModel('MonitoringToken');

        // Vérifier s'il existe déjà un admin
        const adminExists = await MonitoringUser.exists({});
        
        // Si un admin existe déjà, vérifier la clé d'admin
        if (adminExists && (!adminKey || adminKey !== process.env.MONITORING_ADMIN_KEY)) {
            return res.status(403).json({ message: 'Clé d\'administration invalide' });
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await MonitoringUser.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }

        // Créer le nouvel utilisateur
        const user = new MonitoringUser({
            email,
            isAdmin: true // S'assurer que l'utilisateur est bien admin
        });
        await user.setPassword(password);
        const savedUser = await user.save();
        
        console.log('Nouvel utilisateur créé:', {
            id: savedUser._id,
            email: savedUser.email,
            isAdmin: savedUser.isAdmin
        });

        // Si c'est le premier admin, générer un token de monitoring
        if (!adminExists) {
            const monitoringToken = new MonitoringToken({
                userId: savedUser._id,
                token: crypto.randomBytes(32).toString('hex'),
                isActive: true
            });
            await monitoringToken.save();
            console.log('Token de monitoring généré pour:', savedUser._id);
        }

        // Générer le token JWT
        const token = jwt.sign(
            { userId: savedUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: savedUser._id,
                email: savedUser.email,
                isAdmin: savedUser.isAdmin
            }
        });
    } catch (error) {
        console.error('Erreur détaillée lors de l\'inscription:', {
            error: error.message,
            stack: error.stack
        });
        logger.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
});

// Route publique de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const MonitoringUser = getModel('MonitoringUser');
        const MonitoringToken = getModel('MonitoringToken');

        logger.info(`Tentative de connexion pour: ${email}`);

        // Trouver l'utilisateur
        const user = await MonitoringUser.findOne({ email });
        if (!user) {
            logger.warn(`Utilisateur non trouvé: ${email}`);
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Vérifier le mot de passe
        const isValid = await user.checkPassword(password);
        if (!isValid) {
            logger.warn(`Mot de passe invalide pour: ${email}`);
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // Mettre à jour la date de dernière connexion
        await user.updateLastLogin();

        // Chercher un token de monitoring actif existant
        let monitoringToken = await MonitoringToken.findOne({
            userId: user._id,
            isActive: true
        });

        // Si aucun token actif n'existe, en créer un nouveau
        if (!monitoringToken) {
            monitoringToken = new MonitoringToken({
                userId: user._id,
                token: crypto.randomBytes(32).toString('hex'),
                isActive: true
            });
            await monitoringToken.save();
            logger.info(`Nouveau token de monitoring généré pour: ${user._id}`);
        } else {
            logger.info(`Réutilisation du token de monitoring existant pour: ${user._id}`);
        }

        // Générer le token JWT
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin,
                monitoringToken: monitoringToken.token
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info(`Connexion réussie pour: ${email}`);
        logger.debug('Token JWT généré:', token);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin,
                monitoringToken: monitoringToken.token
            }
        });
    } catch (error) {
        logger.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
});

// Route protégée pour récupérer les informations de l'utilisateur
router.get('/me', auth, async (req, res) => {
    try {
        const MonitoringUser = getModel('MonitoringUser');
        const user = await MonitoringUser.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json({
            id: user._id,
            email: user.email,
            isAdmin: user.isAdmin,
            lastLogin: user.lastLogin
        });
    } catch (error) {
        logger.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
    }
});

// Route pour activer un compte
router.post('/activate', async (req, res) => {
    try {
        const { email } = req.body;
        const MonitoringUser = getModel('MonitoringUser');
        
        const user = await MonitoringUser.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        user.isActive = true;
        await user.save();

        logger.info(`Compte activé pour l'utilisateur: ${user._id}`);
        res.json({ message: 'Compte activé avec succès' });
    } catch (error) {
        logger.error('Erreur lors de l\'activation du compte:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour récupérer ou générer un token de monitoring
router.get('/token', simpleAuth, async (req, res) => {
    try {
        const MonitoringToken = getModel('MonitoringToken');
        const MonitoringUser = getModel('MonitoringUser');

        // Vérifier l'existence de l'utilisateur
        const user = await MonitoringUser.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Récupérer ou créer un token de monitoring
        let monitoringToken = await MonitoringToken.findOne({ 
            userId: req.userId,
            isActive: true 
        });

        if (!monitoringToken) {
            monitoringToken = new MonitoringToken({
                userId: req.userId,
                token: crypto.randomBytes(32).toString('hex'),
                isActive: true
            });
            await monitoringToken.save();
            logger.info(`Nouveau token de monitoring généré pour: ${req.userId}`);
        }

        res.json({ token: monitoringToken.token });
    } catch (error) {
        logger.error('Erreur lors de la récupération du token:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router; 