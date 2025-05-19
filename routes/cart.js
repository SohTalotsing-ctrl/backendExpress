const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const cartController = require('../controllers/cartController');

// ➕ Ajouter au panier
router.post('/', verifyToken, cartController.addToCart);

// 📦 Voir le panier
router.get('/', verifyToken, cartController.getCart);

// ❌ Supprimer un article
router.delete('/:id', verifyToken, cartController.removeFromCart);

module.exports = router;
