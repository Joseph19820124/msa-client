const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Post = require('../../../models/Post');
const Category = require('../../../models/Category');
const statsController = require('../../../controllers/statsController');

// Create test app
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/stats/overview', statsController.getOverviewStats);
app.post('/stats/posts/:id/view', statsController.recordPostView);
app.post('/stats/posts/:id/like', statsController.recordPostLike);
app.get('/stats/posts/popular', statsController.getPopularPosts);
app.get('/stats/categories/popular', statsController.getPopularCategories);
app.get('/stats/analytics', statsController.getAnalytics);

describe('Stats Controller Unit Tests', () => {
  let testCategory;
  let testPosts;

  beforeEach(async () => {
    // Create test category
    testCategory = new Category(testUtils.generateTestCategory());
    await testCategory.save();

    // Create multiple test posts with different stats
    testPosts = [];
    
    const postData = [
      { title: 'Popular Post', views: 100, likes: 20, commentsCount: 15 },
      { title: 'Medium Post', views: 50, likes: 10, commentsCount: 8 },
      { title: 'New Post', views: 5, likes: 1, commentsCount: 2 }
    ];

    for (let i = 0; i < postData.length; i++) {
      const post = new Post({
        ...testUtils.generateTestPost({
          title: postData[i].title,
          slug: postData[i].title.toLowerCase().replace(/\s+/g, '-'),
          stats: {
            views: postData[i].views,
            likes: postData[i].likes,
            commentsCount: postData[i].commentsCount
          }
        }),
        category: testCategory._id
      });
      await post.save();
      testPosts.push(post);
    }
  });

  describe('GET /stats/overview - getOverviewStats', () => {
    it('should return comprehensive overview statistics', async () => {
      const response = await request(app)
        .get('/stats/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overview).toBeDefined();

      const overview = response.body.data.overview;
      expect(overview.posts).toBeDefined();
      expect(overview.posts.totalPosts).toBe(3);
      expect(overview.posts.publishedPosts).toBe(3);
      expect(overview.posts.totalViews).toBe(155); // 100 + 50 + 5
      expect(overview.posts.totalLikes).toBe(31); // 20 + 10 + 1

      expect(overview.categories).toBeDefined();
      expect(overview.categories.total).toBe(1);
      expect(overview.categories.active).toBe(1);
    });

    it('should include top posts by views', async () => {
      const response = await request(app)
        .get('/stats/overview')
        .expect(200);

      const topPosts = response.body.data.topPosts;
      expect(topPosts).toBeDefined();
      expect(topPosts.mostViewed).toBeDefined();
      expect(topPosts.mostViewed).toHaveLength(3);
      expect(topPosts.mostViewed[0].title).toBe('Popular Post');
      expect(topPosts.mostViewed[0].stats.views).toBe(100);
    });

    it('should handle empty database', async () => {
      // Clear all data
      await Post.deleteMany({});
      await Category.deleteMany({});

      const response = await request(app)
        .get('/stats/overview')
        .expect(200);

      const overview = response.body.data.overview;
      expect(overview.posts.totalPosts).toBe(0);
      expect(overview.posts.totalViews).toBe(0);
      expect(overview.categories.total).toBe(0);
    });

    it('should handle database errors', async () => {
      jest.spyOn(Post, 'countDocuments').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/stats/overview')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /stats/posts/:id/view - recordPostView', () => {
    it('should increment post view count', async () => {
      const initialViews = testPosts[0].stats.views;

      const response = await request(app)
        .post(`/stats/posts/${testPosts[0]._id}/view`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.views).toBe(initialViews + 1);

      // Verify in database
      const updatedPost = await Post.findById(testPosts[0]._id);
      expect(updatedPost.stats.views).toBe(initialViews + 1);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/stats/posts/${nonExistentId}/view`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .post('/stats/posts/invalid-id/view')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle multiple rapid view increments', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post(`/stats/posts/${testPosts[0]._id}/view`)
            .expect(200)
        );
      }

      await Promise.all(promises);

      const updatedPost = await Post.findById(testPosts[0]._id);
      expect(updatedPost.stats.views).toBe(105); // 100 + 5
    });
  });

  describe('POST /stats/posts/:id/like - recordPostLike', () => {
    it('should increment post like count', async () => {
      const initialLikes = testPosts[0].stats.likes;

      const response = await request(app)
        .post(`/stats/posts/${testPosts[0]._id}/like`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.likes).toBe(initialLikes + 1);

      // Verify in database
      const updatedPost = await Post.findById(testPosts[0]._id);
      expect(updatedPost.stats.likes).toBe(initialLikes + 1);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/stats/posts/${nonExistentId}/like`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle multiple likes', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post(`/stats/posts/${testPosts[0]._id}/like`)
            .expect(200)
        );
      }

      await Promise.all(promises);

      const updatedPost = await Post.findById(testPosts[0]._id);
      expect(updatedPost.stats.likes).toBe(23); // 20 + 3
    });
  });

  describe('GET /stats/posts/popular - getPopularPosts', () => {
    it('should return posts sorted by views', async () => {
      const response = await request(app)
        .get('/stats/posts/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].title).toBe('Popular Post');
      expect(response.body.data[1].title).toBe('Medium Post');
      expect(response.body.data[2].title).toBe('New Post');
    });

    it('should handle limit parameter', async () => {
      const response = await request(app)
        .get('/stats/posts/popular?limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Popular Post');
      expect(response.body.data[1].title).toBe('Medium Post');
    });

    it('should handle time period filter', async () => {
      const response = await request(app)
        .get('/stats/posts/popular?period=week')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should handle empty results', async () => {
      await Post.deleteMany({});

      const response = await request(app)
        .get('/stats/posts/popular')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /stats/categories/popular - getPopularCategories', () => {
    it('should return categories with post counts', async () => {
      const response = await request(app)
        .get('/stats/categories/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].postCount).toBe(3);
      expect(response.body.data[0].totalViews).toBe(155);
    });

    it('should handle limit parameter', async () => {
      // Create another category with posts
      const newCategory = new Category({
        ...testUtils.generateTestCategory({
          name: 'Another Category',
          slug: 'another-category'
        })
      });
      await newCategory.save();

      const newPost = new Post({
        ...testUtils.generateTestPost({
          title: 'Another Post',
          slug: 'another-post'
        }),
        category: newCategory._id
      });
      await newPost.save();

      const response = await request(app)
        .get('/stats/categories/popular?limit=1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /stats/analytics - getAnalytics', () => {
    it('should return comprehensive analytics data', async () => {
      const response = await request(app)
        .get('/stats/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const analytics = response.body.data;
      expect(analytics.engagement).toBeDefined();
      expect(analytics.engagement.averageViewsPerPost).toBeDefined();
      expect(analytics.engagement.averageLikesPerPost).toBeDefined();
      expect(analytics.engagement.totalEngagement).toBeDefined();

      expect(analytics.content).toBeDefined();
      expect(analytics.content.totalPosts).toBe(3);
      expect(analytics.content.averageWordsPerPost).toBeDefined();

      expect(analytics.trends).toBeDefined();
    });

    it('should handle date range filters', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/stats/analytics?startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should calculate engagement metrics correctly', async () => {
      const response = await request(app)
        .get('/stats/analytics')
        .expect(200);

      const engagement = response.body.data.engagement;
      expect(engagement.averageViewsPerPost).toBeCloseTo(51.67, 1); // 155/3
      expect(engagement.averageLikesPerPost).toBeCloseTo(10.33, 1); // 31/3
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(Post, 'aggregate').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/stats/analytics')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid parameters', async () => {
      const response = await request(app)
        .get('/stats/posts/popular?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed date ranges', async () => {
      const response = await request(app)
        .get('/stats/analytics?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      // Create many posts for performance testing
      const posts = [];
      for (let i = 0; i < 100; i++) {
        posts.push({
          ...testUtils.generateTestPost({
            title: `Performance Test Post ${i}`,
            slug: `performance-test-post-${i}`,
            stats: {
              views: Math.floor(Math.random() * 1000),
              likes: Math.floor(Math.random() * 100),
              commentsCount: Math.floor(Math.random() * 50)
            }
          }),
          category: testCategory._id
        });
      }
      await Post.insertMany(posts);
    });

    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/stats/overview')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle popular posts query with large dataset', async () => {
      const response = await request(app)
        .get('/stats/posts/popular?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
    });
  });
});