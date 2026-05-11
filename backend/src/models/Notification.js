import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientRole: { type: String, enum: ['admin', 'staff', 'all'], default: 'all' },
  type: {
    type: String,
    enum: ['low_stock', 'new_order', 'payment_received', 'system', 'staff_activity', 'backup_success', 'backup_failed'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  readBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

export default mongoose.model('Notification', notificationSchema);
