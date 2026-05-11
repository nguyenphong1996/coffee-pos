import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, enum: ['main'] },
  brandName: { type: String, default: 'Coffee POS' },
  logo: { type: String, default: '' },
  bgImage: { type: String, default: '' },
  themeColor: { type: String, default: '#8B5CF6' },
  wifiQR: {
    ssid: { type: String, default: '' },
    password: { type: String, default: '' },
    type: { type: String, enum: ['WPA', 'WEP', 'nopass'], default: 'WPA' },
    isHidden: { type: Boolean, default: false },
  },
  payment: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    qrImage: { type: String, default: '' },
  },
  pos: {
    vatPercent: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
    autoAddTakeawayItems: { type: Boolean, default: true },
    takeawayItems: [{
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: { type: String, default: '' },
      quantity: { type: Number, default: 1 },
    }],
  },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
