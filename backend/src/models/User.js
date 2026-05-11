import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ deletedAt: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

userSchema.pre('find', function () {
  this.where({ deletedAt: null });
});
userSchema.pre('findOne', function () {
  this.where({ deletedAt: null });
});

export default mongoose.model('User', userSchema);
