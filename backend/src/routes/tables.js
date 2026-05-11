import express from 'express';
import Table from '../models/Table.js';
import { authenticate, adminOnly, staffOrAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';
import { generateQR } from '../services/qrService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { area, status } = req.query;
    const filter = { isActive: true };
    if (area) filter.area = area;
    if (status) filter.status = status;
    const tables = await Table.find(filter).sort({ area: 1, name: 1 });
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    res.json({ success: true, table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const table = await Table.create(req.body);
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/customer/order/${table._id}`;
    const qrCode = await generateQR(qrUrl);
    table.qrCode = qrCode;
    await table.save();
    await logActivity(req, 'create', 'table', table._id, table.name);
    res.status(201).json({ success: true, table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    await logActivity(req, 'update', 'table', table._id, table.name);
    res.json({ success: true, table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    table.deletedAt = new Date();
    await table.save();
    await logActivity(req, 'delete', 'table', table._id, table.name);
    res.json({ success: true, message: 'Xóa bàn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/status', authenticate, staffOrAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const table = await Table.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    req.app.get('io').emit('table:update', { tableId: table._id, status });
    await logActivity(req, 'status_change', 'table', table._id, table.name, { status });
    res.json({ success: true, table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/qr', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/customer/order/${table._id}`;
    const qrCode = await generateQR(qrUrl);
    table.qrCode = qrCode;
    await table.save();
    res.json({ success: true, qrCode, qrUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
