const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Post = require('../../models/Post');
const Category = require('../../models/Category');

describe('Posts Service API Integration Tests', () => {
  let server;
  let testCategory;
  let testPost;

  beforeAll(async () => {
    // Start the server for integration testing
    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    // Close server
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(async () => {
    // Create test category
    testCategory = new Category(testUtils.generateTestCategory());
    await testCategory.save();

    // Create test post
    testPost = new Post({
      ...testUtils.generateTestPost(),
      category: testCategory._id
    });
    await testPost.save();
  });

  describe('Health and Info Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('posts-service');
      expect(response.body.database).toBeDefined();
      expect(response.body.memory).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return service information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Posts Service');
      expect(response.body.version).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.posts).toBe('/posts');
      expect(response.body.endpoints.categories).toBe('/categories');
      expect(response.body.endpoints.stats).toBe('/stats');
    });
  });

  describe('Posts API Workflow', () => {
    it('should complete full CRUD workflow for posts', async () => {
      // 1. Create a new post
      const newPostData = {
        title: 'Integration Test Post',
        content: 'This is a comprehensive integration test for the posts API',
        excerpt: 'Integration test excerpt',
        author: 'Integration Tester',
        category: testCategory._id,
        tags: ['integration', 'test', 'api']
      };

      const createResponse = await request(app)
        .post('/posts')
        .send(newPostData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(newPostData.title);
      expect(createResponse.body.data.slug).toBe('integration-test-post');
      
      const createdPostId = createResponse.body.data._id;

      // 2. Get the created post
      const getResponse = await request(app)
        .get(`/posts/${createdPostId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data._id).toBe(createdPostId);
      expect(getResponse.body.data.stats.views).toBe(1); // Should increment view

      // 3. Update the post
      const updateData = {
        title: 'Updated Integration Test Post',
        content: 'Updated content for integration testing'
      };

      const updateResponse = await request(app)
        .put(`/posts/${createdPostId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe(updateData.title);
      expect(updateResponse.body.data.slug).toBe('updated-integration-test-post');

      // 4. Verify update in list
      const listResponse = await request(app)
        .get('/posts')
        .expect(200);

      const updatedPost = listResponse.body.data.find(p => p._id === createdPostId);
      expect(updatedPost.title).toBe(updateData.title);

      // 5. Delete the post
      const deleteResponse = await request(app)
        .delete(`/posts/${createdPostId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 6. Verify deletion
      await request(app)
        .get(`/posts/${createdPostId}`)
        .expect(404);
    });

    it('should handle post filtering and pagination', async () => {
      // Create multiple posts with different properties
      const posts = [];
      for (let i = 0; i < 5; i++) {
        const post = new Post({
          title: `Test Post ${i}`,
          content: `Content for test post ${i}`,
          excerpt: `Excerpt ${i}`,
          author: 'Test Author',
          slug: `test-post-${i}`,
          category: testCategory._id,
          status: i % 2 === 0 ? 'published' : 'draft',
          featured: i === 0,
          tags: [`tag${i}`, 'test']
        });
        await post.save();
        posts.push(post);
      }

      // Test pagination
      const page1Response = await request(app)
        .get('/posts?page=1&limit=3')
        .expect(200);

      expect(page1Response.body.pagination.currentPage).toBe(1);
      expect(page1Response.body.pagination.pageSize).toBe(3);
      expect(page1Response.body.data.length).toBeLessThanOrEqual(3);

      // Test filtering by status
      const publishedResponse = await request(app)
        .get('/posts?status=published')
        .expect(200);

      publishedResponse.body.data.forEach(post => {
        expect(post.status).toBe('published');
      });

      // Test filtering by category
      const categoryResponse = await request(app)
        .get(`/posts?category=${testCategory._id}`)
        .expect(200);

      categoryResponse.body.data.forEach(post => {
        expect(post.category._id || post.category).toBe(testCategory._id.toString());
      });

      // Test search functionality
      const searchResponse = await request(app)
        .get('/posts?search=Test Post 1')
        .expect(200);

      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      expect(searchResponse.body.data[0].title).toContain('Test Post 1');

      // Test sorting
      const sortedResponse = await request(app)
        .get('/posts?sort=title&order=asc')
        .expect(200);

      if (sortedResponse.body.data.length > 1) {
        for (let i = 1; i < sortedResponse.body.data.length; i++) {
          expect(sortedResponse.body.data[i].title.localeCompare(
            sortedResponse.body.data[i - 1].title
          )).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should handle post statistics and interactions', async () => {
      // Test view tracking
      const initialViews = testPost.stats.views;
      
      await request(app)
        .get(`/posts/${testPost._id}`)
        .expect(200);

      const viewedPost = await Post.findById(testPost._id);
      expect(viewedPost.stats.views).toBe(initialViews + 1);

      // Test like functionality
      const initialLikes = testPost.stats.likes;
      
      const likeResponse = await request(app)
        .post(`/stats/posts/${testPost._id}/like`)
        .expect(200);

      expect(likeResponse.body.success).toBe(true);
      expect(likeResponse.body.data.likes).toBe(initialLikes + 1);

      // Test view recording
      const viewResponse = await request(app)
        .post(`/stats/posts/${testPost._id}/view`)
        .expect(200);

      expect(viewResponse.body.success).toBe(true);
      expect(viewResponse.body.data.views).toBe(initialViews + 2); // +1 from get, +1 from view endpoint
    });
  });

  describe('Categories API Workflow', () => {
    it('should complete full CRUD workflow for categories', async () => {
      // 1. Create a new category
      const newCategoryData = {
        name: 'Integration Test Category',
        description: 'Category for integration testing',
        color: '#28a745'
      };

      const createResponse = await request(app)
        .post('/categories')
        .send(newCategoryData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(newCategoryData.name);
      expect(createResponse.body.data.slug).toBe('integration-test-category');
      
      const createdCategoryId = createResponse.body.data._id;

      // 2. Get the created category
      const getResponse = await request(app)
        .get(`/categories/${createdCategoryId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data._id).toBe(createdCategoryId);

      // 3. Update the category
      const updateData = {
        name: 'Updated Integration Test Category',
        description: 'Updated description',
        color: '#dc3545'
      };

      const updateResponse = await request(app)
        .put(`/categories/${createdCategoryId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe(updateData.name);
      expect(updateResponse.body.data.color).toBe(updateData.color);

      // 4. Get active categories
      const activeResponse = await request(app)
        .get('/categories/active')
        .expect(200);

      const updatedCategory = activeResponse.body.data.find(c => c._id === createdCategoryId);
      expect(updatedCategory).toBeDefined();
      expect(updatedCategory.isActive).toBe(true);

      // 5. Delete the category
      const deleteResponse = await request(app)
        .delete(`/categories/${createdCategoryId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 6. Verify deletion
      await request(app)
        .get(`/categories/${createdCategoryId}`)
        .expect(404);
    });

    it('should handle category filtering and search', async () => {
      // Create multiple categories
      const categories = [];
      for (let i = 0; i < 3; i++) {
        const category = new Category({
          name: `Integration Category ${i}`,
          slug: `integration-category-${i}`,
          description: `Description for category ${i}`,
          color: '#007bff',
          isActive: i !== 2 // Make last one inactive
        });
        await category.save();
        categories.push(category);
      }

      // Test getting all categories
      const allResponse = await request(app)
        .get('/categories')
        .expect(200);

      expect(allResponse.body.data.length).toBeGreaterThanOrEqual(3);

      // Test getting only active categories
      const activeResponse = await request(app)
        .get('/categories/active')
        .expect(200);

      activeResponse.body.data.forEach(category => {
        expect(category.isActive).toBe(true);
      });

      // Test search functionality
      const searchResponse = await request(app)
        .get('/categories?search=Integration')
        .expect(200);

      searchResponse.body.data.forEach(category => {
        expect(category.name.toLowerCase()).toContain('integration');
      });
    });
  });

  describe('Statistics API Integration', () => {
    beforeEach(async () => {
      // Create additional test data for statistics
      const additionalPosts = [];
      for (let i = 0; i < 3; i++) {
        const post = new Post({
          title: `Stats Test Post ${i}`,
          content: `Content for stats testing ${i}`,
          excerpt: `Stats excerpt ${i}`,
          author: 'Stats Tester',
          slug: `stats-test-post-${i}`,
          category: testCategory._id,
          status: 'published',
          stats: {
            views: (i + 1) * 10,
            likes: (i + 1) * 2,
            commentsCount: i + 1
          }
        });
        await post.save();
        additionalPosts.push(post);
      }
    });

    it('should provide comprehensive overview statistics', async () => {
      const response = await request(app)
        .get('/stats/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();

      const overview = response.body.data.overview;
      expect(overview.posts).toBeDefined();
      expect(overview.posts.totalPosts).toBeGreaterThan(0);
      expect(overview.posts.publishedPosts).toBeGreaterThan(0);
      expect(overview.posts.totalViews).toBeGreaterThan(0);
      expect(overview.posts.totalLikes).toBeGreaterThan(0);

      expect(overview.categories).toBeDefined();
      expect(overview.categories.total).toBeGreaterThan(0);
      expect(overview.categories.active).toBeGreaterThan(0);

      expect(response.body.data.topPosts).toBeDefined();
      expect(response.body.data.topPosts.mostViewed).toBeDefined();
    });

    it('should provide popular posts statistics', async () => {
      const response = await request(app)
        .get('/stats/posts/popular?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);

      // Should be sorted by views descending
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].stats.views)
            .toBeLessThanOrEqual(response.body.data[i - 1].stats.views);
        }
      }
    });

    it('should provide popular categories statistics', async () => {
      const response = await request(app)
        .get('/stats/categories/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      response.body.data.forEach(category => {
        expect(category.postCount).toBeDefined();
        expect(category.totalViews).toBeDefined();
      });
    });

    it('should provide analytics data', async () => {
      const response = await request(app)
        .get('/stats/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.engagement).toBeDefined();
      expect(response.body.data.content).toBeDefined();
      expect(response.body.data.trends).toBeDefined();

      const engagement = response.body.data.engagement;
      expect(engagement.averageViewsPerPost).toBeDefined();
      expect(engagement.averageLikesPerPost).toBeDefined();
      expect(engagement.totalEngagement).toBeDefined();
    });

    it('should handle time-based analytics filters', async () => {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/stats/analytics?startDate=${weekAgo.toISOString()}&endDate=${today.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('not found');
    });

    it('should handle invalid ObjectId formats', async () => {
      const response = await request(app)
        .get('/posts/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/posts')
        .send('invalid json string')
        .type('application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          title: 'A', // Too short
          content: 'Short' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle database constraint violations', async () => {
      // Try to create category with existing slug
      await request(app)
        .post('/categories')
        .send({
          name: 'Unique Test Category',
          slug: 'unique-test'
        })
        .expect(201);

      const response = await request(app)
        .post('/categories')
        .send({
          name: 'Another Category',
          slug: 'unique-test' // Same slug
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security and Validation', () => {
    it('should sanitize input to prevent XSS', async () => {
      const maliciousData = {
        title: 'Test Post <script>alert("xss")</script>',
        content: 'Content with <img src="x" onerror="alert(1)"> malicious code',
        excerpt: 'Safe excerpt',
        author: 'Test Author',
        category: testCategory._id
      };

      const response = await request(app)
        .post('/posts')
        .send(maliciousData)
        .expect(201);

      expect(response.body.data.title).not.toContain('<script>');
      expect(response.body.data.content).not.toContain('onerror');
    });

    it('should prevent NoSQL injection', async () => {
      const maliciousQuery = {
        $ne: null
      };

      const response = await request(app)
        .get('/posts')
        .query({ category: maliciousQuery })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate request size limits', async () => {
      const largeContent = 'A'.repeat(20 * 1024 * 1024); // 20MB

      const response = await request(app)
        .post('/posts')
        .send({
          title: 'Large Content Test',
          content: largeContent,
          author: 'Test Author',
          category: testCategory._id
        })
        .expect(413); // Request Entity Too Large

      expect(response.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // This would test rate limiting if configured
      // For now, we'll just verify the endpoint responds
      const response = await request(app)
        .get('/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      // Create larger dataset for performance testing
      const posts = [];
      for (let i = 0; i < 50; i++) {
        posts.push({
          title: `Performance Test Post ${i}`,
          content: `Content for performance testing ${i}`.repeat(10),
          excerpt: `Performance excerpt ${i}`,
          author: 'Performance Tester',
          slug: `performance-test-post-${i}`,
          category: testCategory._id,
          status: 'published',
          stats: {
            views: Math.floor(Math.random() * 1000),
            likes: Math.floor(Math.random() * 100),
            commentsCount: Math.floor(Math.random() * 50)
          }
        });
      }
      await Post.insertMany(posts);
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/posts?limit=50')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/stats/overview')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle concurrent requests properly', async () => {
      const promises = [];
      
      // Send 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/posts?limit=10')
            .expect(200)
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });
});