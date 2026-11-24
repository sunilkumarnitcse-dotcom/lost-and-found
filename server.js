// Smart Campus Lost & Found Management System
// Node.js + Express + MongoDB (Mongoose) — built from SRS / SDS / ADT.
//
// Flow (SRS 2.1, 3.1.3):  Browser -> Express REST API -> MongoDB.
// The frontend (public/) never talks to MongoDB directly.
//
// Start:
//   1. cp .env.example .env
//   2. Set MONGODB_URI in .env to your MongoDB Atlas connection string.
//   3. npm install
//   4. npm start   (opens http://localhost:3000)
//
// If MONGODB_URI is not set, the server exits with a clear error.
// It never falls back to another database.
require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectDB } = require('./src/config/db');
const { seed } = require('./src/seed');
const { Category } = require('./src/models/Category');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---- Public API ----
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/items', require('./src/routes/items'));
app.use('/api', require('./src/routes/claims')); // /api/items/:id/claims, /api/staff/claims
app.use('/api', require('./src/routes/sweep')); // /api/items/:id/sweep, /api/sweep/:id
app.use('/api/inquiries', require('./src/routes/inquiries'));
app.use('/api/admin', require('./src/routes/admin'));

// Public category list (for the report form dropdown).
app.get('/api/categories', async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  return res.json(categories);
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'lost-and-found' }));

// ---- Frontend (plain HTML / CSS / JS in public/) ----
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Error handler: friendly messages, never a stack trace to the user ----
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('\nERROR: Could not start the server.');
    console.error(err.message);
    console.error('Set MONGODB_URI in your .env file (see .env.example) and try again.\n');
    process.exit(1);
  }

  await seed();

  app.listen(PORT, () => {
    console.log(`Lost & Found server running at http://localhost:${PORT}`);
    console.log('Demo Staff PIN / Admin PIN are set in .env (STAFF_PIN / ADMIN_PIN).');
  });
}

// Only start when this file is run directly (so tests can require the app).
if (require.main === module) start();

module.exports = app;
