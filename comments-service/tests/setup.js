const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

// Global test setup variables
let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27018, // Different port from posts service
      dbName: 'comments_service_test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  console.log('Comments service test database connected');
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('Comments service test database disconnected');
});

// Global test utilities
global.testUtils = {
  // Helper to create mock ObjectId
  createObjectId: () => new mongoose.Types.ObjectId(),
  
  // Helper to wait for promises
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate test comment data
  generateTestComment: (overrides = {}) => ({
    content: 'This is a test comment content that meets minimum length requirements',
    author: {
      name: 'Test User',
      email: 'testuser@example.com'
    },
    postId: new mongoose.Types.ObjectId(),
    status: 'approved',
    isReported: false,
    reportCount: 0,
    likes: 0,
    ...overrides
  }),
  
  // Helper to generate test report data
  generateTestReport: (overrides = {}) => ({
    commentId: new mongoose.Types.ObjectId(),
    reportedBy: {
      name: 'Reporter User',
      email: 'reporter@example.com'
    },
    reason: 'spam',
    description: 'This comment appears to be spam',
    status: 'pending',
    ...overrides
  }),
  
  // Helper to generate JWT token for authentication
  generateAuthToken: (payload = {}) => {
    const defaultPayload = {
      userId: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'user',
      ...payload
    };
    
    return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h'
    });
  },
  
  // Helper to generate admin JWT token
  generateAdminToken: (payload = {}) => {
    const adminPayload = {
      userId: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      role: 'admin',
      ...payload
    };
    
    return jwt.sign(adminPayload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h'
    });
  },
  
  // Helper to hash password
  hashPassword: async (password) => {
    return await bcryptjs.hash(password, 12);
  },
  
  // Helper to create test user data
  generateTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'password123',
    role: 'user',
    isActive: true,
    ...overrides
  }),
  
  // Helper to generate mock external API responses
  generateMockAPIResponse: (data = {}, success = true) => ({
    success,
    data,
    timestamp: new Date().toISOString(),
    ...(success ? {} : { error: { message: 'Mock API error' } })
  }),
  
  // Helper to create test headers with authentication
  createAuthHeaders: (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }),
  
  // Helper to simulate rate limiting
  simulateRateLimit: () => ({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 3600
  })
};

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Restore console for certain test files if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.MONGODB_URI = 'mongodb://localhost:27018/comments_service_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.ENABLE_COMPRESSION = 'true';
process.env.MAX_REQUEST_SIZE = '10mb';
process.env.TRUST_PROXY = 'false';

// Mock external services
global.mockExternalServices = {
  // Mock posts service API
  postsService: {
    getPost: jest.fn().mockResolvedValue({
      success: true,
      data: {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Post',
        status: 'published'
      }
    }),
    
    updateCommentCount: jest.fn().mockResolvedValue({
      success: true,
      data: { commentsCount: 1 }
    })
  },
  
  // Mock notification service
  notificationService: {
    sendNotification: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-message-id'
    })
  },
  
  // Mock content filtering service
  contentFilter: {
    analyze: jest.fn().mockResolvedValue({
      isSpam: false,
      toxicityScore: 0.1,
      categories: []
    })
  }
};

// Mock middleware functions
global.mockMiddleware = {
  // Mock authentication middleware
  auth: jest.fn((req, res, next) => {
    req.user = {
      userId: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'user'
    };
    next();
  }),
  
  // Mock admin authentication middleware
  adminAuth: jest.fn((req, res, next) => {
    req.user = {
      userId: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      role: 'admin'
    };
    next();
  }),
  
  // Mock rate limiting middleware
  rateLimit: jest.fn((req, res, next) => next()),
  
  // Mock validation middleware
  validate: jest.fn((req, res, next) => next())
};

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests
});

// Global test configuration
global.testConfig = {
  // Default timeouts
  defaultTimeout: 10000,
  dbTimeout: 30000,
  
  // Test data limits
  maxCommentLength: 5000,
  minCommentLength: 10,
  maxReportDescriptionLength: 1000,
  
  // Rate limiting
  rateLimit: {
    windowMs: 900000, // 15 minutes
    maxRequests: 100
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};

// Jest custom matchers
expect.extend({
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },
  
  toHaveValidTimestamp(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  }
});