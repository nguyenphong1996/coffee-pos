import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const createNotification = async ({ recipientId, recipientRole, type, title, message, data = {}, io }) => {
  const notification = await Notification.create({
    recipientId: recipientId || null,
    recipientRole: recipientRole || 'all',
    type,
    title,
    message,
    data,
  });

  if (io) {
    if (recipientRole === 'admin' || recipientRole === 'all') {
      io.to('role:admin').emit('notification', notification);
    }
    if (recipientRole === 'staff' || recipientRole === 'all') {
      io.to('pos:staff').emit('notification', notification);
    }
    if (recipientId) {
      io.emit('notification', notification);
    }
  }

  return notification;
};

export const getNotifications = async (userId, role, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const filter = {
    $or: [
      { recipientId: userId },
      { recipientRole: role },
      { recipientRole: 'all' },
    ],
  };

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('readBy', 'name')
      .populate('recipientId', 'name email'),
    Notification.countDocuments(filter),
  ]);

  const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

  return {
    notifications,
    total,
    page,
    pages: Math.ceil(total / limit),
    unreadCount,
  };
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true, readAt: new Date(), readBy: userId },
    { new: true }
  );
  return notification;
};

export const markAllAsRead = async (userId, role) => {
  const result = await Notification.updateMany(
    {
      $or: [{ recipientId: userId }, { recipientRole: role }, { recipientRole: 'all' }],
      isRead: false,
    },
    { isRead: true, readAt: new Date(), readBy: userId }
  );
  return result;
};
