// Contact / inquiry form (SRS FR-16).
// Public: send an inquiry. Staff: list them and mark them resolved.
// Contact details are private — staff only.
const express = require('express');
const { Inquiry } = require('../models/Inquiry');
const { requireStaff } = require('../middleware/auth');

const router = express.Router();

// POST /api/inquiries — send a message to management.
router.post('/', async (req, res) => {
  const { name, contact, message } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Your name is required.' });
  if (!contact || !contact.trim()) return res.status(400).json({ error: 'Your contact details are required.' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' });

  const inquiry = new Inquiry({ name: name.trim(), contact: contact.trim(), message: message.trim() });
  await inquiry.save();
  return res.status(201).json({ ok: true });
});

// GET /api/staff/inquiries — list inquiries (staff only).
router.get('/staff/all', requireStaff, async (req, res) => {
  const inquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(200);
  return res.json(inquiries);
});

// PATCH /api/staff/inquiries/:id/resolve — mark Open / Resolved.
router.patch('/staff/:id/resolve', requireStaff, async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
  inquiry.status = inquiry.status === 'Open' ? 'Resolved' : 'Open';
  await inquiry.save();
  return res.json(inquiry);
});

module.exports = router;
