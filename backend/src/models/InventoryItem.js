import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  type: { type: String, enum: ['ingredient', 'supplies'], default: 'ingredient' },
  unit: { type: String, default: 'g' },
  quantity: { type: Number, default: 0, min: 0 },
  alertThreshold: { type: Number, default: 10 },
  costPrice: { type: Number, default: 0, min: 0 },
  supplier: { type: String, default: '' },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  history: [{
    type: { type: String, enum: ['in', 'out', 'adjust'], required: true },
    quantity: { type: Number, required: true },
    note: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

inventoryItemSchema.index({ name: 'text' });
inventoryItemSchema.index({ deletedAt: 1 });

inventoryItemSchema.pre('find', function () {
  this.where({ deletedAt: null });
});
inventoryItemSchema.pre('findOne', function () {
  this.where({ deletedAt: null });
});

export default mongoose.model('InventoryItem', inventoryItemSchema);
