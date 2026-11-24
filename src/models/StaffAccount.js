// Staff / Admin account (SRS FR-07, FR-08).
// DEMO ONLY: this project uses a simple PIN for login so it is easy to
// demo in college. A real system must store properly hashed passwords
// (SRS NFR-03) and must never store a PIN in plain text.
// Change the PINs with STAFF_PIN / ADMIN_PIN in .env before any real use.
const mongoose = require('mongoose');

const staffAccountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['Staff', 'Admin'], required: true },
  pin: { type: String, required: true }, // demo only — see note above
  active: { type: Boolean, default: true }
}, { timestamps: true });

staffAccountSchema.index({ role: 1, name: 1 });

const StaffAccount = mongoose.model('StaffAccount', staffAccountSchema);

module.exports = { StaffAccount };
