// MongoDB connection — the ONLY place the database is accessed from.
// The frontend never talks to MongoDB directly.
// Connection string comes ONLY from the MONGODB_URI environment variable.
//
// Demo Mode: when MONGODB_URI is not set (or still has placeholders),
// the server does NOT fail. It runs with the in-memory store in
// src/store/memory.js instead, so the login and the full demo work
// without a database. Data in Demo Mode lives only in memory and
// resets on restart — set a real MONGODB_URI for persistent MongoDB.
const mongoose = require('mongoose');

function isDemoMode() {
  const uri = process.env.MONGODB_URI;
  return !uri || !uri.trim() || uri.includes('<user>') || uri.includes('<password>') || uri.includes('<cluster>');
}

async function connectDB() {
  if (isDemoMode()) {
    console.log('Demo Mode: MONGODB_URI is not set — running with in-memory data (resets on restart).');
    console.log('Set MONGODB_URI to a MongoDB Atlas connection string for persistent storage.');
    return false;
  }

  // Fail fast if the cluster cannot be reached (5 seconds), so a bad
  // connection string is reported clearly instead of hanging.
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');
  return true;
}

module.exports = { connectDB, isDemoMode };
