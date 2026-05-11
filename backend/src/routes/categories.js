import express from 'express';
import Category from '../models/Category.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const categories = await Category.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    await logActivity(req, 'create', 'category', category._id, category.name);
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Danh mục đã tồn tại' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    await logActivity(req, 'update', 'category', category._id, category.name);
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    category.deletedAt = new Date();
    await category.save();
    await logActivity(req, 'delete', 'category', category._id, category.name);
    res.json({ success: true, message: 'Xóa danh mục thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
