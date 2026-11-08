require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const port = Number(process.env.PORT) || 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL
    )
  `);
}

function readProduct(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const rawPrice = body?.price;
  const price =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string' && rawPrice.trim() !== ''
        ? Number(rawPrice)
        : Number.NaN;

  if (!name || !Number.isFinite(price)) {
    return null;
  }

  return { name, price };
}

const app = express();
app.use(express.json());

app.get('/api/products', async (_req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price FROM products ORDER BY id'
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price),
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (req, res, next) => {
  const product = readProduct(req.body);
  if (!product) {
    res.status(400).json({
      error: 'name is required and price must be a number',
    });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price',
      [product.name, product.price]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      price: Number(row.price),
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'internal server error' });
});

ensureSchema()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`backend listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
