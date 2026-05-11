import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getNotifications(req.user._id, req.user.role, { page: +page, limit: +limit });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);
    if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await markAllAsRead(req.user._id, req.user.role);
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const { unreadCount } = await getNotifications(req.user._id, req.user.role, { page: 1, limit: 1 });
    res.json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
