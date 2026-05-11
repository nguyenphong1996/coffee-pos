import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let onlineUsers = new Map();

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.userName = user.name;
          socket.userRole = user.role;
          onlineUsers.set(socket.userId, { socketId: socket.id, name: user.name, role: user.role });

          // Notify admins of online staff
          io.emit('staff:online', { userId: socket.userId, name: user.name, online: true });
          io.emit('online:count', { count: onlineUsers.size });
        }
      } catch (error) {
        console.error('Socket auth error:', error);
      }
    });

    // Join room based on role
    socket.on('join:role', (role) => {
      socket.join(`role:${role}`);
    });

    // Staff joins POS mode
    socket.on('join:pos', () => {
      socket.join('pos:staff');
    });

    // New order from customer (via QR)
    socket.on('order:new', (order) => {
      // Gửi đến tất cả staff đang online
      io.to('pos:staff').emit('order:new', order);
      io.to('role:admin').emit('order:new', order);
    });

    // Order status update
    socket.on('order:status', (data) => {
      io.to('pos:staff').emit('order:status', data);
      io.to('role:admin').emit('order:status', data);
    });

    // Table status update
    socket.on('table:update', (data) => {
      io.emit('table:update', data);
    });

    // Inventory alert to admin and staff
    socket.on('inventory:alert', (data) => {
      io.to('role:admin').emit('inventory:alert', data);
      io.to('pos:staff').emit('inventory:alert', data);
    });

    // Notification received from server
    socket.on('notification:received', (notification) => {
      io.to('role:admin').emit('notification', notification);
      io.to('pos:staff').emit('notification', notification);
    });

    // Staff confirms payment
    socket.on('payment:confirmed', (data) => {
      io.emit('payment:confirmed', data);
    });

    // Get online staff list
    socket.on('staff:getOnline', () => {
      const staffList = Array.from(onlineUsers.values()).filter(u => u.role === 'staff');
      socket.emit('staff:onlineList', staffList);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('staff:online', { userId: socket.userId, name: socket.userName, online: false });
        io.emit('online:count', { count: onlineUsers.size });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export const getOnlineStaff = () => {
  return Array.from(onlineUsers.values()).filter(u => u.role === 'staff');
};

export const isStaffOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

export default initSocket;
