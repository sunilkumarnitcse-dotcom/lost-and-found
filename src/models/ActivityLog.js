// Activity record (SRS FR-15): important admin actions and claim
// decisions are written here so the Admin dashboard can show them.
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true }, // e.g. "Claim approved"
  actorRole: { type: String, default: 'System' },
  actorName: { type: String, default: '' },
  referenceId: { type: String, default: '' }, // item LF-... ID, if any
  details: { type: String, default: '' }
}, { timestamps: true });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

/** Helper: write one log entry. Never throws — logging must not break the main action. */
async function logActivity(action, { actorRole = 'System', actorName = '', referenceId = '', details = '' } = {}) {
  try {
    await ActivityLog.create({ action, actorRole, actorName, referenceId, details });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
}

module.exports = { ActivityLog, logActivity };
