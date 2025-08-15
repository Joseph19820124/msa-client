require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 4001,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/comments_service',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT) || 5000
    }
  },

  // External Services
  services: {
    postsService: {
      url: process.env.POSTS_SERVICE_URL || 'http://localhost:4000',
      timeout: parseInt(process.env.POSTS_SERVICE_TIMEOUT) || 5000
    }
  },

  // Security Configuration - JWT Verification
  security: {
    jwtPublicKey: process.env.JWT_PUBLIC_KEY || null,
    jwtAlgorithm: process.env.JWT_ALGORITHM || 'RS256',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    trustProxy: process.env.TRUST_PROXY === 'true' || false
  },

  // Rate Limiting Configuration
  rateLimiting: {
    basic: {
      windowMs: parseInt(process.env.BASIC_RATE_WINDOW) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.BASIC_RATE_MAX) || 1000
    },
    comments: {
      windowMs: parseInt(process.env.COMMENT_RATE_WINDOW) || 5 * 60 * 1000, // 5 minutes
      max: parseInt(process.env.COMMENT_RATE_MAX) || 10
    },
    reports: {
      windowMs: parseInt(process.env.REPORT_RATE_WINDOW) || 10 * 60 * 1000, // 10 minutes
      max: parseInt(process.env.REPORT_RATE_MAX) || 5
    },
    likes: {
      windowMs: parseInt(process.env.LIKE_RATE_WINDOW) || 1 * 60 * 1000, // 1 minute
      max: parseInt(process.env.LIKE_RATE_MAX) || 30
    },
    admin: {
      windowMs: parseInt(process.env.ADMIN_RATE_WINDOW) || 1 * 60 * 1000, // 1 minute
      max: parseInt(process.env.ADMIN_RATE_MAX) || 100
    }
  },

  // Content Moderation Configuration
  moderation: {
    autoApprove: process.env.AUTO_APPROVE === 'true' || false,
    strictMode: process.env.STRICT_MODERATION === 'true' || false,
    profanityFilter: process.env.PROFANITY_FILTER === 'true' || true,
    spamDetection: process.env.SPAM_DETECTION === 'true' || true,
    maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH) || 1000,
    maxCommentDepth: parseInt(process.env.MAX_COMMENT_DEPTH) || 3,
    editWindowHours: parseInt(process.env.EDIT_WINDOW_HOURS) || 24
  },

  // Anti-Spam Configuration
  antiSpam: {
    minTimeBetweenComments: parseInt(process.env.MIN_TIME_BETWEEN_COMMENTS) || 10000, // 10 seconds
    duplicateContentWindow: parseInt(process.env.DUPLICATE_CONTENT_WINDOW) || 5 * 60 * 1000, // 5 minutes
    maxUrlsPerComment: parseInt(process.env.MAX_URLS_PER_COMMENT) || 1,
    suspiciousActivityThreshold: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD) || 3
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true' || false,
    logDirectory: process.env.LOG_DIRECTORY || './logs'
  },

  // Cache Configuration (for future Redis integration)
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true' || false,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL) || 300 // 5 minutes
  },

  // Feature Flags
  features: {
    enableThreading: process.env.ENABLE_THREADING !== 'false', // Default true
    enableLikes: process.env.ENABLE_LIKES !== 'false', // Default true
    enableReports: process.env.ENABLE_REPORTS !== 'false', // Default true
    enableBulkModeration: process.env.ENABLE_BULK_MODERATION !== 'false', // Default true
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false', // Default true
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false' // Default true
  },

  // Notification Configuration (for future integration)
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true' || false,
    webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || null,
    moderationAlerts: process.env.MODERATION_ALERTS === 'true' || false,
    spamAlerts: process.env.SPAM_ALERTS === 'true' || false
  },

  // Performance Configuration
  performance: {
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false', // Default true
    compressionLevel: parseInt(process.env.COMPRESSION_LEVEL) || 6,
    enableEtag: process.env.ENABLE_ETAG !== 'false', // Default true
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb'
  }
};

// Validation function to check required environment variables
const validateConfig = () => {
  const requiredInProduction = [
    'MONGODB_URI',
    'JWT_PUBLIC_KEY'
  ];

  if (config.server.environment === 'production') {
    const missingVars = requiredInProduction.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables for production:', missingVars);
      process.exit(1);
    }

    // Additional production checks
    if (!config.security.jwtPublicKey) {
      console.error('JWT_PUBLIC_KEY must be set in production');
      process.exit(1);
    }

    if (config.database.uri.includes('localhost')) {
      console.warn('Warning: Using localhost database URI in production');
    }
  }

  console.log(`Configuration loaded for ${config.server.environment} environment`);
  return true;
};

// Get configuration for specific environment
const getConfig = (environment = config.server.environment) => {
  const envSpecificConfig = { ...config };

  // Environment-specific overrides
  switch (environment) {
    case 'test':
      envSpecificConfig.database.uri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/comments_service_test';
      envSpecificConfig.logging.level = 'error';
      envSpecificConfig.rateLimiting.comments.max = 1000; // Higher limits for testing
      break;

    case 'development':
      envSpecificConfig.logging.level = 'debug';
      envSpecificConfig.moderation.autoApprove = true; // Auto-approve in dev
      break;

    case 'production':
      envSpecificConfig.moderation.strictMode = true;
      envSpecificConfig.security.trustProxy = true;
      break;
  }

  return envSpecificConfig;
};

// Export configuration object and utilities
module.exports = {
  ...config,
  validateConfig,
  getConfig,
  
  // Helper functions
  isDevelopment: () => config.server.environment === 'development',
  isProduction: () => config.server.environment === 'production',
  isTest: () => config.server.environment === 'test',
  
  // Configuration sections for easy access
  sections: {
    server: config.server,
    database: config.database,
    security: config.security,
    moderation: config.moderation,
    rateLimiting: config.rateLimiting,
    features: config.features
  }
};