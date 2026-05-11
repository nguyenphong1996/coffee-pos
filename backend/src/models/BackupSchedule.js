import mongoose from 'mongoose';

const backupScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  frequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true,
  },
  timeOfDay: { type: String, default: '02:00' }, // HH:mm format
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday, for weekly
  dayOfMonth: { type: Number, min: 1, max: 28 }, // for monthly
  retentionCount: { type: Number, default: 10, min: 1, max: 100 },
  destination: {
    type: String,
    enum: ['google_drive', 'local'],
    default: 'google_drive',
  },
  googleDriveFolderId: { type: String, default: null },
  googleDriveAccessToken: { type: String, default: null },
  googleDriveRefreshToken: { type: String, default: null },
  googleDriveTokenExpiry: { type: Date, default: null },
  lastBackupAt: { type: Date, default: null },
  lastBackupStatus: {
    type: String,
    enum: ['success', 'failed', 'pending', null],
    default: null,
  },
  lastBackupError: { type: String, default: null },
  nextBackupAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Compute next backup time from frequency + timeOfDay
backupScheduleSchema.methods.computeNextBackup = function () {
  const now = new Date();
  const [hours, minutes] = (this.timeOfDay || '02:00').split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (this.frequency === 'hourly') {
    next.setMinutes(next.getMinutes() + 60);
  } else if (this.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (this.frequency === 'weekly') {
    const targetDay = this.dayOfWeek ?? 1; // default Monday
    const currentDay = next.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
  } else if (this.frequency === 'monthly') {
    const targetDay = this.dayOfMonth ?? 1;
    next.setDate(targetDay);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }

  this.nextBackupAt = next;
  return next;
};

export default mongoose.model('BackupSchedule', backupScheduleSchema);
