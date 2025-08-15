const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:4001';
const API_BASE = `${BASE_URL}/api/v1`;

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Helper function to make API requests with error handling
const makeRequest = async (config) => {
  try {
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || null,
      error: error.message,
      headers: error.response?.headers || {}
    };
  }
};

// Test runner with detailed reporting
const runTest = async (testName, testFn) => {
  console.log(`\n🧪 Running: ${testName}`);
  console.log('─'.repeat(50));
  
  try {
    const result = await testFn();
    
    if (result.passed) {
      console.log(`✅ PASSED: ${testName}`);
      testResults.passed++;
    } else {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Reason: ${result.reason}`);
      testResults.failed++;
      testResults.errors.push({ test: testName, reason: result.reason });
    }
    
    testResults.details.push({
      test: testName,
      passed: result.passed,
      reason: result.reason,
      details: result.details || null
    });
    
  } catch (error) {
    console.log(`❌ ERROR: ${testName}`);
    console.log(`   Exception: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, reason: error.message });
  }
};

// 1. INVALID INPUT SCENARIOS
const testInvalidInputs = async () => {
  const tests = [
    {
      name: 'Empty comment content',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { content: '', author: { name: 'Test User', email: 'test@test.com' } }
      },
      expectedStatus: 400
    },
    {
      name: 'Missing author information',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { content: 'Valid content' }
      },
      expectedStatus: 400
    },
    {
      name: 'Invalid email format',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { content: 'Valid content', author: { name: 'Test', email: 'invalid-email' } }
      },
      expectedStatus: 400
    },
    {
      name: 'Extremely long content',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { 
          content: 'A'.repeat(10000), 
          author: { name: 'Test', email: 'test@test.com' } 
        }
      },
      expectedStatus: 400
    },
    {
      name: 'SQL injection attempt',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { 
          content: "'; DROP TABLE comments; --", 
          author: { name: 'Test', email: 'test@test.com' } 
        }
      },
      expectedStatus: [400, 201] // Should either reject or sanitize
    },
    {
      name: 'XSS attempt in content',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { 
          content: '<script>alert("xss")</script>', 
          author: { name: 'Test', email: 'test@test.com' } 
        }
      },
      expectedStatus: [400, 201] // Should either reject or sanitize
    },
    {
      name: 'Invalid JSON',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: '{ invalid json }',
        headers: { 'Content-Type': 'application/json' }
      },
      expectedStatus: 400
    },
    {
      name: 'Wrong Content-Type',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: 'plain text data',
        headers: { 'Content-Type': 'text/plain' }
      },
      expectedStatus: 400
    }
  ];
  
  let passed = 0;
  let details = [];
  
  for (const test of tests) {
    const result = await makeRequest(test.config);
    const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
    const statusMatch = expectedStatuses.includes(result.status);
    
    if (statusMatch) {
      passed++;
      console.log(`  ✅ ${test.name}: ${result.status}`);
    } else {
      console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${result.status}`);
      console.log(`     Response: ${JSON.stringify(result.data, null, 2)}`);
    }
    
    details.push({
      name: test.name,
      expected: test.expectedStatus,
      actual: result.status,
      passed: statusMatch,
      response: result.data
    });
  }
  
  return {
    passed: passed === tests.length,
    reason: passed === tests.length ? 'All input validation tests passed' : `${tests.length - passed} validation tests failed`,
    details
  };
};

// 2. MALFORMED REQUESTS
const testMalformedRequests = async () => {
  const tests = [
    {
      name: 'Request too large',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { 
          content: 'A'.repeat(50 * 1024 * 1024), // 50MB
          author: { name: 'Test', email: 'test@test.com' } 
        }
      },
      expectedStatus: 413
    },
    {
      name: 'Invalid HTTP method',
      config: {
        method: 'PATCH',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { content: 'test' }
      },
      expectedStatus: [405, 404]
    },
    {
      name: 'Missing required headers',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { content: 'test', author: { name: 'Test', email: 'test@test.com' } },
        headers: {} // No Content-Type
      },
      expectedStatus: [400, 201]
    },
    {
      name: 'Invalid URL encoding',
      config: {
        method: 'GET',
        url: `${API_BASE}/posts/test%2Fpost%2F%2F%2F/comments`
      },
      expectedStatus: [400, 404]
    }
  ];
  
  let passed = 0;
  let details = [];
  
  for (const test of tests) {
    try {
      const result = await makeRequest(test.config);
      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      const statusMatch = expectedStatuses.includes(result.status);
      
      if (statusMatch) {
        passed++;
        console.log(`  ✅ ${test.name}: ${result.status}`);
      } else {
        console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${result.status}`);
      }
      
      details.push({
        name: test.name,
        expected: test.expectedStatus,
        actual: result.status,
        passed: statusMatch,
        error: null
      });
    } catch (error) {
      console.log(`  ⚠️  ${test.name}: Request failed with ${error.message}`);
      details.push({
        name: test.name,
        expected: test.expectedStatus,
        actual: 'ERROR',
        passed: false,
        error: error.message
      });
    }
  }
  
  return {
    passed: passed === tests.length,
    reason: passed === tests.length ? 'All malformed request tests passed' : `${tests.length - passed} malformed request tests failed`,
    details
  };
};

// 3. RATE LIMITING TESTS
const testRateLimiting = async () => {
  console.log('  Testing rate limiting by sending rapid requests...');
  
  const requests = [];
  const requestCount = 20; // Send 20 requests rapidly
  
  for (let i = 0; i < requestCount; i++) {
    requests.push(makeRequest({
      method: 'GET',
      url: `${API_BASE}/posts/test-post/comments`,
    }));
  }
  
  const results = await Promise.all(requests);
  const rateLimitedRequests = results.filter(r => r.status === 429);
  const successfulRequests = results.filter(r => r.status === 200 || r.status === 404);
  
  console.log(`  📊 Sent ${requestCount} requests: ${successfulRequests.length} successful, ${rateLimitedRequests.length} rate-limited`);
  
  // Check if rate limiting headers are present
  const hasRateLimitHeaders = results.some(r => 
    r.headers['x-ratelimit-limit'] || 
    r.headers['x-ratelimit-remaining'] ||
    r.headers['retry-after']
  );
  
  return {
    passed: rateLimitedRequests.length > 0 || hasRateLimitHeaders,
    reason: rateLimitedRequests.length > 0 
      ? `Rate limiting working: ${rateLimitedRequests.length} requests were rate-limited`
      : hasRateLimitHeaders 
        ? 'Rate limiting headers present'
        : 'Rate limiting may not be properly configured',
    details: {
      totalRequests: requestCount,
      successful: successfulRequests.length,
      rateLimited: rateLimitedRequests.length,
      hasHeaders: hasRateLimitHeaders
    }
  };
};

// 4. BOUNDARY CONDITION TESTS
const testBoundaryConditions = async () => {
  const tests = [
    {
      name: 'Empty post ID',
      config: {
        method: 'GET',
        url: `${API_BASE}/posts//comments`
      },
      expectedStatus: [400, 404]
    },
    {
      name: 'Very long post ID',
      config: {
        method: 'GET',
        url: `${API_BASE}/posts/${'a'.repeat(1000)}/comments`
      },
      expectedStatus: [400, 404]
    },
    {
      name: 'Special characters in post ID',
      config: {
        method: 'GET',
        url: `${API_BASE}/posts/test@#$%^&*()_+/comments`
      },
      expectedStatus: [400, 404]
    },
    {
      name: 'Unicode characters in content',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { 
          content: '测试内容 🚀 emoji test 🎉', 
          author: { name: 'Test', email: 'test@test.com' } 
        }
      },
      expectedStatus: [200, 201, 400]
    },
    {
      name: 'Null values',
      config: {
        method: 'POST',
        url: `${API_BASE}/posts/test-post/comments`,
        data: { 
          content: null, 
          author: null 
        }
      },
      expectedStatus: 400
    }
  ];
  
  let passed = 0;
  let details = [];
  
  for (const test of tests) {
    const result = await makeRequest(test.config);
    const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
    const statusMatch = expectedStatuses.includes(result.status);
    
    if (statusMatch) {
      passed++;
      console.log(`  ✅ ${test.name}: ${result.status}`);
    } else {
      console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${result.status}`);
    }
    
    details.push({
      name: test.name,
      expected: test.expectedStatus,
      actual: result.status,
      passed: statusMatch
    });
  }
  
  return {
    passed: passed === tests.length,
    reason: passed === tests.length ? 'All boundary condition tests passed' : `${tests.length - passed} boundary tests failed`,
    details
  };
};

// 5. SECURITY EDGE CASES
const testSecurityEdgeCases = async () => {
  const tests = [
    {
      name: 'Missing Authorization header',
      config: {
        method: 'DELETE',
        url: `${API_BASE}/comments/test-comment-id`
      },
      expectedStatus: [401, 403, 404]
    },
    {
      name: 'Invalid JWT token',
      config: {
        method: 'DELETE',
        url: `${API_BASE}/comments/test-comment-id`,
        headers: {
          'Authorization': 'Bearer invalid.jwt.token'
        }
      },
      expectedStatus: [401, 403]
    },
    {
      name: 'Expired JWT token',
      config: {
        method: 'DELETE',
        url: `${API_BASE}/comments/test-comment-id`,
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired'
        }
      },
      expectedStatus: [401, 403]
    },
    {
      name: 'CORS preflight check',
      config: {
        method: 'OPTIONS',
        url: `${API_BASE}/posts/test-post/comments`,
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST'
        }
      },
      expectedStatus: [200, 204, 404]
    },
    {
      name: 'Admin endpoint without authorization',
      config: {
        method: 'GET',
        url: `${API_BASE}/admin/comments`
      },
      expectedStatus: [401, 403, 404]
    }
  ];
  
  let passed = 0;
  let details = [];
  
  for (const test of tests) {
    const result = await makeRequest(test.config);
    const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
    const statusMatch = expectedStatuses.includes(result.status);
    
    if (statusMatch) {
      passed++;
      console.log(`  ✅ ${test.name}: ${result.status}`);
    } else {
      console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${result.status}`);
    }
    
    details.push({
      name: test.name,
      expected: test.expectedStatus,
      actual: result.status,
      passed: statusMatch
    });
  }
  
  return {
    passed: passed === tests.length,
    reason: passed === tests.length ? 'All security tests passed' : `${tests.length - passed} security tests failed`,
    details
  };
};

// 6. SERVICE HEALTH AND ERROR RESPONSES
const testServiceHealth = async () => {
  const tests = [
    {
      name: 'Health endpoint',
      config: {
        method: 'GET',
        url: `${BASE_URL}/health`
      },
      expectedStatus: [200, 503]
    },
    {
      name: 'Root endpoint',
      config: {
        method: 'GET',
        url: BASE_URL
      },
      expectedStatus: 200
    },
    {
      name: 'Non-existent endpoint',
      config: {
        method: 'GET',
        url: `${API_BASE}/non-existent-endpoint`
      },
      expectedStatus: 404
    }
  ];
  
  let passed = 0;
  let details = [];
  
  for (const test of tests) {
    const result = await makeRequest(test.config);
    const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
    const statusMatch = expectedStatuses.includes(result.status);
    
    if (statusMatch) {
      passed++;
      console.log(`  ✅ ${test.name}: ${result.status}`);
      if (test.name === 'Health endpoint' && result.data) {
        console.log(`     Service: ${result.data.service || 'Unknown'}`);
        console.log(`     Status: ${result.data.status || 'Unknown'}`);
      }
    } else {
      console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${result.status}`);
    }
    
    details.push({
      name: test.name,
      expected: test.expectedStatus,
      actual: result.status,
      passed: statusMatch,
      response: result.data
    });
  }
  
  return {
    passed: passed === tests.length,
    reason: passed === tests.length ? 'All service health tests passed' : `${tests.length - passed} health tests failed`,
    details
  };
};

// Check if service is available
const checkServiceAvailability = async () => {
  try {
    const result = await makeRequest({
      method: 'GET',
      url: `${BASE_URL}/health`,
      timeout: 5000
    });
    
    return result.success || result.status > 0;
  } catch (error) {
    return false;
  }
};

// Generate test report
const generateReport = () => {
  const total = testResults.passed + testResults.failed;
  const successRate = total > 0 ? (testResults.passed / total * 100).toFixed(1) : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE ERROR TESTING REPORT');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${successRate}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.reason}`);
    });
  }
  
  // Save detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: `${successRate}%`
    },
    errors: testResults.errors,
    details: testResults.details
  };
  
  const reportPath = path.join(__dirname, 'error-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
};

// Main test execution
const runAllTests = async () => {
  console.log('🚀 STARTING COMPREHENSIVE ERROR TESTING');
  console.log('Testing Comments Service Error Handling and Edge Cases');
  console.log('='.repeat(60));
  
  // Check if service is running
  const serviceAvailable = await checkServiceAvailability();
  if (!serviceAvailable) {
    console.log('❌ Comments Service is not available');
    console.log('Please ensure the service is running on port 4001');
    console.log('\nNote: Some tests will still run to test error scenarios');
  } else {
    console.log('✅ Comments Service is available - starting tests');
  }
  
  // Run all test suites
  await runTest('Invalid Input Scenarios', testInvalidInputs);
  await runTest('Malformed Requests', testMalformedRequests);
  await runTest('Rate Limiting', testRateLimiting);
  await runTest('Boundary Conditions', testBoundaryConditions);
  await runTest('Security Edge Cases', testSecurityEdgeCases);
  await runTest('Service Health', testServiceHealth);
  
  // Generate final report
  generateReport();
};

// Export for use in other test files
module.exports = {
  runAllTests,
  testInvalidInputs,
  testMalformedRequests,
  testRateLimiting,
  testBoundaryConditions,
  testSecurityEdgeCases,
  testServiceHealth
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}