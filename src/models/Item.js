// ItemReport ADT (ADT document) as a Mongoose model.
// Operations in the ADT map to code like this:
//   validateItem       -> validateItem() in src/utils/validate.js
//   createItemReport   -> POST /api/items (routes/items.js)
//   getItemDetails     -> GET /api/items/:referenceId
//   searchItems        -> GET /api/items (with filters)
//   updateItemStatus   -> PATCH /api/staff/items/:referenceId/status
const mongoose = require('mongoose');

const STATUSES = ['Pending', 'Available', 'Claimed', 'Returned', 'Closed'];
const TYPES = ['lost', 'found'];

// Default categories from the SRS examples (ID cards, mobile phones,
// wallets, keys, books, bags). Admin can add more (FR-07).
const DEFAULT_CATEGORIES = [
  'ID Card',
  'Mobile Phone',
  'Wallet',
  'Keys',
  'Books',
  'Bag',
  'Other'
];

const itemSchema = new mongoose.Schema({
  // Unique reference ID, e.g. LF-2026-0001 (SRS FR-04).
  referenceId: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: TYPES, required: true }, // lost | found
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  location: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  // Optional photo: store only a reference (file name / URL), never the
  // image bytes in the database (SRS 3.5, Image Handling).
  photoRef: { type: String, trim: true, default: '' },
  // FR-11 statuses. New reports always start as Pending (FR-05).
  status: { type: String, enum: STATUSES, default: 'Pending', index: true },
  // Reporter contact details — PRIVATE. Never sent in public responses
  // (SRS NFR-04). Only Staff/Admin can see them.
  reporterName: { type: String, required: true, trim: true },
  reporterContact: { type: String, required: true, trim: true },
  // Search-Sweep Tracker (FR-17): last known location and approximate time.
  lastKnownLocation: { type: String, trim: true, default: '' },
  lastSeenAt: { type: Date, default: null }
}, { timestamps: true });

itemSchema.index({ title: 'text', description: 'text' });

/** Public view: everything except the reporter's private contact details. */
itemSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.reporterContact;
  return obj;
};

const Item = mongoose.model('Item', itemSchema);

module.exports = { Item, STATUSES, TYPES, DEFAULT_CATEGORIES };
