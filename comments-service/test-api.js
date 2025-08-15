const axios = require('axios');

const BASE_URL = 'http://localhost:4001/api/v1';

// Test data
const testComment = {
  content: "This is a test comment for the blog post",
  author: {
    name: "Test User",
    email: "testuser@example.com"
  }
};

const testReport = {
  reason: "spam",
  description: "This comment appears to be spam content"
};

// Helper function to make API requests
const apiRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    };
  }
};

// Test health endpoint
async function testHealth() {
  console.log('\n🔍 Testing Health Endpoint...');
  const result = await apiRequest('GET', '../../health');
  console.log('Health Check:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (result.success) {
    console.log('Status:', result.data.status);
    console.log('Service:', result.data.service);
  } else {
    console.log('Error:', result.error);
  }
}

// Test root endpoint
async function testRoot() {
  console.log('\n🔍 Testing Root Endpoint...');
  const result = await apiRequest('GET', '../../');
  console.log('Root Endpoint:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (result.success) {
    console.log('Service:', result.data.service);
    console.log('Available Endpoints:', result.data.endpoints);
  } else {
    console.log('Error:', result.error);
  }
}

// Test get comments (should work even without database in demo mode)
async function testGetComments() {
  console.log('\n🔍 Testing Get Comments...');
  const result = await apiRequest('GET', '/posts/test-post-id/comments');
  console.log('Get Comments:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (result.success) {
    console.log('Comments retrieved successfully');
  } else {
    console.log('Error:', result.error);
  }
}

// Test create comment
async function testCreateComment() {
  console.log('\n🔍 Testing Create Comment...');
  const result = await apiRequest('POST', '/posts/test-post-id/comments', testComment);
  console.log('Create Comment:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (result.success) {
    console.log('Comment created successfully');
    return result.data.data._id; // Return comment ID for further tests
  } else {
    console.log('Error:', result.error);
    return null;
  }
}

// Test comment statistics
async function testCommentStats() {
  console.log('\n🔍 Testing Comment Statistics...');
  const result = await apiRequest('GET', '/posts/test-post-id/comments/stats');
  console.log('Comment Stats:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (result.success) {
    console.log('Statistics retrieved successfully');
  } else {
    console.log('Error:', result.error);
  }
}

// Test moderation queue (requires admin access)
async function testModerationQueue() {
  console.log('\n🔍 Testing Moderation Queue...');
  const result = await apiRequest('GET', '/admin/comments');
  console.log('Moderation Queue:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (result.success) {
    console.log('Moderation queue retrieved successfully');
  } else {
    console.log('Error:', result.error);
    if (result.status === 403) {
      console.log('Expected: Admin access required');
    }
  }
}

// Test 404 handling
async function test404() {
  console.log('\n🔍 Testing 404 Handling...');
  const result = await apiRequest('GET', '/non-existent-endpoint');
  console.log('404 Handling:', result.status === 404 ? '✅ PASSED' : '❌ FAILED');
  if (result.status === 404) {
    console.log('404 error handled correctly');
  } else {
    console.log('Unexpected response:', result);
  }
}

// Test validation errors
async function testValidation() {
  console.log('\n🔍 Testing Validation...');
  const invalidComment = {
    content: "", // Empty content should fail validation
    author: {
      name: "",
      email: "invalid-email"
    }
  };
  
  const result = await apiRequest('POST', '/posts/test-post-id/comments', invalidComment);
  console.log('Validation:', result.status === 400 ? '✅ PASSED' : '❌ FAILED');
  if (result.status === 400) {
    console.log('Validation errors handled correctly');
  } else {
    console.log('Unexpected response:', result);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Comments Service API Tests...');
  console.log('=====================================');

  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testHealth();
  await testRoot();
  await testGetComments();
  await testCreateComment();
  await testCommentStats();
  await testModerationQueue();
  await test404();
  await testValidation();

  console.log('\n=====================================');
  console.log('🏁 API Tests Completed!');
  console.log('\nNote: Some tests may fail due to database connectivity.');
  console.log('The Comments Service is designed to work with MongoDB.');
  console.log('Install and start MongoDB for full functionality.');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:4001/health', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Comments Service is not running on port 4001');
    console.log('Please start the service with: npm start');
    process.exit(1);
  }

  await runTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTests, testHealth, testGetComments, testCreateComment };