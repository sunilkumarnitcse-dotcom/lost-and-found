// Campus Search-Sweep Tracker (SRS FR-17 to FR-20).
// Lost item -> checklist of campus areas to search.
// Staff (or a named volunteer) updates an area's status and outcome.
// The unique index on (item, area) blocks duplicate tasks (FR-20).
const express = require('express');
const { Item } = require('../models/Item');
const { SweepTask, CAMPUS_AREAS } = require('../models/SweepTask');
const { logActivity } = require('../models/ActivityLog');
const { requireStaff } = require('../middleware/auth');

const router = express.Router();

// GET /api/items/:referenceId/sweep — checklist + progress (staff only,
// because it can reveal where a lost item was last seen).
router.get('/items/:referenceId/sweep', requireStaff, async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  const tasks = await SweepTask.find({ item: item._id }).sort({ createdAt: 1 });
  const total = tasks.length;
  const done = tasks.filter((t) => t.status !== 'Pending').length;
  return res.json({
    item: {
      referenceId: item.referenceId, title: item.title,
      lastKnownLocation: item.lastKnownLocation, lastSeenAt: item.lastSeenAt
    },
    tasks,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
    suggestedAreas: CAMPUS_AREAS
  });
});

// POST /api/items/:referenceId/sweep — add one area to the checklist.
router.post('/items/:referenceId/sweep', requireStaff, async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  const { area, assignedTo } = req.body || {};
  if (!area || !area.trim()) return res.status(400).json({ error: 'Area name is required.' });

  try {
    const task = new SweepTask({
      item: item._id,
      referenceId: item.referenceId,
      area: area.trim(),
      assignedTo: (assignedTo || '').trim()
    });
    await task.save();
    return res.status(201).json(task);
  } catch (err) {
    // Duplicate (item, area) — the unique index fired (FR-20).
    if (err.code === 11000) {
      return res.status(400).json({ error: 'This area is already on the checklist for this item.' });
    }
    throw err;
  }
});

// PATCH /api/sweep/:id — update status / outcome (FR-19).
router.patch('/sweep/:id', requireStaff, async (req, res) => {
  const task = await SweepTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Sweep task not found.' });
  const { status, outcome, assignedTo, updatedBy } = req.body || {};
  if (status && !['Pending', 'Checked', 'Found'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Pending, Checked or Found.' });
  }
  if (status) task.status = status;
  if (outcome !== undefined) task.outcome = outcome;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;
  if (updatedBy) task.updatedBy = updatedBy;
  await task.save();

  await logActivity('Sweep task updated', {
    actorRole: req.user.role, actorName: req.user.name,
    referenceId: task.referenceId,
    details: `Area "${task.area}" -> ${task.status}.`
  });
  return res.json(task);
});

module.exports = router;
