// Contact / inquiry message from a campus user.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

let Inquiry;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  Inquiry = createMemoryModel('Inquiry', { defaults: { status: 'Open' } });
} else {
  const inquirySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open', index: true }
  }, { timestamps: true });
  Inquiry = mongoose.model('Inquiry', inquirySchema);
}

module.exports = { Inquiry };
