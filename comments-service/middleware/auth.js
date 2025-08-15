const jwt = require('jsonwebtoken');

// Simple auth middleware for demonstration - in production use proper JWT validation
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // For demo purposes, allow requests without tokens but capture user info if present
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'demo-secret', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// Require authentication middleware - returns 401 if no valid token
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'demo-secret', (err, user) => {
    if (err) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    req.user = user;
    next();
  });
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Moderator authentication middleware
const requireModerator = (req, res, next) => {
  if (!req.user || (!req.user.isModerator && !req.user.isAdmin)) {
    return res.status(403).json({
      error: 'Moderator access required',
      code: 'MODERATOR_REQUIRED'
    });
  }
  next();
};

// Extract user info from request (IP, User-Agent, etc.)
const extractUserInfo = (req, res, next) => {
  const ip = req.ip || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    'unknown';

  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Create a simple fingerprint from available headers
  const fingerprint = Buffer.from(
    `${ip}-${userAgent}-${req.headers['accept-language'] || ''}`
  ).toString('base64');

  req.userInfo = {
    ip: ip.replace(/^::ffff:/, ''), // Remove IPv6 prefix if present
    userAgent,
    fingerprint
  };

  next();
};

// Check if user is rate limited
const checkUserStatus = async (req, res, next) => {
  // In a real implementation, check against a user blacklist/whitelist
  // For now, just add the middleware structure
  req.userStatus = {
    isBanned: false,
    isWhitelisted: false,
    trustLevel: 'normal' // low, normal, high, trusted
  };
  
  next();
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin,
  requireModerator,
  extractUserInfo,
  checkUserStatus
};