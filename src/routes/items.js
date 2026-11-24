// ItemReport ADT routes.
// Public: report, search approved found items, view details, possible matches.
// Staff/Admin: view all reports (with private contact), edit, change
// status, delete. Privacy (NFR-04): public responses never include
// reporterContact or claim evidence.
const express = require('express');
const { Item, STATUSES } = require('../models/Item');
const { Claim } = require('../models/Claim');
const { nextReferenceId } = require('../models/Counter');
const { validateItem } = require('../utils/validate');
const { findPossibleMatches } = require('../utils/matching');
const { logActivity } = require('../models/ActivityLog');
const { requireStaff } = require('../middleware/auth');

const router = express.Router();

function publicItem(item) {
  return item.toPublicJSON();
}

// ---- Public ----

// POST /api/items — createItemReport (FR-03, FR-04).
// New reports always start as Pending (FR-05).
router.post('/', async (req, res) => {
  const { valid, errors } = validateItem(req.body || {});
  if (!valid) return res.status(400).json({ error: errors.join(' ') });

  const item = new Item({
    referenceId: await nextReferenceId(),
    type: req.body.type,
    title: req.body.title.trim(),
    category: req.body.category.trim(),
    description: req.body.description.trim(),
    location: req.body.location.trim(),
    date: new Date(req.body.date),
    photoRef: (req.body.photoRef || '').trim(),
    reporterName: req.body.reporterName.trim(),
    reporterContact: req.body.reporterContact.trim(),
    lastKnownLocation: (req.body.lastKnownLocation || '').trim(),
    lastSeenAt: req.body.lastSeenAt ? new Date(req.body.lastSeenAt) : null,
    status: 'Pending'
  });
  await item.save();
  await logActivity('Report submitted', {
    referenceId: item.referenceId,
    details: `${item.type === 'lost' ? 'Lost' : 'Found'} item "${item.title}" reported.`
  });
  return res.status(201).json(publicItem(item));
});

// GET /api/items — searchItems (FR-01, FR-02).
// Public board shows APPROVED found items only (status Available).
// Query: ?q=keyword&category=&date=YYYY-MM-DD&location=&type=found&status=
// The public status filter is ignored for safety — only Available is shown.
router.get('/', async (req, res) => {
  const { q, category, date, location, type } = req.query;
  const filter = { type: type === 'lost' ? 'lost' : 'found', status: 'Available' };
  if (category) filter.category = category;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (date) {
    const day = new Date(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    filter.date = { $gte: day, $lt: next };
  }
  if (q) filter.$text = { $search: q };

  const items = await Item.find(filter).sort({ createdAt: -1 }).limit(100);
  return res.json(items.map(publicItem));
});

// GET /api/items/:referenceId — getItemDetails (public, approved only).
router.get('/:referenceId', async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item || item.status === 'Pending') {
    return res.status(404).json({ error: 'Item not found.' });
  }
  return res.json(publicItem(item));
});

// GET /api/items/:referenceId/matches — possible matches (FR-12).
// Suggestion only, never proof of ownership.
router.get('/:referenceId/matches', async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item || item.status === 'Pending') {
    return res.status(404).json({ error: 'Item not found.' });
  }
  const candidates = await Item.find({ status: 'Available' }).sort({ createdAt: -1 }).limit(200);
  const matches = findPossibleMatches(item, candidates).map((m) => ({
    item: publicItem(m.item),
    score: m.score,
    reasons: m.reasons
  }));
  return res.json({ item: publicItem(item), matches });
});

// ---- Staff / Admin ----

// GET /api/staff/items — all reports, including Pending and private contact.
router.get('/staff/all', requireStaff, async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && STATUSES.includes(status)) filter.status = status;
  const items = await Item.find(filter).sort({ createdAt: -1 }).limit(200);
  return res.json(items);
});

// GET /api/staff/items/:referenceId — full details, private contact included.
router.get('/staff/:referenceId', requireStaff, async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  const claims = await Claim.find({ item: item._id }).sort({ createdAt: -1 });
  return res.json({ item, claims });
});

// PATCH /api/staff/items/:referenceId/status — updateItemStatus (FR-06, FR-11).
// Approving a Pending report makes it Available on the public board.
router.patch('/staff/:referenceId/status', requireStaff, async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}.` });
  }
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  // FR-13: a Returned item can never be returned again.
  if (item.status === 'Returned' && status !== 'Closed') {
    return res.status(400).json({ error: 'This item was already returned. It cannot be returned again.' });
  }
  const old = item.status;
  item.status = status;
  await item.save();
  await logActivity('Item status changed', {
    actorRole: req.user.role, actorName: req.user.name,
    referenceId: item.referenceId, details: `${old} -> ${status}.`
  });
  return res.json(item);
});

// PATCH /api/staff/items/:referenceId — edit an item record (FR-06).
router.patch('/staff/:referenceId', requireStaff, async (req, res) => {
  const allowed = ['title', 'category', 'description', 'location', 'date', 'photoRef', 'lastKnownLocation'];
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  for (const key of allowed) {
    if (req.body[key] !== undefined) item[key] = req.body[key];
  }
  await item.save();
  await logActivity('Item record updated', {
    actorRole: req.user.role, actorName: req.user.name, referenceId: item.referenceId
  });
  return res.json(item);
});

// DELETE /api/staff/items/:referenceId — delete a report and its claims.
router.delete('/staff/:referenceId', requireStaff, async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  await Claim.deleteMany({ item: item._id });
  await Item.deleteOne({ _id: item._id });
  await logActivity('Item report deleted', {
    actorRole: req.user.role, actorName: req.user.name,
    referenceId: item.referenceId, details: `"${item.title}" deleted.`
  });
  return res.json({ ok: true });
});

module.exports = router;
