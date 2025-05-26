const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts); // public

router.post('/', verifyToken, isAdmin, productController.addProduct); // admin only

router.put('/:id', verifyToken, isAdmin, productController.updateProduct);

router.delete('/:id', verifyToken, isAdmin, productController.deleteProduct);
router.get('/', productController.getProducts);

module.exports = router;
