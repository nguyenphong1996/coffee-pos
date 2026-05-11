import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import initSocket from './socket/index.js';
import { apiLimiter, loginLimiter, authLimiter } from './middleware/rateLimit.js';
import { initializeCronJobs } from './services/backupService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.resolve('/tmp/uploads')));

// Rate limiting — global
app.use('/api', apiLimiter);

// Routes
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import inventoryRoutes from './routes/inventory.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import staffRoutes from './routes/staff.js';
import settingsRoutes from './routes/settings.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';
import backupRoutes from './routes/backup.js';

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backups', backupRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  initSocket(io);
  initializeCronJobs(io);
  httpServer.listen(PORT, () => {
    console.log(`☕ Coffee POS Backend running on port ${PORT}`);
  });
});

export { io };
