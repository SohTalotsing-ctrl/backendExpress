
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
require('dotenv').config();
require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
const productRoutes = require('./routes/product');
app.use('/api/products', productRoutes);

const orderRoutes = require('./routes/order');
app.use('/api/orders', orderRoutes);

const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

