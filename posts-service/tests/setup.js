const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Global test setup variables
let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'posts_service_test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  console.log('Test database connected');
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
  
  console.log('Test database disconnected');
});

// Global test utilities
global.testUtils = {
  // Helper to create mock ObjectId
  createObjectId: () => new mongoose.Types.ObjectId(),
  
  // Helper to wait for promises
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate test data
  generateTestPost: (overrides = {}) => ({
    title: 'Test Post',
    content: 'This is a test post content',
    excerpt: 'This is a test excerpt',
    author: 'Test Author',
    slug: 'test-post',
    category: new mongoose.Types.ObjectId(),
    tags: ['test', 'jest'],
    status: 'published',
    featured: false,
    ...overrides
  }),
  
  generateTestCategory: (overrides = {}) => ({
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test category description',
    color: '#007bff',
    isActive: true,
    ...overrides
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
process.env.PORT = '4000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/posts_service_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests
});