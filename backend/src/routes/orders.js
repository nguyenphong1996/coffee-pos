import express from 'express';
import Order from '../models/Order.js';
import { authenticate, staffOrAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';
import { createOrder, updateOrderStatus, confirmPayment } from '../services/orderService.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, date, staffId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (staffId) filter.staffId = staffId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('staffId', 'name');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/active', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
    }).sort({ createdAt: -1 }).populate('staffId', 'name');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('staffId', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const io = req.app.get('io');
    const { customerName, customerPhone, items, tableId, isTakeaway, payment } = req.body;
    const user = await authenticateToken(req);
    const order = await createOrder({ items, tableId, isTakeaway, payment, customerName, customerPhone }, io, user);
    io.to('pos:staff').emit('order:new', order);
    io.to('role:admin').emit('order:new', order);
    await logActivity(req, 'create', 'order', order._id, order.orderNumber, { total: order.total, items: items.length });
    res.status(201).json({ success: true, order });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_INVENTORY') {
      return res.status(409).json({ success: false, message: error.message, details: error.details });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id/status', authenticate, staffOrAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const io = req.app.get('io');
    const order = await updateOrderStatus(req.params.id, status, io);
    await logActivity(req, 'status_change', 'order', order._id, order.orderNumber, { status });
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id/confirm-payment', authenticate, staffOrAdmin, async (req, res) => {
  try {
    const io = req.app.get('io');
    const order = await confirmPayment(req.params.id, io);
    await logActivity(req, 'confirm_payment', 'order', order._id, order.orderNumber, { amount: order.total });
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

async function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const User = (await import('../models/User.js')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new Error('Token không hợp lệ');
    return user;
  }
  if (req.user) return req.user;
  return { role: 'customer' };
}

export default router;
