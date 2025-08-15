// Health check script for API Gateway
// This script is used by Docker HEALTHCHECK instruction

const http = require('http');
const redis = require('redis');

// Configuration
const config = {
  port: process.env.PORT || 5000,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  postsServiceUrl: process.env.POSTS_SERVICE_URL || 'http://localhost:4000',
  commentsServiceUrl: process.env.COMMENTS_SERVICE_URL || 'http://localhost:4001',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4002',
  timeout: 5000
};

// Health check function
async function healthCheck() {
  const checks = {
    server: false,
    redis: false,
    postsService: false,
    commentsService: false,
    authService: false,
    overall: false
  };

  try {
    // Check HTTP server
    await checkHttpServer();
    checks.server = true;
    console.log('✓ HTTP server is healthy');

    // Check Redis connection
    await checkRedis();
    checks.redis = true;
    console.log('✓ Redis connection is healthy');

    // Check downstream services
    await checkDownstreamService('posts', config.postsServiceUrl);
    checks.postsService = true;
    console.log('✓ Posts service is healthy');

    await checkDownstreamService('comments', config.commentsServiceUrl);
    checks.commentsService = true;
    console.log('✓ Comments service is healthy');

    await checkDownstreamService('auth', config.authServiceUrl);
    checks.authService = true;
    console.log('✓ Auth service is healthy');

    checks.overall = checks.server && checks.redis && 
                     checks.postsService && checks.commentsService && checks.authService;

    if (checks.overall) {
      console.log('✅ API Gateway is healthy');
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

// Check downstream service
function checkDownstreamService(serviceName, serviceUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL('/health', serviceUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: config.timeout
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`${serviceName} service returned status ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`${serviceName} service timeout`));
    });

    req.on('error', (error) => {
      reject(new Error(`${serviceName} service error: ${error.message}`));
    });

    req.end();
  });
}

// Run health check
healthCheck();