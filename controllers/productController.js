// controllers/productController.js
const db = require('../config/db');

exports.getAllProducts = (req, res) => {
  const sql = `
    SELECT 
      products.id,
      products.name,
      products.description,
      products.price,
      products.stock,
      products.imageUrl,
      products.created_at,
      users.name AS creator_name
    FROM products
    JOIN users ON products.user_id = users.id
  `;

  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
};


exports.addProduct = (req, res) => {
  const { name, description, price, stock, imageUrl } = req.body;
  const userId = req.user.id;

  db.query('INSERT INTO products SET ?', {
   name, description, price, stock, imageUrl, user_id: userId
  }, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: 'Produit ajouté avec succès' });
  });
};

exports.updateProduct = (req, res) => {
  const productId = req.params.id;
  const adminId = req.user.id;
  const { name, description, price, stock, imageUrl } = req.body;

  // Vérifie que le produit appartient à l'admin
  db.query('SELECT * FROM products WHERE id = ?', [productId], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    if (result[0].user_id !== adminId) {
      return res.status(403).json({ message: "Vous n'êtes pas le créateur de ce produit" });
    }

    // Mise à jour
    const sql = `
      UPDATE products 
      SET name = ?, description = ?, price = ?, stock = ?, imageUrl = ?
      WHERE id = ?
    `;
    db.query(sql, [name, description, price, stock, imageUrl, productId], (err) => {
      if (err) throw err;
      res.json({ message: "Produit mis à jour avec succès" });
    });
  });
};

exports.deleteProduct = (req, res) => {
  const productId = req.params.id;
  const adminId = req.user.id;

  // Vérifie que le produit appartient à l'admin
  db.query('SELECT * FROM products WHERE id = ?', [productId], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    if (result[0].user_id !== adminId) {
      return res.status(403).json({ message: "Vous n'êtes pas le créateur de ce produit" });
    }

    db.query('DELETE FROM products WHERE id = ?', [productId], (err) => {
      if (err) throw err;
      res.json({ message: "Produit supprimé avec succès" });
    });
  });
};

// 🔍 Filtrer par nom + tri alphabétique
exports.getProducts = (req, res) => {
  const { name, sort } = req.query;
  let sql = 'SELECT * FROM products';
  const params = [];

  if (name) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${name}%`);
  }

  // ✅ Ajoute le tri si demandé
  if (sort === 'asc') {
    sql += ' ORDER BY name ASC';
  } else if (sort === 'desc') {
    sql += ' ORDER BY name DESC';
  }

  db.query(sql, params, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
};
