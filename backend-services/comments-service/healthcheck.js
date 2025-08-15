// Health check script for Comments Service
// This script is used by Docker HEALTHCHECK instruction

const http = require('http');
const { MongoClient } = require('mongodb');
const redis = require('redis');

// Configuration
const config = {
  port: process.env.PORT || 4001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/comments_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  timeout: 5000
};

// Health check function
async function healthCheck() {
  const checks = {
    server: false,
    database: false,
    redis: false,
    overall: false
  };

  try {
    // Check HTTP server
    await checkHttpServer();
    checks.server = true;
    console.log('✓ HTTP server is healthy');

    // Check MongoDB connection
    await checkMongoDB();
    checks.database = true;
    console.log('✓ MongoDB connection is healthy');

    // Check Redis connection
    await checkRedis();
    checks.redis = true;
    console.log('✓ Redis connection is healthy');

    checks.overall = checks.server && checks.database && checks.redis;

    if (checks.overall) {
      console.log('✅ Comments service is healthy');
      process.exit(0);
    } else {
      throw new Error('Some health checks failed');
    }

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('Health check status:', checks);
    process.exit(1);
  }
}

// Check HTTP server
function checkHttpServer() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: config.port,
      path: '/health',
      method: 'GET',
      timeout: config.timeout
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`HTTP server returned status ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP server timeout'));
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP server error: ${error.message}`));
    });

    req.end();
  });
}

// Check MongoDB connection
async function checkMongoDB() {
  let client;
  try {
    client = new MongoClient(config.mongoUri, {
      serverSelectionTimeoutMS: config.timeout,
      connectTimeoutMS: config.timeout
    });

    await client.connect();
    
    // Ping the database
    await client.db().admin().ping();
    
    // Check if we can read from comments collection
    const commentsCollection = client.db().collection('comments');
    await commentsCollection.findOne({}, { projection: { _id: 1 } });

  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Check Redis connection
async function checkRedis() {
  let client;
  try {
    client = redis.createClient({
      url: config.redisUrl,
      socket: {
        connectTimeout: config.timeout,
        commandTimeout: config.timeout
      }
    });

    await client.connect();
    
    // Test Redis with ping
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }

    // Test basic operations
    await client.set('health_check', 'ok', { EX: 10 });
    const value = await client.get('health_check');
    if (value !== 'ok') {
      throw new Error('Redis set/get test failed');
    }

  } finally {
    if (client) {
      await client.quit();
    }
  }
}

// Run health check
healthCheck();