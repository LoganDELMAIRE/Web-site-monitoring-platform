const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

const tokenAuth = (req, res, next) => {
  try {
    // Vérifier le token dans les cookies
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    logger.error('Erreur d\'authentification:', error);
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = tokenAuth; 