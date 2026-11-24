// Ownership claims (SRS FR-09, FR-10, FR-13).
// Public: submit a claim for an Available found item.
// Staff: list claims (with private evidence), approve / reject.
// Approving a claim returns the item (status Returned) and auto-rejects
// every other pending claim for that item — so one item can never be
// returned to more than one claimant (FR-13, NFR-08).
const express = require('express');
const { Item } = require('../models/Item');
const { Claim } = require('../models/Claim');
const { logActivity } = require('../models/ActivityLog');
const { requireStaff } = require('../middleware/auth');

const router = express.Router();

// POST /api/items/:referenceId/claims — submit a claim (FR-09).
router.post('/items/:referenceId/claims', async (req, res) => {
  const item = await Item.findOne({ referenceId: req.params.referenceId });
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  if (item.type !== 'found') {
    return res.status(400).json({ error: 'Claims can only be made for found items.' });
  }
  if (item.status !== 'Available') {
    return res.status(400).json({ error: 'This item is not available for claiming right now.' });
  }

  const { claimantName, claimantContact, evidence } = req.body || {};
  if (!claimantName || !claimantName.trim()) return res.status(400).json({ error: 'Your name is required.' });
  if (!claimantContact || !claimantContact.trim()) return res.status(400).json({ error: 'Your contact details are required.' });
  if (!evidence || !evidence.trim()) return res.status(400).json({ error: 'Ownership evidence is required.' });

  const claim = new Claim({
    item: item._id,
    referenceId: item.referenceId,
    claimantName: claimantName.trim(),
    claimantContact: claimantContact.trim(),
    evidence: evidence.trim()
  });
  await claim.save();

  // The item is now Claimed (waiting for staff review).
  item.status = 'Claimed';
  await item.save();

  await logActivity('Claim submitted', {
    referenceId: item.referenceId,
    details: `Claim by ${claimantName.trim()} for "${item.title}".`
  });
  // Never send the private evidence/contact back in a public response.
  return res.status(201).json({ ok: true, claimId: claim._id, status: claim.status });
});

// GET /api/staff/claims — all claims, pending first (staff only).
router.get('/staff/claims', requireStaff, async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const claims = await Claim.find(filter).sort({ createdAt: -1 }).limit(200).populate('item', 'referenceId title category location status');
  return res.json(claims);
});

// PATCH /api/staff/claims/:id/decision — approve / reject (FR-10).
router.patch('/staff/claims/:id/decision', requireStaff, async (req, res) => {
  const { decision } = req.body || {}; // "Approved" or "Rejected"
  if (!['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
  }
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found.' });
  if (claim.status !== 'Pending') {
    return res.status(400).json({ error: `This claim was already ${claim.status}.` });
  }

  const item = await Item.findById(claim.item);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  if (decision === 'Approved') {
    // FR-13 safety check: if the item is already Returned, refuse.
    if (item.status === 'Returned') {
      return res.status(400).json({ error: 'This item was already returned to someone else.' });
    }
    claim.status = 'Approved';
    claim.decidedBy = req.user.name;
    claim.decidedAt = new Date();
    await claim.save();

    item.status = 'Returned';
    await item.save();

    // Auto-reject every other pending claim for this item.
    await Claim.updateMany(
      { item: item._id, status: 'Pending', _id: { $ne: claim._id } },
      { $set: { status: 'Rejected', decidedBy: req.user.name, decidedAt: new Date() } }
    );

    await logActivity('Claim approved — item returned', {
      actorRole: req.user.role, actorName: req.user.name,
      referenceId: item.referenceId,
      details: `"${item.title}" returned to ${claim.claimantName}. Other pending claims auto-rejected.`
    });
  } else {
    claim.status = 'Rejected';
    claim.decidedBy = req.user.name;
    claim.decidedAt = new Date();
    await claim.save();

    // If no other pending claim is left, the item becomes Available again.
    const stillPending = await Claim.countDocuments({ item: item._id, status: 'Pending' });
    if (stillPending === 0 && item.status === 'Claimed') {
      item.status = 'Available';
      await item.save();
    }

    await logActivity('Claim rejected', {
      actorRole: req.user.role, actorName: req.user.name,
      referenceId: item.referenceId, details: `Claim by ${claim.claimantName} rejected.`
    });
  }

  return res.json(claim);
});

module.exports = router;
