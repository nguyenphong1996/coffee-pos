import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#8B5CF6' },
  icon: { type: String, default: 'Coffee' },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

categorySchema.index({ deletedAt: 1 });

categorySchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

categorySchema.pre('find', function () {
  this.where({ deletedAt: null });
});
categorySchema.pre('findOne', function () {
  this.where({ deletedAt: null });
});

export default mongoose.model('Category', categorySchema);
