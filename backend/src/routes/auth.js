import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validate, loginRules, registerRules } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

router.post('/register', registerRules, validate, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }
    const user = await User.create({ name, email, password, role: 'admin' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
    await logActivity(req, 'register', 'user', user._id, user.name);
    res.status(201).json({ success: true, user, token, refreshToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/login', loginRules, validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
    await logActivity(req, 'login', 'user', user._id, user.name);
    res.json({ success: true, user, token, refreshToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ success: true, token });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh token không hợp lệ' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }
    user.password = newPassword;
    await user.save();
    await logActivity(req, 'change_password', 'user', user._id, user.name);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
