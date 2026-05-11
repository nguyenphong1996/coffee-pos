import express from 'express';
import InventoryItem from '../models/InventoryItem.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };
    const items = await InventoryItem.find(filter).sort({ name: 1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/alerts', authenticate, async (req, res) => {
  try {
    const items = await InventoryItem.find({ isActive: true, $expr: { $lte: ['$quantity', '$alertThreshold'] } });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const item = await InventoryItem.create(req.body);
    await logActivity(req, 'create', 'inventory', item._id, item.name);
    res.status(201).json({ success: true, item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Nguyên liệu đã tồn tại' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/in', authenticate, adminOnly, async (req, res) => {
  try {
    const { itemId, quantity, note } = req.body;
    const item = await InventoryItem.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });
    item.quantity += quantity;
    item.history.push({ type: 'in', quantity, note: note || 'Nhập kho', performedBy: req.user._id });
    await item.save();
    await logActivity(req, 'stock_in', 'inventory', item._id, item.name, { quantity, newTotal: item.quantity });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/out', authenticate, adminOnly, async (req, res) => {
  try {
    const { itemId, quantity, note } = req.body;
    const item = await InventoryItem.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });
    if (item.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Số lượng trong kho không đủ' });
    }
    item.quantity -= quantity;
    item.history.push({ type: 'out', quantity: -quantity, note: note || 'Xuất kho', performedBy: req.user._id });
    await item.save();
    await logActivity(req, 'stock_out', 'inventory', item._id, item.name, { quantity, newTotal: item.quantity });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    await logActivity(req, 'update', 'inventory', item._id, item.name);
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    item.deletedAt = new Date();
    await item.save();
    await logActivity(req, 'delete', 'inventory', item._id, item.name);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
