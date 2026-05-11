import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'g' },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  images: [{ type: String }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  recipe: [recipeSchema],
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  tags: [{ type: String }],
  preparationTime: { type: Number, default: 5 },
  variants: [{
    name: { type: String, required: true },
    priceModifier: { type: Number, default: 0 },
  }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ deletedAt: 1 });

productSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

productSchema.pre('find', function () {
  this.where({ deletedAt: null });
});
productSchema.pre('findOne', function () {
  this.where({ deletedAt: null });
});

export default mongoose.model('Product', productSchema);
