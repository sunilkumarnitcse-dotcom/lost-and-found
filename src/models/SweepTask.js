// Campus Search-Sweep Tracker task.
// One task = one campus area to search for one lost item.
// MongoDB (Mongoose) when connected, in-memory Demo Mode otherwise.
const mongoose = require('mongoose');
const { isDemoMode } = require('../config/db');

const CAMPUS_AREAS = [
  'Library', 'Library Gate', 'Classroom Block', 'Canteen', 'Hostel',
  'Playground / Sports Ground', 'Parking Area', 'Auditorium',
  'Computer Lab', 'Main Gate'
];

let SweepTask;
if (isDemoMode()) {
  const { createMemoryModel } = require('../store/memory');
  SweepTask = createMemoryModel('SweepTask', {
    defaults: { status: 'Pending', assignedTo: '', outcome: '', updatedBy: '' },
    unique: [['item', 'area']]
  });
} else {
  const sweepTaskSchema = new mongoose.Schema({
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    referenceId: { type: String, required: true, index: true },
    area: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Pending', 'Checked', 'Found'], default: 'Pending' },
    assignedTo: { type: String, trim: true, default: '' },
    outcome: { type: String, trim: true, default: '', maxlength: 1000 },
    updatedBy: { type: String, trim: true, default: '' }
  }, { timestamps: true });
  sweepTaskSchema.index({ item: 1, area: 1 }, { unique: true });
  SweepTask = mongoose.model('SweepTask', sweepTaskSchema);
}

module.exports = { SweepTask, CAMPUS_AREAS };
