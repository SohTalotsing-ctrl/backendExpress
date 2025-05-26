const db = require('../config/db');

// ➕ Ajouter un produit au panier
exports.addToCart = (req, res) => {

  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
  return res.status(400).json({ message: 'productId et quantity sont requis' });
}

const userId = req.user.id;
  // Vérifie si le panier existe pour cet utilisateur
  db.query('SELECT * FROM cart WHERE user_id = ?', [userId], (err, result) => {
    if (err) throw err;

    let cartId;

    if (result.length > 0) {
      cartId = result[0].id;
      addOrUpdateProduct(cartId);
    } else {
      // Crée un nouveau panier si besoin
      db.query('INSERT INTO cart (user_id) VALUES (?)', [userId], (err, result) => {
        if (err) throw err;
        cartId = result.insertId;
        addOrUpdateProduct(cartId);
      });
    }

    // Gère l'ajout ou la mise à jour du produit dans le panier
    function addOrUpdateProduct(cartId) {
      db.query(
        'SELECT * FROM cartProducts WHERE cart_id = ? AND product_id = ?',
        [cartId, productId],
        (err, result) => {
          if (err) throw err;

          if (result.length > 0) {
            // Met à jour la quantité si déjà présent
            db.query(
              'UPDATE cartProducts SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?',
              [quantity, cartId, productId],
              (err) => {
                if (err) throw err;
                res.json({ message: 'Quantité mise à jour dans le panier' });
              }
            );
          } else {
            // Insère un nouvel article dans le panier
            db.query(
              'INSERT INTO cartProducts (cart_id, product_id, quantity) VALUES (?, ?, ?)',
              [cartId, productId, quantity],
              (err) => {
                if (err) throw err;
                res.json({ message: 'Produit ajouté au panier' });
              }
            );
          }
        }
      );
    }
  });
};

// 📦 Voir les produits du panier
exports.getCart = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      cp.id,
      p.name,
      p.price,
      p.imageUrl,
      cp.quantity,
      (cp.quantity * p.price) AS total
    FROM cart c
    JOIN cartProducts cp ON cp.cart_id = c.id
    JOIN products p ON cp.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
};

// ❌ Supprimer un article du panier
exports.removeFromCart = (req, res) => {
  const userId = req.user.id;
  const cartProductId = req.params.id;

  const sql = `
    DELETE cp FROM cartProducts cp
    JOIN cart c ON cp.cart_id = c.id
    WHERE cp.id = ? AND c.user_id = ?
  `;

  db.query(sql, [cartProductId, userId], (err) => {
    if (err) throw err;
    res.json({ message: 'Produit supprimé du panier' });
  });
};
