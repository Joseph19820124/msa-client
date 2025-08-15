const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

// Import configuration and database
const config = require('./config/config');
const { connectDB } = require('./config/database');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { 
  securityHeaders, 
  requestSanitization, 
  corsSecurityCheck 
} = require('./middleware/security');

// Import routes
const postsRoutes = require('./routes/posts');
const categoriesRoutes = require('./routes/categories');
const statsRoutes = require('./routes/stats');

// Import utilities
const { sendHealthCheck, sendNotFound } = require('./utils/response');

// Create Express app
const app = express();

// Trust proxy for proper IP detection behind reverse proxies
app.set('trust proxy', 1);

// Security middleware (apply first)
app.use(securityHeaders);
app.use(corsSecurityCheck);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Request processing middleware
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Request sanitization
app.use(requestSanitization);

// Logging middleware
if (config.nodeEnv !== 'test') {
  const logFormat = config.nodeEnv === 'development' 
    ? 'dev' 
    : 'combined';
  
  app.use(morgan(logFormat, {
    skip: (req, res) => {
      // Skip logging for health checks in production
      return config.nodeEnv === 'production' && req.path === '/health';
    }
  }));
}

// Health check endpoint (before other routes)
app.get('/health', (req, res) => {
  const healthData = {
    database: 'connected', // You could add actual DB health check here
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    environment: config.nodeEnv
  };
  
  sendHealthCheck(res, healthData);
});

// API routes
app.use('/posts', postsRoutes);
app.use('/categories', categoriesRoutes);
app.use('/stats', statsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Posts Service API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      posts: '/posts',
      categories: '/categories',
      stats: '/stats',
      health: '/health'
    },
    documentation: 'https://github.com/your-org/posts-service/blob/main/README.md'
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  sendNotFound(res, 'Endpoint', req.originalUrl);
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connection
    const mongoose = require('mongoose');
    mongoose.connection.close(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  if (config.nodeEnv === 'development') {
    console.error(err.stack);
  }
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  if (config.nodeEnv === 'development') {
    console.error(err.stack);
  }
  
  process.exit(1);
});

// Start server function
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Posts Service running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Health check: http://localhost:${config.port}/health`);
      
      if (config.nodeEnv === 'development') {
        console.log(`📚 API Base URL: http://localhost:${config.port}`);
        console.log(`📖 Posts: http://localhost:${config.port}/posts`);
        console.log(`🏷️  Categories: http://localhost:${config.port}/categories`);
        console.log(`📊 Stats: http://localhost:${config.port}/stats`);
      }
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    if (config.nodeEnv === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

// Export app for testing
module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}