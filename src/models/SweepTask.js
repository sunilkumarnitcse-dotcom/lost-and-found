// Campus Search-Sweep Tracker task (SRS FR-17 to FR-20).
// One task = one campus area to search for one lost item.
// The compound unique index on (item, area) is what prevents a
// duplicate search task for the same item and area (FR-20).
const mongoose = require('mongoose');

const sweepTaskSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  referenceId: { type: String, required: true, index: true }, // item's LF-... ID
  area: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Checked', 'Found'],
    default: 'Pending'
  },
  assignedTo: { type: String, trim: true, default: '' }, // staff / volunteer name
  outcome: { type: String, trim: true, default: '', maxlength: 1000 },
  updatedBy: { type: String, trim: true, default: '' }
}, { timestamps: true });

sweepTaskSchema.index({ item: 1, area: 1 }, { unique: true });

const SweepTask = mongoose.model('SweepTask', sweepTaskSchema);

// Suggested campus areas for the checklist (FR-18). Admin/staff can
// add any other area name when creating a task.
const CAMPUS_AREAS = [
  'Library',
  'Library Gate',
  'Classroom Block',
  'Canteen',
  'Hostel',
  'Playground / Sports Ground',
  'Parking Area',
  'Auditorium',
  'Computer Lab',
  'Main Gate'
];

module.exports = { SweepTask, CAMPUS_AREAS };
