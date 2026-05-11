import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async (req, action, entityType, entityId = null, entityName = '', details = {}) => {
  try {
    await ActivityLog.create({
      userId: req.user?._id,
      userName: req.user?.name || 'System',
      userRole: req.user?.role || '',
      action,
      entityType,
      entityId,
      entityName,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('User-Agent') || '',
    });
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

export const activityLog = (action, entityType, entityId, entityName, details = {}) => {
  return async (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        logActivity(req, action, entityType, entityId, entityName, details);
      }
    });
    next();
  };
};
