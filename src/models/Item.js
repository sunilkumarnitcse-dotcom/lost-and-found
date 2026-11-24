// ItemReport ADT as a model.
// MongoDB (Mongoose) when MONGODB_URI is set, in-memory Demo Mode
// model when it is not — same API, so routes work unchanged either way.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

const STATUSES = ['Pending', 'Available', 'Claimed', 'Returned', 'Closed'];
const TYPES = ['lost', 'found'];
const DEFAULT_CATEGORIES = ['ID Card', 'Mobile Phone', 'Wallet', 'Keys', 'Books', 'Bag', 'Other'];

let Item;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  Item = createMemoryModel('Item', {
    defaults: { status: 'Pending', photoRef: '', lastKnownLocation: '', lastSeenAt: null },
    methods: {
      toPublicJSON() {
        const obj = this.toObject();
        delete obj.reporterContact;
        return obj;
      }
    }
  });
} else {
  const itemSchema = new mongoose.Schema({
    referenceId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    photoRef: { type: String, trim: true, default: '' },
    status: { type: String, enum: STATUSES, default: 'Pending', index: true },
    reporterName: { type: String, required: true, trim: true },
    reporterContact: { type: String, required: true, trim: true },
    lastKnownLocation: { type: String, trim: true, default: '' },
    lastSeenAt: { type: Date, default: null }
  }, { timestamps: true });
  itemSchema.index({ title: 'text', description: 'text' });
  itemSchema.methods.toPublicJSON = function () {
    const obj = this.toObject();
    delete obj.reporterContact;
    return obj;
  };
  Item = mongoose.model('Item', itemSchema);
}

module.exports = { Item, STATUSES, TYPES, DEFAULT_CATEGORIES };
