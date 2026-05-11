import express from 'express';
import Product from '../models/Product.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, search, isAvailable } = req.query;
    const filter = {};
    if (category) filter.categoryId = category;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (search) filter.$text = { $search: search };
    const products = await Product.find(filter)
      .populate('categoryId', 'name color')
      .sort({ isFeatured: -1, name: 1 });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name color');
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await logActivity(req, 'create', 'product', product._id, product.name);
    res.status(201).json({ success: true, product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm đã tồn tại' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    await logActivity(req, 'update', 'product', product._id, product.name);
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    product.deletedAt = new Date();
    await product.save();
    await logActivity(req, 'delete', 'product', product._id, product.name);
    res.json({ success: true, message: 'Xóa sản phẩm thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/toggle', authenticate, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    product.isAvailable = !product.isAvailable;
    await product.save();
    await logActivity(req, 'toggle', 'product', product._id, product.name, { isAvailable: product.isAvailable });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
