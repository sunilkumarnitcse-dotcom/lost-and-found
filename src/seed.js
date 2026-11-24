// First-run seed: default categories and demo Staff/Admin accounts.
// Runs on every start, but only inserts when the collections are empty,
// so it never overwrites Sunil's real data.
const { Category } = require('./models/Category');
const { StaffAccount } = require('./models/StaffAccount');
const { DEFAULT_CATEGORIES } = require('./models/Item');

async function seed() {
  const categoryCount = await Category.countDocuments();
  if (categoryCount === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES.map((name) => ({ name })));
    console.log('Seeded categories:', DEFAULT_CATEGORIES.join(', '));
  }

  const staffCount = await StaffAccount.countDocuments();
  if (staffCount === 0) {
    // Demo PINs only — change them in .env (STAFF_PIN / ADMIN_PIN).
    // See StaffAccount.js: a real system must use hashed passwords.
    await StaffAccount.insertMany([
      { name: 'Admin', role: 'Admin', pin: process.env.ADMIN_PIN || 'admin123', active: true },
      { name: 'Staff', role: 'Staff', pin: process.env.STAFF_PIN || 'staff123', active: true }
    ]);
    console.log('Seeded demo Staff/Admin accounts (change the demo PINs in .env).');
  }
}

module.exports = { seed };
