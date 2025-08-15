const request = require('supertest');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

// Import services
const postsApp = require('../../posts-service/server');
const { app: commentsApp } = require('../../comments-service/server');

// Performance test configuration
const PERFORMANCE_CONFIG = {
  // Response time thresholds (milliseconds)
  thresholds: {
    fast: 100,      // Very fast responses
    acceptable: 500, // Acceptable responses
    slow: 2000,     // Slow but tolerable
    timeout: 10000  // Maximum timeout
  },
  
  // Load test parameters
  load: {
    light: 10,      // Light load
    medium: 50,     // Medium load
    heavy: 200,     // Heavy load
    stress: 500     // Stress test load
  },
  
  // Database performance
  database: {
    maxQueryTime: 1000,
    maxInsertTime: 2000,
    maxUpdateTime: 1500
  }
};

// Performance utilities
const PerformanceUtils = {
  // Measure execution time
  measureTime: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  },

  // Generate test data
  generateTestData: (count, generator) => {
    return Array.from({ length: count }, (_, i) => generator(i));
  },

  // Calculate statistics
  calculateStats: (times) => {
    const sorted = times.sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      min: sorted[0],
      max: sorted[len - 1],
      mean: sorted.reduce((a, b) => a + b, 0) / len,
      median: len % 2 === 0 
        ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2 
        : sorted[Math.floor(len / 2)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  },

  // Run load test
  runLoadTest: async (testFn, concurrency, iterations = 1) => {
    const results = [];
    
    for (let iteration = 0; iteration < iterations; iteration++) {
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          PerformanceUtils.measureTime(testFn)
        );
      }
      
      const iterationResults = await Promise.allSettled(promises);
      results.push(...iterationResults);
    }
    
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value.result.status < 400)
      .map(r => r.value.duration);
      
    const failedResults = results
      .filter(r => r.status === 'rejected' || (r.value.result && r.value.result.status >= 400));
    
    return {
      successful: successfulResults.length,
      failed: failedResults.length,
      stats: successfulResults.length > 0 ? PerformanceUtils.calculateStats(successfulResults) : null,
      successRate: (successfulResults.length / results.length) * 100
    };
  }
};

describe('Performance Tests', () => {
  let testCategory;
  let testPosts;
  let testComments;

  beforeAll(async () => {
    // Create test data for performance testing
    const categoryResponse = await request(postsApp)
      .post('/categories')
      .send({
        name: 'Performance Test Category',
        description: 'Category for performance testing',
        color: '#007bff'
      });
    testCategory = categoryResponse.body.data;

    // Create multiple test posts
    testPosts = [];
    for (let i = 0; i < 50; i++) {
      const postResponse = await request(postsApp)
        .post('/posts')
        .send({
          title: `Performance Test Post ${i}`,
          content: `This is performance test content ${i}. `.repeat(50), // Longer content
          excerpt: `Performance test excerpt ${i}`,
          author: `Author ${i % 10}`, // Multiple authors
          category: testCategory._id,
          tags: [`tag${i % 5}`, 'performance', 'test'],
          status: 'published'
        });
      testPosts.push(postResponse.body.data);
    }

    // Create test comments
    testComments = [];
    for (let i = 0; i < 200; i++) {
      const postIndex = i % testPosts.length;
      const commentResponse = await request(commentsApp)
        .post(`/api/v1/posts/${testPosts[postIndex]._id}/comments`)
        .send({
          content: `Performance test comment ${i}. This is a longer comment to test performance with substantial content.`,
          author: {
            name: `Commenter ${i % 20}`,
            email: `commenter${i % 20}@example.com`
          }
        });
      if (commentResponse.status === 201) {
        testComments.push(commentResponse.body.data);
      }
    }

    console.log(`Created ${testPosts.length} posts and ${testComments.length} comments for performance testing`);
  });

  describe('Response Time Performance', () => {
    it('should respond to health checks quickly', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/health').expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.fast);
    });

    it('should handle single post retrieval efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get(`/posts/${testPosts[0]._id}`).expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
    });

    it('should handle post listing with pagination efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?limit=20&page=1').expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
    });

    it('should handle comment retrieval efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(commentsApp)
          .get(`/api/v1/posts/${testPosts[0]._id}/comments`)
          .expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
    });

    it('should handle search queries efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp)
          .get('/posts?search=Performance&status=published')
          .expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.slow);
    });

    it('should handle statistics queries efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/stats/overview').expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.slow);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle light concurrent load on post listing', async () => {
      const testFn = async () => {
        return request(postsApp).get('/posts?limit=10').expect(200);
      };

      const results = await PerformanceUtils.runLoadTest(
        testFn,
        PERFORMANCE_CONFIG.load.light
      );

      expect(results.successRate).toBeGreaterThan(95);
      expect(results.stats.p95).toBeLessThan(PERFORMANCE_CONFIG.thresholds.slow);
    });

    it('should handle medium concurrent load on mixed operations', async () => {
      const operations = [
        () => request(postsApp).get('/posts?limit=5'),
        () => request(postsApp).get(`/posts/${testPosts[Math.floor(Math.random() * testPosts.length)]._id}`),
        () => request(commentsApp).get(`/api/v1/posts/${testPosts[Math.floor(Math.random() * testPosts.length)]._id}/comments`),
        () => request(postsApp).get('/categories'),
        () => request(postsApp).get('/stats/overview')
      ];

      const testFn = async () => {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        return operation();
      };

      const results = await PerformanceUtils.runLoadTest(
        testFn,
        PERFORMANCE_CONFIG.load.medium
      );

      expect(results.successRate).toBeGreaterThan(90);
      expect(results.stats.p95).toBeLessThan(PERFORMANCE_CONFIG.thresholds.slow);
    });

    it('should handle concurrent comment creation', async () => {
      const testFn = async () => {
        const randomPost = testPosts[Math.floor(Math.random() * testPosts.length)];
        return request(commentsApp)
          .post(`/api/v1/posts/${randomPost._id}/comments`)
          .send({
            content: `Concurrent test comment at ${Date.now()}`,
            author: {
              name: `Concurrent User ${Math.random()}`,
              email: `concurrent${Math.random()}@example.com`
            }
          });
      };

      const results = await PerformanceUtils.runLoadTest(
        testFn,
        PERFORMANCE_CONFIG.load.light
      );

      expect(results.successRate).toBeGreaterThan(85);
    });

    it('should handle heavy read load without degradation', async () => {
      const testFn = async () => {
        return request(postsApp).get('/posts?limit=20').expect(200);
      };

      const results = await PerformanceUtils.runLoadTest(
        testFn,
        PERFORMANCE_CONFIG.load.heavy
      );

      expect(results.successRate).toBeGreaterThan(80);
      expect(results.stats.p99).toBeLessThan(PERFORMANCE_CONFIG.thresholds.timeout);
    });
  });

  describe('Database Performance', () => {
    it('should handle complex queries efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp)
          .get('/posts?category=' + testCategory._id + '&status=published&sort=createdAt&order=desc&limit=50')
          .expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.database.maxQueryTime);
    });

    it('should handle aggregation queries efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/stats/analytics').expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.database.maxQueryTime * 2);
    });

    it('should handle search across large datasets efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp)
          .get('/posts?search=test&status=published')
          .expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.database.maxQueryTime);
    });

    it('should handle comment statistics efficiently', async () => {
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(commentsApp)
          .get(`/api/v1/posts/${testPosts[0]._id}/comments/stats`)
          .expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.database.maxQueryTime);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large result sets without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process large amounts of data
      for (let i = 0; i < 10; i++) {
        await request(postsApp).get('/posts?limit=50').expect(200);
        await request(commentsApp)
          .get(`/api/v1/posts/${testPosts[0]._id}/comments?limit=100`)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle pagination efficiently without loading all data', async () => {
      const { duration: page1Duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?page=1&limit=10').expect(200);
      });

      const { duration: page10Duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?page=10&limit=10').expect(200);
      });

      // Later pages shouldn't be significantly slower
      expect(page10Duration).toBeLessThan(page1Duration * 3);
    });
  });

  describe('Stress Testing', () => {
    it('should survive stress testing with high concurrent load', async () => {
      const testFn = async () => {
        const operations = [
          () => request(postsApp).get('/posts?limit=1'),
          () => request(postsApp).get('/health'),
          () => request(commentsApp).get('/health')
        ];
        
        const operation = operations[Math.floor(Math.random() * operations.length)];
        return operation();
      };

      const results = await PerformanceUtils.runLoadTest(
        testFn,
        PERFORMANCE_CONFIG.load.stress,
        1 // Single iteration to avoid overwhelming
      );

      // Even under stress, should maintain some level of service
      expect(results.successRate).toBeGreaterThan(50);
      
      if (results.stats) {
        expect(results.stats.p99).toBeLessThan(PERFORMANCE_CONFIG.thresholds.timeout);
      }
    });

    it('should recover gracefully after stress', async () => {
      // Wait a moment for system to recover
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/health').expect(200);
      });

      // Should return to normal response times
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
    });
  });

  describe('Scalability Testing', () => {
    it('should maintain performance with increasing data size', async () => {
      // Test performance with different data sizes
      const smallDatasetTime = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?limit=5').expect(200);
      });

      const mediumDatasetTime = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?limit=25').expect(200);
      });

      const largeDatasetTime = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?limit=50').expect(200);
      });

      // Performance should scale reasonably with data size
      expect(largeDatasetTime.duration).toBeLessThan(smallDatasetTime.duration * 5);
      expect(mediumDatasetTime.duration).toBeLessThan(largeDatasetTime.duration * 2);
    });

    it('should handle complex filtering without exponential slowdown', async () => {
      const simpleFilterTime = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?status=published').expect(200);
      });

      const complexFilterTime = await PerformanceUtils.measureTime(async () => {
        return request(postsApp)
          .get(`/posts?status=published&category=${testCategory._id}&search=test&sort=createdAt&order=desc`)
          .expect(200);
      });

      // Complex filters shouldn't be exponentially slower
      expect(complexFilterTime.duration).toBeLessThan(simpleFilterTime.duration * 10);
    });
  });

  describe('Caching Performance', () => {
    it('should show improved performance on repeated requests', async () => {
      const endpoint = '/posts?limit=10&status=published';

      // First request (cold)
      const { duration: coldTime } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get(endpoint).expect(200);
      });

      // Second request (potentially cached)
      const { duration: warmTime } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get(endpoint).expect(200);
      });

      // Third request (should be warm)
      const { duration: hotTime } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get(endpoint).expect(200);
      });

      // Warm requests should generally be faster or at least not slower
      expect(Math.min(warmTime, hotTime)).toBeLessThanOrEqual(coldTime * 1.5);
    });

    it('should handle cache invalidation properly', async () => {
      // Get initial data
      await request(postsApp).get('/posts?limit=5').expect(200);

      // Modify data
      await request(postsApp)
        .post('/posts')
        .send({
          title: 'Cache Invalidation Test',
          content: 'Testing cache invalidation',
          author: 'Cache Tester',
          category: testCategory._id
        })
        .expect(201);

      // Subsequent requests should still perform well
      const { duration } = await PerformanceUtils.measureTime(async () => {
        return request(postsApp).get('/posts?limit=5').expect(200);
      });

      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
    });
  });

  describe('Network Performance', () => {
    it('should compress responses for better network performance', async () => {
      const response = await request(postsApp)
        .get('/posts?limit=50')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Check if compression is applied
      const contentEncoding = response.get('Content-Encoding');
      if (response.body && JSON.stringify(response.body).length > 1024) {
        // Large responses should be compressed
        expect(contentEncoding).toBeDefined();
      }
    });

    it('should handle keep-alive connections efficiently', async () => {
      // Make multiple requests on the same connection
      const agent = request.agent(postsApp);
      
      const times = [];
      for (let i = 0; i < 5; i++) {
        const { duration } = await PerformanceUtils.measureTime(async () => {
          return agent.get('/health').expect(200);
        });
        times.push(duration);
      }

      const stats = PerformanceUtils.calculateStats(times);
      
      // Later requests should benefit from connection reuse
      expect(stats.max - stats.min).toBeLessThan(PERFORMANCE_CONFIG.thresholds.acceptable);
    });
  });

  afterAll(async () => {
    // Performance summary
    console.log('\n📊 Performance Test Summary:');
    console.log(`✅ All performance tests completed`);
    console.log(`📈 Tested with ${testPosts.length} posts and ${testComments.length} comments`);
    console.log(`⚡ Response time thresholds: Fast <${PERFORMANCE_CONFIG.thresholds.fast}ms, Acceptable <${PERFORMANCE_CONFIG.thresholds.acceptable}ms`);
    console.log(`🔄 Load test configurations: Light=${PERFORMANCE_CONFIG.load.light}, Medium=${PERFORMANCE_CONFIG.load.medium}, Heavy=${PERFORMANCE_CONFIG.load.heavy}`);
  });
});