// Ownership claim.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

let Claim;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  Claim = createMemoryModel('Claim', {
    defaults: { status: 'Pending', decidedBy: '', decidedAt: null }
  });
} else {
  const claimSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    referenceId: { type: String, required: true, index: true },
    claimantName: { type: String, required: true, trim: true },
    claimantContact: { type: String, required: true, trim: true },
    evidence: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    decidedBy: { type: String, default: '' },
    decidedAt: { type: Date, default: null }
  }, { timestamps: true });
  Claim = mongoose.model('Claim', claimSchema);
}

module.exports = { Claim };
