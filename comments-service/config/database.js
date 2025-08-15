const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/comments_service';
    
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB disconnection:', error);
        process.exit(1);
      }
    });

    return conn;

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
};

// Test database connection
const testConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('Database connection test: SUCCESS');
    return true;
  } catch (error) {
    console.error('Database connection test: FAILED', error);
    return false;
  }
};

// Initialize database indexes
const initializeIndexes = async () => {
  try {
    const Comment = require('../models/Comment');
    const Report = require('../models/Report');

    console.log('Creating database indexes...');
    
    await Promise.all([
      Comment.createIndexes(),
      Report.createIndexes()
    ]);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
  }
};

// Database health check
const healthCheck = async () => {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - start;

    const dbStats = await mongoose.connection.db.stats();
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      database: mongoose.connection.name,
      collections: dbStats.collections,
      dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  connectDB,
  testConnection,
  initializeIndexes,
  healthCheck
};