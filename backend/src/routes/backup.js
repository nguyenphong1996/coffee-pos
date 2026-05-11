import express from 'express';
import BackupSchedule from '../models/BackupSchedule.js';
import {
  performBackup,
  scheduleCron,
  unscheduleCron,
  initializeCronJobs,
  getGoogleDriveAuthUrl,
  exchangeCodeForTokens,
} from '../services/backupService.js';

const router = express.Router();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = (await import('jsonwebtoken')).default;
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// List all backup schedules
router.get('/schedules', authenticate, async (req, res) => {
  try {
    const schedules = await BackupSchedule.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single schedule
router.get('/schedules/:id', authenticate, async (req, res) => {
  try {
    const schedule = await BackupSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new backup schedule
router.post('/schedules', authenticate, async (req, res) => {
  try {
    const { name, frequency, timeOfDay, dayOfWeek, dayOfMonth, retentionCount, destination, googleDriveFolderId } = req.body;

    if (!name || !frequency) {
      return res.status(400).json({ success: false, message: 'name and frequency are required' });
    }

    const schedule = new BackupSchedule({
      name,
      frequency,
      timeOfDay: timeOfDay || '02:00',
      dayOfWeek,
      dayOfMonth,
      retentionCount: retentionCount || 10,
      destination: destination || 'google_drive',
      googleDriveFolderId,
      createdBy: req.user._id,
    });

    schedule.computeNextBackup();
    await schedule.save();
    scheduleCron(schedule, req.app.get('io'));

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a backup schedule
router.put('/schedules/:id', authenticate, async (req, res) => {
  try {
    const schedule = await BackupSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Not found' });

    const { name, frequency, timeOfDay, dayOfWeek, dayOfMonth, retentionCount, destination, googleDriveFolderId, enabled } = req.body;

    if (name !== undefined) schedule.name = name;
    if (frequency !== undefined) schedule.frequency = frequency;
    if (timeOfDay !== undefined) schedule.timeOfDay = timeOfDay;
    if (dayOfWeek !== undefined) schedule.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) schedule.dayOfMonth = dayOfMonth;
    if (retentionCount !== undefined) schedule.retentionCount = retentionCount;
    if (destination !== undefined) schedule.destination = destination;
    if (googleDriveFolderId !== undefined) schedule.googleDriveFolderId = googleDriveFolderId;
    if (enabled !== undefined) schedule.enabled = enabled;

    schedule.computeNextBackup();
    await schedule.save();

    if (schedule.enabled) {
      scheduleCron(schedule, req.app.get('io'));
    } else {
      unscheduleCron(schedule._id.toString());
    }

    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete (disable) a backup schedule
router.delete('/schedules/:id', authenticate, async (req, res) => {
  try {
    const schedule = await BackupSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Not found' });

    unscheduleCron(schedule._id.toString());
    await BackupSchedule.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Trigger manual backup now
router.post('/schedules/:id/run', authenticate, async (req, res) => {
  try {
    const schedule = await BackupSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Not found' });

    const io = req.app.get('io');
    const result = await performBackup(schedule, io);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle schedule enabled/disabled
router.patch('/schedules/:id/toggle', authenticate, async (req, res) => {
  try {
    const schedule = await BackupSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Not found' });

    schedule.enabled = !schedule.enabled;
    if (schedule.enabled) {
      schedule.computeNextBackup();
    }
    await schedule.save();

    if (schedule.enabled) {
      scheduleCron(schedule, req.app.get('io'));
    } else {
      unscheduleCron(schedule._id.toString());
    }

    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Google Drive OAuth: get auth URL
router.get('/auth/google', authenticate, async (req, res) => {
  try {
    const url = await getGoogleDriveAuthUrl();
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Google Drive OAuth: callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');

    const tokens = await exchangeCodeForTokens(code);
    const scheduleId = state;

    if (scheduleId) {
      const schedule = await BackupSchedule.findById(scheduleId);
      if (schedule) {
        schedule.googleDriveAccessToken = tokens.access_token;
        schedule.googleDriveRefreshToken = tokens.refresh_token;
        schedule.googleDriveTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
        await schedule.save();
      }
    }

    // Redirect back to frontend admin page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/admin/settings?backup=connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/admin/settings?backup=error=${encodeURIComponent(error.message)}`);
  }
});

// List Google Drive files (for folder picker)
router.get('/drive/files', authenticate, async (req, res) => {
  try {
    const schedule = await BackupSchedule.findOne({ createdBy: req.user._id }).sort({ createdAt: -1 });
    if (!schedule?.googleDriveAccessToken) {
      return res.status(400).json({ success: false, message: 'Google Drive not connected' });
    }

    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/backups/auth/callback'
    );
    oauth2Client.setCredentials({ access_token: schedule.googleDriveAccessToken, refresh_token: schedule.googleDriveRefreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' or mimeType='application/zip' or mimeType='application/x-gzip'",
      fields: 'files(id,name,mimeType,createdTime,size)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    res.json({ success: true, files: response.data.files || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
