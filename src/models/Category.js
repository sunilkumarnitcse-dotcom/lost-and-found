// Item category, managed by Admin.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

let Category;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  Category = createMemoryModel('Category', { unique: [['name']] });
} else {
  const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true }
  }, { timestamps: true });
  Category = mongoose.model('Category', categorySchema);
}

module.exports = { Category };
