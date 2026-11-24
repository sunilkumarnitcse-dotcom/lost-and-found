// Staff / Admin login (SRS FR-08). PIN-based, demo only.
const express = require('express');
const { StaffAccount } = require('../models/StaffAccount');
const { createSession } = require('../middleware/auth');
const { logActivity } = require('../models/ActivityLog');

const router = express.Router();

// POST /api/auth/login  { pin } -> { token, name, role }
// The PIN is never returned, and staff PINs are never listed anywhere.
router.post('/login', async (req, res) => {
  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN is required.' });

  const account = await StaffAccount.findOne({ pin, active: true });
  if (!account) {
    return res.status(401).json({ error: 'Wrong PIN, or this account is deactivated.' });
  }

  const token = createSession(account);
  await logActivity('Staff login', {
    actorRole: account.role, actorName: account.name, details: `${account.role} logged in.`
  });
  return res.json({ token, name: account.name, role: account.role });
});

module.exports = router;
