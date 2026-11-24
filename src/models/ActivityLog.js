// Activity record: important admin actions and claim decisions
// are written here so the Admin dashboard can show them.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

let ActivityLog;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  ActivityLog = createMemoryModel('ActivityLog', {
    defaults: { actorRole: 'System', actorName: '', referenceId: '', details: '' }
  });
} else {
  const activityLogSchema = new mongoose.Schema({
    action: { type: String, required: true, trim: true },
    actorRole: { type: String, default: 'System' },
    actorName: { type: String, default: '' },
    referenceId: { type: String, default: '' },
    details: { type: String, default: '' }
  }, { timestamps: true });
  ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
}

/** Helper: write one log entry. Never throws — logging must not break the main action. */
async function logActivity(action, { actorRole = 'System', actorName = '', referenceId = '', details = '' } = {}) {
  try {
    await ActivityLog.create({ action, actorRole, actorName, referenceId, details });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
}

module.exports = { ActivityLog, logActivity };
