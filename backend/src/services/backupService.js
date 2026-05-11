import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { google } from 'googleapis';
import BackupSchedule from '../models/BackupSchedule.js';
import { createNotification } from './notificationService.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/coffee-pos-backups';
const DRIVE_API_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function buildCronExpression(schedule) {
  const [hours, minutes] = (schedule.timeOfDay || '02:00').split(':');
  switch (schedule.frequency) {
    case 'hourly': return `0 ${minutes} * * * *`; // cron: minute of hour
    case 'daily': return `0 ${minutes} ${hours} * * *`;
    case 'weekly': {
      const dow = schedule.dayOfWeek ?? 1;
      return `0 ${minutes} ${hours} * * ${dow}`;
    }
    case 'monthly': {
      const dom = schedule.dayOfMonth ?? 1;
      return `0 ${minutes} ${hours} ${dom} * *`;
    }
    default: return `0 ${minutes} ${hours} * * *`;
  }
}

async function createDriveClient(schedule) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/backups/auth/callback'
  );
  oauth2Client.setCredentials({
    access_token: schedule.googleDriveAccessToken,
    refresh_token: schedule.googleDriveRefreshToken,
    expiry_date: schedule.googleDriveTokenExpiry ? new Date(schedule.googleDriveTokenExpiry).getTime() : undefined,
  });
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      schedule.googleDriveAccessToken = tokens.access_token;
    }
    if (tokens.expiry_date) {
      schedule.googleDriveExpiryDate = new Date(tokens.expiry_date);
    }
    await schedule.save();
  });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

function getMongoUriParts() {
  // Support both standard and Docker/MongoDB URI formats
  const uri = MONGODB_URI;
  const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, '');
  const atIndex = withoutProtocol.indexOf('@');
  const lastSlashIndex = withoutProtocol.lastIndexOf('/');
  const authPart = atIndex !== -1 ? withoutProtocol.substring(0, atIndex) : '';
  const hostPart = atIndex !== -1 ? withoutProtocol.substring(atIndex + 1, lastSlashIndex !== -1 ? lastSlashIndex : undefined) : (lastSlashIndex !== -1 ? withoutProtocol.substring(0, lastSlashIndex) : withoutProtocol);
  const dbName = lastSlashIndex !== -1 ? withoutProtocol.substring(lastSlashIndex + 1).split('?')[0] : 'coffee_pos';
  return { authPart, hostPart, dbName, uri };
}

export async function performBackup(schedule, io) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `coffee-pos-${schedule.frequency}-${timestamp}.gz`;
  const localPath = path.join(BACKUP_DIR, filename);

  schedule.lastBackupStatus = 'pending';
  await schedule.save();

  try {
    if (schedule.destination === 'google_drive') {
      // Use mongodump for backup
      const { authPart, hostPart, dbName } = getMongoUriParts();
      const credsFile = path.join(BACKUP_DIR, '.mongodump_auth');
      if (authPart) {
        const [user, pwd] = authPart.split(':');
        const credsContent = `username=${user}\npassword=${pwd}`;
        fs.writeFileSync(credsFile, credsContent);
      }
      const dumpDir = path.join(BACKUP_DIR, `dump-${timestamp}`);
      fs.mkdirSync(dumpDir, { recursive: true });

      let dumpCmd = `mongodump --uri="${MONGODB_URI}" --out="${dumpDir}" --gzip`;
      execSync(dumpCmd, { stdio: 'pipe' });

      // Create tar archive
      const tarPath = path.join(BACKUP_DIR, `backup-${timestamp}.tar.gz`);
      execSync(`tar -czf "${tarPath}" -C "${dumpDir}" .`, { stdio: 'pipe' });

      const drive = await createDriveClient(schedule);
      const fileMetadata = {
        name: filename,
        parents: schedule.googleDriveFolderId ? [schedule.googleDriveFolderId] : undefined,
      };
      const media = { body: fs.createReadStream(tarPath) };
      await drive.files.create({ resource: fileMetadata, media, fields: 'id' });

      // Cleanup
      execSync(`rm -rf "${dumpDir}" "${tarPath}"`);
      if (fs.existsSync(credsFile)) fs.unlinkSync(credsFile);
    } else {
      // Local backup
      const { authPart, hostPart, dbName } = getMongoUriParts();
      execSync(`mongodump --uri="${MONGODB_URI}" --archive="${localPath}" --gzip`, { stdio: 'pipe' });
    }

    schedule.lastBackupAt = new Date();
    schedule.lastBackupStatus = 'success';
    schedule.lastBackupError = null;
    schedule.computeNextBackup();
    await schedule.save();

    await createNotification({
      recipientRole: 'admin',
      type: 'backup_success',
      title: 'Backup thành công',
      message: `Backup "${schedule.name}" đã hoàn thành lúc ${new Date().toLocaleString('vi-VN')}`,
      data: { scheduleId: schedule._id.toString() },
      io,
    });

    return { success: true, filename, schedule };
  } catch (error) {
    schedule.lastBackupStatus = 'failed';
    schedule.lastBackupError = error.message;
    await schedule.save();

    await createNotification({
      recipientRole: 'admin',
      type: 'backup_failed',
      title: 'Backup thất bại',
      message: `Backup "${schedule.name}" thất bại: ${error.message}`,
      data: { scheduleId: schedule._id.toString(), error: error.message },
      io,
    });

    throw error;
  }
}

// In-memory cron job registry (keyed by schedule _id)
export const cronJobs = new Map();

export function scheduleCron(schedule, io) {
  const cronExpr = buildCronExpression(schedule);
  const scheduleId = schedule._id.toString();

  // Remove existing if any
  unscheduleCron(scheduleId);

  const cronJob = schedule.cronJobInstance;
  if (cronJob) {
    cronJob.stop();
  }

  // Simple in-process scheduler using setTimeout recursion
  let timer = null;

  function computeDelay() {
    const next = schedule.computeNextBackup();
    const delay = new Date(next).getTime() - Date.now();
    return Math.max(delay, 0);
  }

  function run() {
    performBackup(schedule, io)
      .catch((err) => console.error(`[Backup] Schedule ${scheduleId} failed:`, err.message))
      .finally(() => {
        // Reschedule
        const delay = computeDelay();
        timer = setTimeout(run, delay);
        cronJobs.set(scheduleId, { timer, schedule });
      });
  }

  // Start from "next backup" time
  const delay = computeDelay();
  timer = setTimeout(run, delay);
  cronJobs.set(scheduleId, { timer, schedule });
  console.log(`[Backup] Scheduled "${schedule.name}" next run in ${Math.round(delay / 1000 / 60)} min — cron: ${cronExpr}`);
}

export function unscheduleCron(scheduleId) {
  const existing = cronJobs.get(scheduleId);
  if (existing) {
    clearTimeout(existing.timer);
    cronJobs.delete(scheduleId);
  }
}

export async function initializeCronJobs(io) {
  const schedules = await BackupSchedule.find({ enabled: true });
  for (const s of schedules) {
    s.computeNextBackup();
    await s.save();
    scheduleCron(s, io);
  }
  console.log(`[Backup] Initialized ${schedules.length} cron jobs`);
}

export async function getGoogleDriveAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/backups/auth/callback'
  );
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: DRIVE_API_SCOPES,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/backups/auth/callback'
  );
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
