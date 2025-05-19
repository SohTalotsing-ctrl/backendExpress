// middleware/verifyToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Ajoute les infos du token à req
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
}

module.exports = verifyToken;
