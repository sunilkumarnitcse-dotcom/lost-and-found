// Staff / Admin account. DEMO ONLY: this project uses a simple PIN
// for login so it is easy to demo in college. A real system must
// store properly hashed passwords and must never store a PIN in
// plain text. Change the PINs with STAFF_PIN / ADMIN_PIN in .env.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

let StaffAccount;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  StaffAccount = createMemoryModel('StaffAccount', { defaults: { active: true } });
} else {
  const staffAccountSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['Staff', 'Admin'], required: true },
    pin: { type: String, required: true },
    active: { type: Boolean, default: true }
  }, { timestamps: true });
  staffAccountSchema.index({ role: 1, name: 1 });
  StaffAccount = mongoose.model('StaffAccount', staffAccountSchema);
}

module.exports = { StaffAccount };
