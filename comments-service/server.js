const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

// Import configuration and database
const config = require('./config/environment');
const { connectDB, initializeIndexes, healthCheck } = require('./config/database');

// Import routes
const commentsRoutes = require('./routes/comments');
const moderationRoutes = require('./routes/moderation');

// Import middleware
const { basicRateLimit } = require('./middleware/rateLimiting');

// Initialize Express app
const app = express();

// Validate configuration
config.validateConfig();

// Trust proxy if configured (for accurate IP addresses behind load balancers)
if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}

// SECURITY MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
app.use(cors({
  origin: config.security.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// COMPRESSION
if (config.performance.enableCompression) {
  app.use(compression({
    level: config.performance.compressionLevel,
    threshold: 1024 // Only compress if larger than 1KB
  }));
}

// LOGGING
if (config.isDevelopment()) {
  app.use(morgan('dev'));
} else {
  app.use(morgan(config.logging.format));
}

// BODY PARSING
app.use(express.json({ 
  limit: config.performance.maxRequestSize,
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: config.performance.maxRequestSize 
}));

// SANITIZATION
app.use(mongoSanitize({
  replaceWith: '_'
}));

// RATE LIMITING (Apply to all routes)
app.use(basicRateLimit);

// HEALTH CHECK ENDPOINT (before other routes)
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const memoryUsage = process.memoryUsage();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'comments-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.environment,
      uptime: process.uptime(),
      database: dbHealth,
      memory: {
        used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
      },
      features: config.features
    };

    // Determine status based on health checks
    if (dbHealth.status !== 'healthy') {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API ROUTES
app.use('/api/v1', commentsRoutes);
app.use('/api/v1', moderationRoutes);

// ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    service: 'Comments Service',
    version: '1.0.0',
    environment: config.server.environment,
    endpoints: {
      health: '/health',
      comments: '/api/v1/posts/:post_id/comments',
      moderation: '/api/v1/admin/comments',
      reports: '/api/v1/admin/reports'
    },
    documentation: {
      swagger: '/api/docs', // Future implementation
      postman: '/api/postman' // Future implementation
    }
  });
});

// 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/v1/posts/:post_id/comments',
      'POST /api/v1/posts/:post_id/comments',
      'PUT /api/v1/comments/:id',
      'DELETE /api/v1/comments/:id',
      'POST /api/v1/comments/:id/like',
      'POST /api/v1/comments/:id/report',
      'GET /api/v1/admin/comments',
      'PATCH /api/v1/admin/comments/:id',
      'GET /api/v1/admin/reports',
      'PATCH /api/v1/admin/reports/:id'
    ]
  });
});

// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'MONGOOSE_VALIDATION_ERROR',
      details: validationErrors
    });
  }

  // Mongoose cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_OBJECT_ID',
      field: error.path,
      value: error.value
    });
  }

  // MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      error: 'Duplicate entry',
      code: 'DUPLICATE_KEY_ERROR',
      field,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_JWT_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'JWT_TOKEN_EXPIRED'
    });
  }

  // Request size errors
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request too large',
      code: 'REQUEST_TOO_LARGE',
      limit: config.performance.maxRequestSize
    });
  }

  // Syntax errors in JSON
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON format',
      code: 'INVALID_JSON'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: config.isProduction() ? 'Internal server error' : error.message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(config.isDevelopment() && { stack: error.stack })
  });
});

// GRACEFUL SHUTDOWN HANDLER
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  if (global.server) {
    global.server.close((error) => {
      if (error) {
        console.error('Error during server shutdown:', error);
        process.exit(1);
      }
      
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    console.log('No server instance found, exiting immediately');
    process.exit(0);
  }
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// SIGNAL HANDLERS
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// UNHANDLED PROMISE REJECTIONS
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  if (config.isProduction()) {
    gracefulShutdown('unhandledRejection');
  }
});

// UNCAUGHT EXCEPTIONS
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// START SERVER
const startServer = async () => {
  try {
    // Connect to database
    console.log('Connecting to database...');
    await connectDB();
    
    // Initialize database indexes
    console.log('Initializing database indexes...');
    await initializeIndexes();
    
    // Start HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      console.log(`
🚀 Comments Service started successfully!
📍 Environment: ${config.server.environment}
🌐 Server: http://${config.server.host}:${config.server.port}
🔗 Health: http://${config.server.host}:${config.server.port}/health
📊 Database: ${config.database.uri.replace(/\/\/.*@/, '//***:***@')}
🛡️  Security: ${config.security.corsOrigins.join(', ')}
⚡ Features: ${Object.entries(config.features).filter(([_, enabled]) => enabled).map(([name]) => name).join(', ')}
      `);
    });

    // Export server for graceful shutdown
    global.server = server;
    
    return server;
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };