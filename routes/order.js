const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');
const orderController = require('../controllers/orderController');

//  Créer une commande
router.post('/', verifyToken, orderController.createOrder);

//  Voir l'historique de commandes
router.get('/history', verifyToken, orderController.getOrderHistory);

//  ADMIN : voir toutes les commandes
router.get('/all', verifyToken, isAdmin, orderController.getAllOrders);

// ADMIN : modifier le statut d'une commande
router.patch('/:id/status', verifyToken, isAdmin, orderController.updateOrderStatus);

router.get('/stats', verifyToken, isAdmin, orderController.getOrderStats);
router.get('/unpaid', verifyToken, isAdmin, orderController.getUnpaidOrders);
router.get('/paid', verifyToken, isAdmin, orderController.getPaidOrders);

// ADMIN : voir une commande par ID
router.get('/admin/:id', verifyToken, isAdmin, orderController.getOrderByIdAdmin);

// UTILISATEUR : voir sa commande par ID
router.get('/:id', verifyToken, orderController.getOrderById);

// Afficher instructions de paiement MTN
router.get('/:id/pay', verifyToken, orderController.showPaymentInstructions);
router.patch('/:id/confirm-payment', verifyToken, orderController.confirmPayment);


module.exports = router;
