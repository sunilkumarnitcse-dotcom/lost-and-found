// Counter for unique reference IDs like LF-2026-0001.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

let Counter;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  Counter = createMemoryModel('Counter', { defaults: { seq: 0 } });
} else {
  const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  });
  Counter = mongoose.model('Counter', counterSchema);
}

/** Return the next number in the sequence for this year (1, 2, 3, ...). */
async function nextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

/** Build a reference ID like LF-2026-0001. */
async function nextReferenceId() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`item-${year}`);
  return `LF-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = { Counter, nextSequence, nextReferenceId };
