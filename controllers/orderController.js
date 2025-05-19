const db = require('../config/db');

exports.createOrder = (req, res) => {
  const userId = req.user.id;

  // 1. Vérifie si l'utilisateur a un panier
  const cartQuery = `
    SELECT 
      cp.product_id, cp.quantity, p.price
    FROM cartProducts cp
    JOIN cart c ON cp.cart_id = c.id
    JOIN products p ON cp.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.query(cartQuery, [userId], (err, cartItems) => {
    if (err) throw err;
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Panier vide' });
    }

    // 2. Calcul du total
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 3. Création de la commande
    db.query('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total], (err, result) => {
      if (err) throw err;
      const orderId = result.insertId;

      // 4. Préparation des lignes de commande
      const itemsData = cartItems.map(item => [orderId, item.product_id, item.quantity, item.price]);

      db.query(
        'INSERT INTO orderItems (order_id, product_id, quantity, price) VALUES ?',
        [itemsData],
        (err) => {
          if (err) throw err;

          // 5. Optionnel : vider le panier après validation
          db.query(`
            DELETE cp FROM cartProducts cp
            JOIN cart c ON cp.cart_id = c.id
            WHERE c.user_id = ?
          `, [userId], () => {
            res.json({ message: 'Commande créée avec succès', order_id: orderId, total });
          });
        }
      );
    });
  });
};

// 📜 Récupérer l'historique des commandes de l'utilisateur connecté
exports.getOrderHistory = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at AS order_date,
      o.total,
      o.status,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN orderItems oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) throw err;

    // 🧠 Organiser les résultats par commande
    const orders = {};

    results.forEach(row => {
      if (!orders[row.order_id]) {
        orders[row.order_id] = {
          order_id: row.order_id,
          order_date: row.order_date,
          total: row.total,
          status: row.status,
          items: []
        };
      }

      orders[row.order_id].items.push({
        product: row.product_name,
        quantity: row.quantity,
        price: row.price
      });
    });

    res.json(Object.values(orders)); // ✅ tableau des commandes
  });
};

// 🔐 Vue ADMIN – Liste de toutes les commandes avec détails
exports.getAllOrders = (req, res) => {
  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at AS order_date,
      o.total,
      o.status,
      u.name AS user_name,
      u.email AS user_email,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN orderItems oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) throw err;

    // 📦 Structurer les commandes avec leurs produits
    const orders = {};

    results.forEach(row => {
      if (!orders[row.order_id]) {
        orders[row.order_id] = {
          order_id: row.order_id,
          order_date: row.order_date,
          total: row.total,
          status: row.status,
          user: {
            name: row.user_name,
            email: row.user_email
          },
          items: []
        };
      }

      orders[row.order_id].items.push({
        product: row.product_name,
        quantity: row.quantity,
        price: row.price
      });
    });

    res.json(Object.values(orders));
  });
};
// 🔄 Mise à jour du statut d'une commande (admin uniquement)
exports.updateOrderStatus = (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  // ✅ Vérification : statut valide
  const allowedStatuses = ['en_attente', 'validee', 'livree'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }

  // 🛠️ Mise à jour SQL
  db.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    (err, result) => {
      if (err) throw err;

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Commande introuvable' });
      }

      res.json({ message: `Statut de la commande ${orderId} mis à jour en "${status}"` });
    }
  );
};
// 🔍 Voir une commande spécifique (utilisateur connecté)
exports.getOrderById = (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;

  // On récupère la commande, ses articles et ses produits
  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at AS order_date,
      o.total,
      o.status,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN orderItems oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ? AND o.id = ?
  `;

  db.query(sql, [userId, orderId], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(404).json({ message: 'Commande introuvable ou non autorisée' });
    }

    const order = {
      order_id: results[0].order_id,
      order_date: results[0].order_date,
      total: results[0].total,
      status: results[0].status,
      items: []
    };

    results.forEach(row => {
      order.items.push({
        product: row.product_name,
        quantity: row.quantity,
        price: row.price
      });
    });

    res.json(order);
  });
  
};
// 👁️‍🗨️ Vue ADMIN – Voir une commande par ID, avec détails utilisateur
exports.getOrderByIdAdmin = (req, res) => {
  const orderId = req.params.id;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at AS order_date,
      o.total,
      o.status,
      u.name AS user_name,
      u.email AS user_email,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN orderItems oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.id = ?
  `;

  db.query(sql, [orderId], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(404).json({ message: 'Commande introuvable' });
    }

    const order = {
      order_id: results[0].order_id,
      order_date: results[0].order_date,
      total: results[0].total,
      status: results[0].status,
      user: {
        name: results[0].user_name,
        email: results[0].user_email
      },
      items: []
    };

    results.forEach(row => {
      order.items.push({
        product: row.product_name,
        quantity: row.quantity,
        price: row.price
      });
    });

    res.json(order);
  });
  

};
