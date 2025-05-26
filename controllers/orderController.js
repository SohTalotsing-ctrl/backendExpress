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

// 💳 Marquer une commande comme payée (utilisateur connecté)
exports.payOrder = (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;

  // Vérifie que la commande appartient à l'utilisateur
  db.query(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
    (err, result) => {
      if (err) throw err;

      if (result.length === 0) {
        return res.status(403).json({ message: "Commande introuvable ou non autorisée" });
      }

      // Mise à jour : passer à payé
      db.query(
        'UPDATE orders SET is_paid = true WHERE id = ?',
        [orderId],
        (err) => {
          if (err) throw err;
          res.json({ message: "Commande payée avec succès", order_id: orderId });
        }
      );
    }
  );
};

// 💳 Vue ADMIN – Voir les commandes payées uniquement
exports.getPaidOrders = (req, res) => {
  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at AS order_date,
      o.total,
      o.status,
      o.is_paid,
      u.name AS user_name,
      u.email AS user_email,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN orderItems oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.is_paid = true
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) throw err;

    const orders = {};

    results.forEach(row => {
      if (!orders[row.order_id]) {
        orders[row.order_id] = {
          order_id: row.order_id,
          order_date: row.order_date,
          total: row.total,
          status: row.status,
          is_paid: row.is_paid,
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

// 💳 Vue ADMIN – Voir les commandes non payées
exports.getUnpaidOrders = (req, res) => {
  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at AS order_date,
      o.total,
      o.status,
      o.is_paid,
      u.name AS user_name,
      u.email AS user_email,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN orderItems oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.is_paid = false
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) throw err;

    const orders = {};

    results.forEach(row => {
      if (!orders[row.order_id]) {
        orders[row.order_id] = {
          order_id: row.order_id,
          order_date: row.order_date,
          total: row.total,
          status: row.status,
          is_paid: row.is_paid,
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

// 📊 Vue ADMIN – Statistiques globales des commandes
exports.getOrderStats = (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) AS total_orders,
      SUM(CASE WHEN is_paid = true THEN 1 ELSE 0 END) AS paid_orders,
      SUM(CASE WHEN is_paid = false THEN 1 ELSE 0 END) AS unpaid_orders,
      SUM(CASE WHEN is_paid = true THEN total ELSE 0 END) AS total_revenue,
      ROUND(
        CASE 
          WHEN SUM(CASE WHEN is_paid = true THEN 1 ELSE 0 END) = 0 
          THEN 0 
          ELSE SUM(CASE WHEN is_paid = true THEN total ELSE 0 END) /
               SUM(CASE WHEN is_paid = true THEN 1 ELSE 0 END)
        END,
        2
      ) AS average_order_paid
    FROM orders
  `;

  db.query(sql, (err, results) => {
    if (err) throw err;
    res.json(results[0]); // Un seul objet retourné
  });
};

