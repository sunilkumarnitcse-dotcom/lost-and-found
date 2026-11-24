// Ownership claim (SRS FR-09, FR-10, FR-13).
// A claim is a request to prove ownership of a found item.
// Claimant contact and evidence are PRIVATE — staff/admin only (NFR-04).
const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  referenceId: { type: String, required: true, index: true }, // item's LF-... ID
  claimantName: { type: String, required: true, trim: true },
  claimantContact: { type: String, required: true, trim: true }, // private
  evidence: { type: String, required: true, trim: true, maxlength: 2000 }, // private
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  decidedBy: { type: String, default: '' },
  decidedAt: { type: Date, default: null }
}, { timestamps: true });

// One pending claim per person per item is enough; duplicates are
// rejected in the route. No unique index here, so a person can re-claim
// after a rejection if staff ask them to.
const Claim = mongoose.model('Claim', claimSchema);

module.exports = { Claim };
