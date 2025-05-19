// controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = (req, res) => {
  const { name, email, password } = req.body;

  // 1. Vérifier si l'email existe déjà
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
    if (result.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // 2. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insérer l'utilisateur
    db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword }, (err) => {
      if (err) throw err;
      res.status(201).json({ message: 'Inscription réussie' });
    });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
    if (err) throw err;

    if (result.length === 0) {
      return res.status(401).json({ message: 'Email invalide' });
    }

    const validPassword = await bcrypt.compare(password, result[0].password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // ✅ Le token contient id et role
    const token = jwt.sign(
      {
        id: result[0].id,
        role: result[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Connexion réussie',
      token
    });
  });
};

