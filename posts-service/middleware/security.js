const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const config = require('../config/config');

// Rate limiting configuration
const createRateLimit = (windowMs = config.rateLimit.windowMs, max = config.rateLimit.maxRequests) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
    // Custom key generator for potential user-based limiting
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress;
    }
  });
};

// Stricter rate limiting for write operations
const strictRateLimit = createRateLimit(
  config.rateLimit.windowMs, 
  Math.floor(config.rateLimit.maxRequests / 2)
);

// Very strict rate limiting for sensitive operations
const veryStrictRateLimit = createRateLimit(
  config.rateLimit.windowMs,
  Math.floor(config.rateLimit.maxRequests / 10)
);

// XSS sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key], {
          whiteList: {
            // Allow basic formatting tags for content
            p: [],
            br: [],
            strong: [],
            em: [],
            u: [],
            h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
            ul: [], ol: [], li: [],
            blockquote: [],
            code: ['class'],
            pre: ['class'],
            a: ['href', 'title', 'target'],
            img: ['src', 'alt', 'title', 'width', 'height']
          },
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style']
        });
      }
    }
  }

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key], {
          whiteList: {}, // No HTML allowed in query params
          stripIgnoreTag: true,
          stripIgnoreTagBody: true
        });
      }
    }
  }

  next();
};

// Input validation helper
const validateContentLength = (maxLength = 50000) => {
  return (req, res, next) => {
    if (req.body && req.body.content && req.body.content.length > maxLength) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Content exceeds maximum length of ${maxLength} characters`
        }
      });
    }
    next();
  };
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for API responses
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request sanitization
const requestSanitization = [
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized key: ${key} in request from IP: ${req.ip}`);
    }
  }),
  sanitizeInput
];

// CORS security enhancement
const corsSecurityCheck = (req, res, next) => {
  const origin = req.get('Origin');
  const allowedOrigins = Array.isArray(config.cors.origin) 
    ? config.cors.origin 
    : [config.cors.origin];

  // In development, allow localhost variations
  if (config.nodeEnv === 'development') {
    const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;
    if (origin && localhostPattern.test(origin)) {
      return next();
    }
  }

  // Check if origin is in allowed list
  if (!origin || allowedOrigins.includes(origin)) {
    return next();
  }

  // Log suspicious requests
  console.warn(`Blocked request from unauthorized origin: ${origin} (IP: ${req.ip})`);
  
  return res.status(403).json({
    success: false,
    error: {
      message: 'CORS policy violation: Origin not allowed'
    }
  });
};

module.exports = {
  securityHeaders,
  requestSanitization,
  rateLimit: createRateLimit(),
  strictRateLimit,
  veryStrictRateLimit,
  validateContentLength,
  corsSecurityCheck
};