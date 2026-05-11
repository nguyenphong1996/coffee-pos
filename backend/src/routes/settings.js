import express from 'express';
import Settings from '../models/Settings.js';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { validate, updateSettingsRules } from '../middleware/validate.js';
import { logActivity } from '../middleware/activityLog.js';
import { generateQR, generateWifiQR } from '../services/qrService.js';

const router = express.Router();

router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'main' });
    if (!settings) {
      settings = await Settings.create({ key: 'main' });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/', authenticate, adminOnly, updateSettingsRules, validate, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({ key: 'main' }, req.body, { new: true, runValidators: true });
    if (!settings) return res.status(404).json({ success: false, message: 'Không tìm thấy cài đặt' });
    await logActivity(req, 'update', 'settings', settings._id, 'Settings');
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/wifi-qr', authenticate, adminOnly, async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'main' });
    if (!settings?.wifiQR?.ssid) {
      return res.json({ success: true, qrCode: null });
    }
    const wifiString = generateWifiQR(settings.wifiQR);
    const qrCode = await generateQR(wifiString);
    res.json({ success: true, qrCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
