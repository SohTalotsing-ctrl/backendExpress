// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
const verifyToken = require('../middleware/verifyToken');

router.get('/profile', verifyToken, (req, res) => {
  res.json({
    message: 'Voici ton profil',
    userId: req.user.id
  });
});
