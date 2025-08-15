const rateLimit = require('express-rate-limit');

// Store for tracking user behavior
const userBehaviorStore = new Map();

// Helper function to get client identifier
const getClientId = (req) => {
  return req.userInfo?.fingerprint || req.userInfo?.ip || 'unknown';
};

// Basic rate limiting for all requests
const basicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Comment creation rate limiting (stricter)
const commentRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 comment creations per 5 minutes
  message: {
    error: 'Too many comments created. Please wait before posting again.',
    code: 'COMMENT_RATE_LIMIT_EXCEEDED',
    retryAfter: '5 minutes'
  },
  keyGenerator: getClientId,
  standardHeaders: true,
  legacyHeaders: false,
  // Track repeat offenders using handler function
  handler: (req, res, next, options) => {
    const clientId = getClientId(req);
    const now = Date.now();
    
    if (!userBehaviorStore.has(clientId)) {
      userBehaviorStore.set(clientId, {
        rateLimitHits: 1,
        firstHit: now,
        lastHit: now,
        suspiciousActivity: false
      });
    } else {
      const behavior = userBehaviorStore.get(clientId);
      behavior.rateLimitHits++;
      behavior.lastHit = now;
      
      // Mark as suspicious if they hit rate limits multiple times
      if (behavior.rateLimitHits >= 3) {
        behavior.suspiciousActivity = true;
      }
      
      userBehaviorStore.set(clientId, behavior);
    }

    // Send the rate limit response
    res.status(options.statusCode).json(options.message);
  }
});

// Report creation rate limiting
const reportRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 reports per 10 minutes
  message: {
    error: 'Too many reports submitted. Please wait before reporting again.',
    code: 'REPORT_RATE_LIMIT_EXCEEDED',
    retryAfter: '10 minutes'
  },
  keyGenerator: getClientId,
  standardHeaders: true,
  legacyHeaders: false
});

// Like action rate limiting
const likeRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 likes per minute
  message: {
    error: 'Too many like actions. Please slow down.',
    code: 'LIKE_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  },
  keyGenerator: getClientId,
  standardHeaders: true,
  legacyHeaders: false
});

// Admin endpoints rate limiting (more lenient)
const adminRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit admin actions to 100 per minute
  message: {
    error: 'Too many admin requests',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  },
  keyGenerator: (req) => req.user?.id || getClientId(req),
  standardHeaders: true,
  legacyHeaders: false
});

// Anti-spam middleware - detects rapid successive posts
const antiSpamMiddleware = (req, res, next) => {
  const clientId = getClientId(req);
  const now = Date.now();
  const content = req.body.content?.toLowerCase() || '';
  
  if (!userBehaviorStore.has(clientId)) {
    userBehaviorStore.set(clientId, {
      lastComments: [],
      rateLimitHits: 0,
      suspiciousActivity: false
    });
  }
  
  const behavior = userBehaviorStore.get(clientId);
  
  // Check for rapid posting (less than 10 seconds between comments)
  if (behavior.lastComments.length > 0) {
    const lastComment = behavior.lastComments[behavior.lastComments.length - 1];
    if (now - lastComment.timestamp < 10000) {
      return res.status(429).json({
        error: 'Please wait at least 10 seconds between comments',
        code: 'SPAM_PREVENTION',
        retryAfter: '10 seconds'
      });
    }
  }
  
  // Check for duplicate content in recent comments
  const isDuplicate = behavior.lastComments.some(comment => 
    comment.content === content && (now - comment.timestamp) < 5 * 60 * 1000 // 5 minutes
  );
  
  if (isDuplicate) {
    return res.status(400).json({
      error: 'Duplicate comment detected. Please post unique content.',
      code: 'DUPLICATE_CONTENT'
    });
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /^.{1,5}$/, // Very short comments (might be spam)
    /(http[s]?:\/\/[^\s]+.*){3,}/, // Multiple URLs
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(content));
  
  if (isSuspicious) {
    behavior.suspiciousActivity = true;
    userBehaviorStore.set(clientId, behavior);
    
    // Flag for manual review instead of blocking
    req.flagForReview = true;
  }
  
  // Add current comment to history
  behavior.lastComments.push({
    content,
    timestamp: now
  });
  
  // Keep only last 10 comments in memory
  if (behavior.lastComments.length > 10) {
    behavior.lastComments = behavior.lastComments.slice(-10);
  }
  
  userBehaviorStore.set(clientId, behavior);
  
  next();
};

// Burst protection - prevents sudden spikes in activity
const burstProtection = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 5, // Max 5 requests per 30 seconds
  message: {
    error: 'Request burst detected. Please slow down.',
    code: 'BURST_PROTECTION',
    retryAfter: '30 seconds'
  },
  keyGenerator: getClientId,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Only count failed requests
});

// Clean up old behavior data periodically
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [clientId, behavior] of userBehaviorStore.entries()) {
    // Clean up old comment history
    behavior.lastComments = behavior.lastComments.filter(
      comment => now - comment.timestamp < oneHour
    );
    
    // Remove entries with no recent activity
    if (behavior.lastComments.length === 0 && 
        (!behavior.lastHit || now - behavior.lastHit > oneHour)) {
      userBehaviorStore.delete(clientId);
    } else {
      userBehaviorStore.set(clientId, behavior);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Enhanced rate limiting based on user trust level
const adaptiveRateLimit = (req, res, next) => {
  const trustLevel = req.userStatus?.trustLevel || 'normal';
  const clientId = getClientId(req);
  const behavior = userBehaviorStore.get(clientId);
  
  // Adjust limits based on trust level and behavior
  let multiplier = 1;
  
  switch (trustLevel) {
    case 'high':
    case 'trusted':
      multiplier = 2; // Double the limits for trusted users
      break;
    case 'low':
      multiplier = 0.5; // Halve the limits for low trust users
      break;
    default:
      multiplier = 1;
  }
  
  // Reduce limits further for users with suspicious activity
  if (behavior?.suspiciousActivity) {
    multiplier *= 0.3;
  }
  
  // Store the multiplier for use by other middleware
  req.rateLimitMultiplier = multiplier;
  
  next();
};

module.exports = {
  basicRateLimit,
  commentRateLimit,
  reportRateLimit,
  likeRateLimit,
  adminRateLimit,
  antiSpamMiddleware,
  burstProtection,
  adaptiveRateLimit,
  userBehaviorStore,
  getClientId
};