const express = require('express');
const router = express.Router();

// Controllers
const {
  getModerationQueue,
  moderateComment,
  bulkModerateComments,
  getReports,
  reviewReport,
  getDetailedModerationStats
} = require('../controllers/moderationController');

// Middleware
const {
  validateModerateComment,
  validateReviewReport,
  validateObjectId,
  validate,
  schemas
} = require('../middleware/validation');

const {
  extractUserInfo,
  authenticateToken,
  requireModerator,
  requireAdmin
} = require('../middleware/auth');

const {
  adminRateLimit
} = require('../middleware/rateLimiting');

const Joi = require('joi');

// Apply common middleware to all moderation routes
router.use(extractUserInfo);
router.use(authenticateToken);
router.use(adminRateLimit);

// Validation schema for bulk moderation
const bulkModerationSchema = Joi.object({
  commentIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one comment ID is required',
      'array.max': 'Cannot moderate more than 50 comments at once'
    }),
  status: Joi.string()
    .valid('approved', 'rejected', 'flagged')
    .required(),
  reason: Joi.string()
    .max(500)
    .optional()
    .trim()
});

// Validation schema for moderation queue query parameters
const moderationQueueSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'flagged', 'all').default('pending'),
  sort: Joi.string().valid('createdAt', 'reports', 'likes', 'riskScore').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  postId: Joi.string().optional()
});

// Validation schema for reports query parameters
const reportsQueueSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'reviewed', 'resolved', 'dismissed', 'all').default('pending'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  reason: Joi.string().valid('spam', 'inappropriate', 'harassment', 'hate_speech', 'violence', 'misinformation', 'copyright', 'other').optional(),
  sort: Joi.string().valid('createdAt', 'priority').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// Validation schema for detailed stats query parameters
const statsQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day')
});

// MODERATION QUEUE ROUTES

// GET /admin/comments - Get moderation queue
router.get('/admin/comments',
  requireModerator,
  validate(moderationQueueSchema, 'query'),
  getModerationQueue
);

// PATCH /admin/comments/:id - Moderate a specific comment
router.patch('/admin/comments/:id',
  requireModerator,
  validateObjectId(),
  validateModerateComment,
  moderateComment
);

// PATCH /admin/comments/bulk - Bulk moderate multiple comments
router.patch('/admin/comments/bulk',
  requireModerator,
  validate(bulkModerationSchema),
  bulkModerateComments
);

// REPORTS MANAGEMENT ROUTES

// GET /admin/reports - Get all reports for review
router.get('/admin/reports',
  requireModerator,
  validate(reportsQueueSchema, 'query'),
  getReports
);

// PATCH /admin/reports/:id - Review a specific report
router.patch('/admin/reports/:id',
  requireModerator,
  validateObjectId(),
  validateReviewReport,
  reviewReport
);

// STATISTICS AND ANALYTICS ROUTES

// GET /admin/stats - Get detailed moderation statistics
router.get('/admin/stats',
  requireAdmin,
  validate(statsQuerySchema, 'query'),
  getDetailedModerationStats
);

// HEALTH CHECK ROUTE

// GET /admin/health - Health check for moderation system
router.get('/admin/health',
  requireModerator,
  async (req, res) => {
    try {
      const Comment = require('../models/Comment');
      const Report = require('../models/Report');

      // Basic connectivity tests
      const [commentCount, reportCount] = await Promise.all([
        Comment.countDocuments(),
        Report.countDocuments()
      ]);

      // Check for pending items
      const [pendingComments, pendingReports] = await Promise.all([
        Comment.countDocuments({ status: 'pending' }),
        Report.countDocuments({ status: 'pending' })
      ]);

      // Check database responsiveness
      const start = Date.now();
      await Comment.findOne().limit(1);
      const dbResponseTime = Date.now() - start;

      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          responseTime: `${dbResponseTime}ms`,
          totalComments: commentCount,
          totalReports: reportCount
        },
        moderation: {
          pendingComments,
          pendingReports,
          queueLoad: pendingComments + pendingReports
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        }
      };

      // Determine overall health
      if (pendingComments > 1000 || pendingReports > 500) {
        healthStatus.status = 'degraded';
        healthStatus.warnings = [];
        
        if (pendingComments > 1000) {
          healthStatus.warnings.push('High number of pending comments');
        }
        if (pendingReports > 500) {
          healthStatus.warnings.push('High number of pending reports');
        }
      }

      if (dbResponseTime > 1000) {
        healthStatus.status = 'degraded';
        healthStatus.warnings = healthStatus.warnings || [];
        healthStatus.warnings.push('Slow database response time');
      }

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: true,
        data: healthStatus
      });

    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ERROR HANDLING MIDDLEWARE

// Handle validation errors specific to moderation routes
router.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'MODERATION_VALIDATION_ERROR',
      details: error.details
    });
  }

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_OBJECT_ID'
    });
  }

  next(error);
});

module.exports = router;