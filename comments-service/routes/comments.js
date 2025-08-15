const express = require('express');
const router = express.Router();

// Controllers
const {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  reportComment,
  getCommentStats
} = require('../controllers/commentsController');

// Middleware
const {
  validateCreateComment,
  validateUpdateComment,
  validateCreateReport,
  validateCommentQuery,
  validateObjectId,
  validatePostId,
  sanitizeContent
} = require('../middleware/validation');

const {
  extractUserInfo,
  checkUserStatus,
  authenticateToken,
  requireAuth
} = require('../middleware/auth');

const {
  commentRateLimit,
  reportRateLimit,
  likeRateLimit,
  antiSpamMiddleware,
  burstProtection,
  adaptiveRateLimit
} = require('../middleware/rateLimiting');

const {
  sanitizeContent: moderationSanitize,
  detectProfanity,
  detectSpam,
  autoModerate,
  analyzeContent,
  addToModerationQueue,
  autoReject
} = require('../middleware/moderation');

// Apply common middleware to all routes
router.use(extractUserInfo);
router.use(checkUserStatus);

// GET /posts/:post_id/comments - Get all comments for a post (No auth required)
router.get('/posts/:post_id/comments',
  validatePostId(),
  validateCommentQuery,
  burstProtection,
  getComments
);

// GET /posts/:post_id/comments/stats - Get comment statistics for a post (No auth required)
router.get('/posts/:post_id/comments/stats',
  validatePostId(),
  getCommentStats
);

// POST /posts/:post_id/comments - Create a new comment (Auth required)
router.post('/posts/:post_id/comments',
  authenticateToken,
  validatePostId(),
  commentRateLimit,
  adaptiveRateLimit,
  validateCreateComment,
  sanitizeContent,
  moderationSanitize,
  detectProfanity,
  detectSpam,
  antiSpamMiddleware,
  autoReject,
  autoModerate,
  analyzeContent,
  addToModerationQueue,
  createComment
);

// PUT /comments/:id - Update a comment (Auth required)
router.put('/comments/:id',
  authenticateToken,
  validateObjectId(),
  commentRateLimit,
  validateUpdateComment,
  sanitizeContent,
  moderationSanitize,
  detectProfanity,
  detectSpam,
  autoModerate,
  analyzeContent,
  addToModerationQueue,
  updateComment
);

// DELETE /comments/:id - Delete a comment (Auth required)
router.delete('/comments/:id',
  requireAuth,
  validateObjectId(),
  deleteComment
);

// POST /comments/:id/like - Like a comment (Auth optional)
router.post('/comments/:id/like',
  authenticateToken,
  validateObjectId(),
  likeRateLimit,
  likeComment
);

// POST /comments/:id/report - Report a comment (Auth optional)
router.post('/comments/:id/report',
  authenticateToken,
  validateObjectId(),
  reportRateLimit,
  validateCreateReport,
  sanitizeContent,
  reportComment
);

module.exports = router;