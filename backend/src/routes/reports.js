import express from 'express';
import Order from '../models/Order.js';
import ActivityLog from '../models/ActivityLog.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/revenue', authenticate, adminOnly, async (req, res) => {
  try {
    const { period = 'day', date } = req.query;
    let startDate, endDate;

    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      if (period === 'day') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    }

    const orders = await Order.find({
      status: 'completed',
      paymentStatus: 'paid',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;

    res.json({ success: true, totalRevenue, orderCount, startDate, endDate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/top-products', authenticate, adminOnly, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate = new Date();
    if (period === 'day') startDate = new Date(now.setHours(0, 0, 0, 0));
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);

    const orders = await Order.find({ status: 'completed', paymentStatus: 'paid', createdAt: { $gte: startDate } });

    const productMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productMap[item.productId].quantity += item.quantity;
        productMap[item.productId].revenue += item.totalPrice;
      });
    });

    const topProducts = Object.entries(productMap)
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({ success: true, topProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/staff-sales', authenticate, adminOnly, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate = new Date();
    if (period === 'day') startDate = new Date(now.setHours(0, 0, 0, 0));
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);

    const orders = await Order.find({ status: 'completed', paymentStatus: 'paid', createdAt: { $gte: startDate } });

    const staffMap = {};
    orders.forEach(order => {
      if (!order.staffId) return;
      const key = order.staffId.toString();
      if (!staffMap[key]) staffMap[key] = { name: order.staffName, orderCount: 0, revenue: 0 };
      staffMap[key].orderCount += 1;
      staffMap[key].revenue += order.total;
    });

    const staffSales = Object.entries(staffMap)
      .map(([id, data]) => ({ staffId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, staffSales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/daily', authenticate, adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const orders = await Order.aggregate([
      { $match: { status: 'completed', paymentStatus: 'paid', createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, daily: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/logs', authenticate, adminOnly, async (req, res) => {
  try {
    const { action, entityType, userId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(filter);
    res.json({ success: true, logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
