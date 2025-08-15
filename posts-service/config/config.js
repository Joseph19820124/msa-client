require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/posts-service',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/posts-service-test'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  
  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100
  },
  
  // Search Configuration
  search: {
    indexFields: (process.env.SEARCH_INDEX_FIELDS || 'title,content').split(',')
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validation
if (config.nodeEnv === 'production') {
  if (config.jwt.secret === 'fallback-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set in production environment');
  }
}

module.exports = config;