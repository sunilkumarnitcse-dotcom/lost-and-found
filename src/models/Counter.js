// Counter for unique reference IDs like LF-2026-0001 (SRS FR-04).
// One document per year, incremented atomically so two reports can
// never get the same reference ID.
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "item-2026"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

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
