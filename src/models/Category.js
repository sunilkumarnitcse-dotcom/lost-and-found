// Item category, managed by Admin (SRS FR-07).
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = { Category };
