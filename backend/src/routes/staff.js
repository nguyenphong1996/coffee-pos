import express from 'express';
import User from '../models/User.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { validate, mongoIdParamRules, createStaffRules, updateStaffRules, resetStaffPasswordRules } from '../middleware/validate.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ role: 1, createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticate, adminOnly, mongoIdParamRules, validate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, adminOnly, createStaffRules, validate, async (req, res) => {
  try {
    const { email } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    const user = await User.create(req.body);
    await logActivity(req, 'create', 'staff', user._id, user.name);
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, adminOnly, mongoIdParamRules, updateStaffRules, validate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    await logActivity(req, 'update', 'staff', user._id, user.name);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/password', authenticate, adminOnly, mongoIdParamRules, resetStaffPasswordRules, validate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    user.password = password;
    await user.save();
    await logActivity(req, 'reset_password', 'staff', user._id, user.name);
    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, adminOnly, mongoIdParamRules, validate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản admin' });
    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();
    await logActivity(req, 'deactivate', 'staff', user._id, user.name);
    res.json({ success: true, message: 'Vô hiệu hóa nhân viên thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
