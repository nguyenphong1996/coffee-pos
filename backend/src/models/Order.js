import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  variant: { type: String, default: '' },
  toppings: [{ type: String }],
  note: { type: String, default: '' },
  totalPrice: { type: Number, required: true },
});

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['cash', 'transfer', 'card'], default: 'cash' },
  amount: { type: Number, required: true },
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  accountHolder: { type: String, default: '' },
  qrImage: { type: String, default: '' },
  paymentRef: { type: String, default: '' },
  isConfirmed: { type: Boolean, default: false },
  confirmedAt: { type: Date },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableName: { type: String, default: '' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  staffName: { type: String, default: '' },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  payment: paymentSchema,
  isTakeaway: { type: Boolean, default: false },
  note: { type: String, default: '' },
  completedAt: { type: Date },
}, { timestamps: true });

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'paymentStatus': 1 });
orderSchema.index({ tableId: 1, status: 1 });

orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
