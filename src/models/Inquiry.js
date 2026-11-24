// Contact / inquiry message from a campus user (SRS FR-16).
// Contact details are private — staff/admin only (NFR-04).
const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true }, // private
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['Open', 'Resolved'], default: 'Open', index: true }
}, { timestamps: true });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = { Inquiry };
