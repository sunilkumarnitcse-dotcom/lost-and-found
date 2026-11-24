// MongoDB connection — the ONLY place the database is accessed from.
// The frontend never talks to MongoDB directly (SRS 3.1.3).
// Connection string comes ONLY from the MONGODB_URI environment variable.
// There is deliberately NO fallback database: if it is not set, the
// server must fail with a clear message instead of silently using
// another database.
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env and set ' +
      'MONGODB_URI to your MongoDB Atlas connection string ' +
      '(mongodb+srv://<user>:<password>@<cluster>/lostfound). ' +
      'The server will not start without a database.'
    );
  }

  if (uri.includes('<user>') || uri.includes('<password>') || uri.includes('<cluster>')) {
    throw new Error(
      'MONGODB_URI still contains placeholder values (<user>, <password> or <cluster>). ' +
      'Replace them with your real MongoDB Atlas username, password and cluster name in .env.'
    );
  }

  // Fail fast if the cluster cannot be reached (5 seconds), so a bad
  // connection string is reported clearly instead of hanging.
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');
}

module.exports = { connectDB };
