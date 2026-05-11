import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  area: { type: String, default: 'main' },
  capacity: { type: Number, default: 4 },
  status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  qrCode: { type: String },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

tableSchema.index({ deletedAt: 1 });

tableSchema.pre('find', function () {
  this.where({ deletedAt: null });
});
tableSchema.pre('findOne', function () {
  this.where({ deletedAt: null });
});

export default mongoose.model('Table', tableSchema);
