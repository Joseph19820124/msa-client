# Comprehensive Test Suite

This directory contains a comprehensive test suite for the microservices blog platform, covering unit tests, integration tests, end-to-end tests, security tests, and performance tests.

## 📁 Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   └── user-workflows.test.js
├── security/               # Security tests
│   └── security.test.js
├── performance/            # Performance tests
│   └── load.test.js
└── README.md              # This file

posts-service/tests/
├── setup.js               # Test setup and utilities
├── unit/                  # Unit tests
│   ├── controllers/       # Controller tests
│   └── models/           # Model tests
└── integration/          # Integration tests
    └── api.test.js

comments-service/tests/
├── setup.js               # Test setup and utilities
├── unit/                  # Unit tests
│   ├── controllers/       # Controller tests
│   └── models/           # Model tests
└── integration/          # Integration tests
    └── api.test.js
```

## 🧪 Test Types

### Unit Tests
- **Location**: `{service}/tests/unit/`
- **Purpose**: Test individual components in isolation
- **Coverage**: Controllers, models, utilities, middleware
- **Database**: In-memory MongoDB (mongodb-memory-server)
- **Mocking**: External dependencies are mocked

### Integration Tests
- **Location**: `{service}/tests/integration/`
- **Purpose**: Test API endpoints with real database
- **Coverage**: Full request/response cycles, database operations
- **Database**: In-memory MongoDB with realistic data
- **Network**: Real HTTP requests using supertest

### End-to-End Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows across services
- **Coverage**: Cross-service communication, user journeys
- **Services**: Both posts and comments services running
- **Scenarios**: Blog reader, content creator, moderator workflows

### Security Tests
- **Location**: `tests/security/`
- **Purpose**: Validate security measures and prevent vulnerabilities
- **Coverage**: XSS, injection attacks, authentication, authorization
- **Scope**: Input validation, rate limiting, data exposure

### Performance Tests
- **Location**: `tests/performance/`
- **Purpose**: Ensure system performance under load
- **Coverage**: Response times, concurrent requests, scalability
- **Metrics**: Latency, throughput, memory usage, error rates

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies for all services
cd posts-service && npm install
cd ../comments-service && npm install
cd ../
```

### Individual Service Tests
```bash
# Posts Service
cd posts-service
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # With coverage report

# Comments Service
cd comments-service
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:security      # Security tests only
npm run test:coverage      # With coverage report
```

### Cross-Service Tests
```bash
# From project root
npm test                    # All tests (if configured)

# Or run specific test types
npx jest tests/e2e/         # End-to-end tests
npx jest tests/security/    # Security tests
npx jest tests/performance/ # Performance tests
```

### Continuous Integration
```bash
# CI-optimized test runs
npm run test:ci             # Non-interactive, with coverage
```

## 📊 Coverage Reports

Test coverage reports are generated in the `coverage/` directory for each service:

- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: `coverage/lcov.info`
- **JSON Summary**: `coverage/coverage-summary.json`

### Coverage Thresholds
- **Global**: 80% minimum coverage
- **Controllers**: 85% minimum coverage
- **Models**: 90% minimum coverage

## 🔧 Test Configuration

### Jest Configuration
Each service has its own `jest.config.js` with:
- Test environment: Node.js
- Setup files: Custom test utilities
- Coverage collection: Automatic
- Timeout: 30 seconds for integration tests
- Memory management: Force exit and detect open handles

### Environment Variables
Tests use the following environment variables:
```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test_db
JWT_SECRET=test-jwt-secret
CORS_ORIGIN=http://localhost:3000
```

## 🎯 Test Utilities

### Global Test Utils (posts-service)
```javascript
testUtils.createObjectId()              // Generate test ObjectId
testUtils.generateTestPost(overrides)   // Generate test post data
testUtils.generateTestCategory(overrides) // Generate test category data
testUtils.wait(ms)                      // Async delay utility
```

### Global Test Utils (comments-service)
```javascript
testUtils.generateTestComment(overrides) // Generate test comment data
testUtils.generateTestReport(overrides)  // Generate test report data
testUtils.generateAuthToken(payload)     // Generate JWT tokens
testUtils.generateAdminToken(payload)    // Generate admin JWT tokens
testUtils.hashPassword(password)         // Hash passwords for tests
```

### Custom Jest Matchers
```javascript
expect(id).toBeValidObjectId()          // Validate MongoDB ObjectId
expect(date).toHaveValidTimestamp()     // Validate timestamp format
```

## 🐛 Debugging Tests

### Running Individual Test Files
```bash
npx jest tests/unit/controllers/postsController.test.js --verbose
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm test

# Node.js debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues

1. **Database Connection Errors**
   - Ensure MongoDB memory server starts properly
   - Check for port conflicts
   - Verify test cleanup in `afterEach` hooks

2. **Test Timeouts**
   - Increase timeout in jest.config.js
   - Check for unresolved promises
   - Ensure proper test cleanup

3. **Memory Leaks**
   - Use `--detectOpenHandles` flag
   - Check for unclosed database connections
   - Verify mock cleanup

## 📋 Test Scenarios

### Posts Service Test Scenarios
- **CRUD Operations**: Create, read, update, delete posts
- **Filtering**: By category, status, author, tags
- **Pagination**: Large datasets, page navigation
- **Search**: Full-text search functionality
- **Statistics**: View counts, likes, analytics
- **Validation**: Input validation, data constraints

### Comments Service Test Scenarios
- **Comment Lifecycle**: Create, approve, moderate, delete
- **Moderation**: Admin workflows, report handling
- **User Interactions**: Likes, reports, filtering
- **Security**: XSS prevention, content sanitization
- **Rate Limiting**: Spam prevention, DoS protection

### Cross-Service Test Scenarios
- **User Journeys**: Complete blog interaction workflows
- **Data Consistency**: Cross-service data integrity
- **Error Handling**: Service unavailability, recovery
- **Performance**: Load testing, concurrent users

## 🔒 Security Test Coverage

### Input Validation
- XSS attack prevention
- SQL/NoSQL injection prevention
- Command injection prevention
- Path traversal prevention

### Authentication & Authorization
- JWT token validation
- Role-based access control
- Session management
- Privilege escalation prevention

### Data Protection
- Sensitive data exposure
- CORS configuration
- HTTP security headers
- Error information leakage

## ⚡ Performance Test Metrics

### Response Time Thresholds
- **Fast**: < 100ms (health checks, simple queries)
- **Acceptable**: < 500ms (standard operations)
- **Slow**: < 2000ms (complex queries, aggregations)
- **Timeout**: < 10000ms (maximum allowed)

### Load Test Scenarios
- **Light Load**: 10 concurrent users
- **Medium Load**: 50 concurrent users
- **Heavy Load**: 200 concurrent users
- **Stress Test**: 500 concurrent users

### Performance Metrics
- Response time percentiles (P50, P95, P99)
- Throughput (requests per second)
- Error rate (% of failed requests)
- Memory usage and garbage collection
- Database query performance

## 📈 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:4.4
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v2
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit",
      "pre-push": "npm run test:ci"
    }
  }
}
```

## 🎯 Best Practices

### Test Organization
- One test file per source file
- Descriptive test names
- Logical test grouping with `describe` blocks
- Clear setup and teardown

### Test Data Management
- Use factories for test data generation
- Clean database state between tests
- Avoid hard-coded test data
- Use meaningful test data

### Assertion Quality
- Specific assertions over generic ones
- Test both positive and negative cases
- Verify error conditions
- Check side effects

### Performance Considerations
- Run tests in parallel when possible
- Use in-memory databases for speed
- Mock external dependencies
- Optimize test data creation

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🤝 Contributing

When adding new tests:
1. Follow existing test structure and patterns
2. Add appropriate test coverage for new features
3. Update this documentation if needed
4. Ensure all tests pass before submitting
5. Include both positive and negative test cases

---

**Test Coverage Goal**: Maintain >90% code coverage across all services while ensuring meaningful test scenarios that validate both functionality and edge cases.