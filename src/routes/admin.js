// Admin dashboard and management (SRS FR-07, FR-14, FR-15).
// Admin only. PINs are NEVER returned in any response.
const express = require('express');
const { Item } = require('../models/Item');
const { Claim } = require('../models/Claim');
const { Category } = require('../models/Category');
const { StaffAccount } = require('../models/StaffAccount');
const { ActivityLog, logActivity } = require('../models/ActivityLog');
const { Inquiry } = require('../models/Inquiry');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/dashboard — summary counts, pending work, activity (FR-14).
router.get('/dashboard', requireAdmin, async (req, res) => {
  const [
    totalItems, pendingReports, availableItems, returnedItems,
    totalClaims, pendingClaims, openInquiries
  ] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ status: 'Pending' }),
    Item.countDocuments({ status: 'Available' }),
    Item.countDocuments({ status: 'Returned' }),
    Claim.countDocuments(),
    Claim.countDocuments({ status: 'Pending' }),
    Inquiry.countDocuments({ status: 'Open' })
  ]);

  const recentActivity = await ActivityLog.find().sort({ createdAt: -1 }).limit(20);
  const pendingItems = await Item.find({ status: 'Pending' }).sort({ createdAt: -1 }).limit(10);
  const pendingClaimList = await Claim.find({ status: 'Pending' }).sort({ createdAt: -1 }).limit(10);

  return res.json({
    counts: {
      totalItems, pendingReports, availableItems, returnedItems,
      totalClaims, pendingClaims, openInquiries
    },
    recentActivity,
    pendingItems: pendingItems.map((i) => i.toPublicJSON()),
    pendingClaims: pendingClaimList
  });
});

// GET /api/admin/activity — full activity log (FR-15).
router.get('/activity', requireAdmin, async (req, res) => {
  const log = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
  return res.json(log);
});

// ---- Categories (FR-07) ----
router.get('/categories', requireAdmin, async (req, res) => {
  return res.json(await Category.find().sort({ name: 1 }));
});

router.post('/categories', requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const category = await Category.create({ name: name.trim() });
    return res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'This category already exists.' });
    throw err;
  }
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  return res.json({ ok: true });
});

// ---- Staff accounts (FR-07) ----
// PINs are never sent back. When creating an account, the PIN is in the
// request only; the response returns name/role/active only.
function safeAccount(a) {
  return { _id: a._id, name: a.name, role: a.role, active: a.active, createdAt: a.createdAt };
}

router.get('/staff-accounts', requireAdmin, async (req, res) => {
  const accounts = await StaffAccount.find().sort({ role: 1, name: 1 });
  return res.json(accounts.map(safeAccount));
});

router.post('/staff-accounts', requireAdmin, async (req, res) => {
  const { name, role, pin } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!['Staff', 'Admin'].includes(role)) return res.status(400).json({ error: 'Role must be Staff or Admin.' });
  if (!pin || String(pin).length < 4) return res.status(400).json({ error: 'PIN must be at least 4 characters.' });

  const account = await StaffAccount.create({ name: name.trim(), role, pin });
  await logActivity('Staff account created', {
    actorRole: req.user.role, actorName: req.user.name, details: `${role} account "${name.trim()}" created.`
  });
  return res.status(201).json(safeAccount(account));
});

router.patch('/staff-accounts/:id/active', requireAdmin, async (req, res) => {
  const account = await StaffAccount.findById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  account.active = !account.active;
  await account.save();
  return res.json(safeAccount(account));
});

module.exports = router;
