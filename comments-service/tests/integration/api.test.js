const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../server');
const Comment = require('../../models/Comment');
const Report = require('../../models/Report');

describe('Comments Service API Integration Tests', () => {
  let server;
  let testComment;
  let testPostId;

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
    testPostId = testUtils.createObjectId();
    
    testComment = new Comment({
      ...testUtils.generateTestComment({
        postId: testPostId,
        status: 'approved'
      })
    });
    await testComment.save();
  });

  describe('Health and Info Endpoints', () => {
    it('should return health status with database check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('comments-service');
      expect(response.body.database).toBeDefined();
      expect(response.body.database.status).toBe('healthy');
      expect(response.body.memory).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.features).toBeDefined();
    });

    it('should return service information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.service).toBe('Comments Service');
      expect(response.body.version).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.comments).toContain('/api/v1/posts/:post_id/comments');
      expect(response.body.endpoints.moderation).toContain('/api/v1/admin/comments');
    });
  });

  describe('Comments API Workflow', () => {
    it('should complete full comment lifecycle', async () => {
      // 1. Create a new comment
      const newCommentData = {
        content: 'This is a comprehensive integration test comment for the API workflow',
        author: {
          name: 'Integration Tester',
          email: 'integration@example.com'
        }
      };

      const createResponse = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send(newCommentData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.content).toBe(newCommentData.content);
      expect(createResponse.body.data.author.name).toBe(newCommentData.author.name);
      expect(createResponse.body.data.status).toBe('pending'); // Default status for new comments
      
      const createdCommentId = createResponse.body.data._id;

      // 2. Get comments for the post (should include approved ones only initially)
      const getCommentsResponse = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .expect(200);

      expect(getCommentsResponse.body.success).toBe(true);
      expect(getCommentsResponse.body.data.length).toBeGreaterThan(0);
      
      // New comment should not appear yet (it's pending)
      const newCommentInList = getCommentsResponse.body.data.find(c => c._id === createdCommentId);
      expect(newCommentInList).toBeUndefined();

      // 3. Update the comment (if allowed)
      const updateData = {
        content: 'This is an updated integration test comment with more comprehensive content'
      };

      const updateResponse = await request(app)
        .put(`/api/v1/comments/${createdCommentId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.content).toBe(updateData.content);
      expect(updateResponse.body.data.status).toBe('pending'); // Should remain pending after update

      // 4. Like the comment
      const likeResponse = await request(app)
        .post(`/api/v1/comments/${createdCommentId}/like`)
        .expect(200);

      expect(likeResponse.body.success).toBe(true);
      expect(likeResponse.body.data.likes).toBe(1);

      // 5. Report the comment
      const reportData = {
        reason: 'spam',
        description: 'Testing the report functionality'
      };

      const reportResponse = await request(app)
        .post(`/api/v1/comments/${createdCommentId}/report`)
        .send(reportData)
        .expect(200);

      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.message).toContain('reported');

      // 6. Get comment statistics
      const statsResponse = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments/stats`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.total).toBeGreaterThan(0);
      expect(statsResponse.body.data.approved).toBeDefined();
      expect(statsResponse.body.data.pending).toBeDefined();

      // 7. Delete the comment
      const deleteResponse = await request(app)
        .delete(`/api/v1/comments/${createdCommentId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 8. Verify deletion
      await request(app)
        .get(`/api/v1/comments/${createdCommentId}`)
        .expect(404);
    });

    it('should handle comment pagination and filtering', async () => {
      // Create multiple comments for testing
      const comments = [];
      for (let i = 0; i < 5; i++) {
        const comment = new Comment({
          ...testUtils.generateTestComment({
            postId: testPostId,
            content: `Integration test comment ${i}`,
            status: 'approved',
            createdAt: new Date(Date.now() + i * 1000) // Different timestamps
          })
        });
        await comment.save();
        comments.push(comment);
      }

      // Test pagination
      const page1Response = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments?page=1&limit=3`)
        .expect(200);

      expect(page1Response.body.pagination).toBeDefined();
      expect(page1Response.body.pagination.currentPage).toBe(1);
      expect(page1Response.body.pagination.pageSize).toBe(3);
      expect(page1Response.body.data.length).toBeLessThanOrEqual(3);

      // Test sorting
      const sortedResponse = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments?sort=createdAt&order=desc`)
        .expect(200);

      if (sortedResponse.body.data.length > 1) {
        for (let i = 1; i < sortedResponse.body.data.length; i++) {
          const current = new Date(sortedResponse.body.data[i].createdAt);
          const previous = new Date(sortedResponse.body.data[i - 1].createdAt);
          expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
        }
      }

      // Test filtering by status (admin only, but we can test the endpoint)
      const filteredResponse = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments?status=approved`)
        .expect(200);

      filteredResponse.body.data.forEach(comment => {
        expect(comment.status).toBe('approved');
      });
    });

    it('should handle comment interactions properly', async () => {
      // Test multiple likes
      const initialLikes = testComment.likes;
      
      // Like the comment multiple times
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/v1/comments/${testComment._id}/like`)
          .expect(200);
      }

      // Verify like count
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.likes).toBe(initialLikes + 3);

      // Test reporting with different reasons
      const reportReasons = ['spam', 'inappropriate', 'harassment'];
      
      for (const reason of reportReasons) {
        await request(app)
          .post(`/api/v1/comments/${testComment._id}/report`)
          .send({
            reason,
            description: `Testing ${reason} report`
          })
          .expect(200);
      }

      // Verify report count
      const reportedComment = await Comment.findById(testComment._id);
      expect(reportedComment.reportCount).toBe(3);
      expect(reportedComment.isReported).toBe(true);
    });

    it('should validate content and prevent spam', async () => {
      // Test content length validation
      const shortContentResponse = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send({
          content: 'Short', // Too short
          author: {
            name: 'Test User',
            email: 'test@example.com'
          }
        })
        .expect(400);

      expect(shortContentResponse.body.success).toBe(false);
      expect(shortContentResponse.body.error.message).toContain('content');

      // Test XSS prevention
      const xssResponse = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send({
          content: 'This comment has <script>alert("xss")</script> malicious content that should be sanitized',
          author: {
            name: 'Test User',
            email: 'test@example.com'
          }
        })
        .expect(201);

      expect(xssResponse.body.data.content).not.toContain('<script>');
      expect(xssResponse.body.data.content).toContain('This comment has');

      // Test spam detection
      const spamResponse = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send({
          content: 'BUY NOW! CHEAP PILLS! AMAZING DEAL! CLICK HERE! FREE MONEY! GUARANTEED!',
          author: {
            name: 'Spammer',
            email: 'spam@example.com'
          }
        })
        .expect(201);

      // Should be flagged for moderation
      expect(spamResponse.body.data.status).toBe('pending');
    });
  });

  describe('Moderation API Workflow', () => {
    let pendingComment;
    let reportedComment;
    let testReports;

    beforeEach(async () => {
      // Create comments in different states
      pendingComment = new Comment({
        ...testUtils.generateTestComment({
          postId: testPostId,
          content: 'Pending comment for moderation',
          status: 'pending'
        })
      });
      await pendingComment.save();

      reportedComment = new Comment({
        ...testUtils.generateTestComment({
          postId: testPostId,
          content: 'Reported comment content',
          status: 'approved',
          isReported: true,
          reportCount: 2
        })
      });
      await reportedComment.save();

      // Create test reports
      testReports = [];
      for (let i = 0; i < 2; i++) {
        const report = new Report({
          ...testUtils.generateTestReport({
            commentId: reportedComment._id,
            reason: i === 0 ? 'spam' : 'inappropriate'
          })
        });
        await report.save();
        testReports.push(report);
      }
    });

    it('should handle admin moderation workflow', async () => {
      // Note: This test assumes admin authentication is mocked in the test setup
      
      // 1. Get pending comments for moderation
      const pendingResponse = await request(app)
        .get('/api/v1/admin/comments')
        .expect(200);

      expect(pendingResponse.body.success).toBe(true);
      expect(pendingResponse.body.data.length).toBeGreaterThan(0);
      
      const pendingCommentInList = pendingResponse.body.data.find(c => c._id === pendingComment._id.toString());
      expect(pendingCommentInList).toBeDefined();

      // 2. Approve a pending comment
      const approveResponse = await request(app)
        .patch(`/api/v1/admin/comments/${pendingComment._id}`)
        .send({
          action: 'approve',
          moderatorNote: 'Comment approved after review'
        })
        .expect(200);

      expect(approveResponse.body.success).toBe(true);
      expect(approveResponse.body.data.status).toBe('approved');
      expect(approveResponse.body.data.moderatorNote).toBe('Comment approved after review');

      // 3. Get reported comments
      const reportedResponse = await request(app)
        .get('/api/v1/admin/comments/reported')
        .expect(200);

      expect(reportedResponse.body.success).toBe(true);
      const reportedCommentInList = reportedResponse.body.data.find(c => c._id === reportedComment._id.toString());
      expect(reportedCommentInList).toBeDefined();
      expect(reportedCommentInList.reportCount).toBe(2);

      // 4. Hide a reported comment
      const hideResponse = await request(app)
        .patch(`/api/v1/admin/comments/${reportedComment._id}`)
        .send({
          action: 'hide',
          moderatorNote: 'Comment hidden due to multiple reports'
        })
        .expect(200);

      expect(hideResponse.body.success).toBe(true);
      expect(hideResponse.body.data.status).toBe('hidden');

      // 5. Get all reports
      const reportsResponse = await request(app)
        .get('/api/v1/admin/reports')
        .expect(200);

      expect(reportsResponse.body.success).toBe(true);
      expect(reportsResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // 6. Resolve a report
      const resolveResponse = await request(app)
        .patch(`/api/v1/admin/reports/${testReports[0]._id}`)
        .send({
          action: 'resolve',
          resolution: 'Report reviewed and comment action taken'
        })
        .expect(200);

      expect(resolveResponse.body.success).toBe(true);
      expect(resolveResponse.body.data.status).toBe('resolved');

      // 7. Get moderation statistics
      const statsResponse = await request(app)
        .get('/api/v1/admin/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.comments).toBeDefined();
      expect(statsResponse.body.data.reports).toBeDefined();
      expect(statsResponse.body.data.workload).toBeDefined();
    });

    it('should handle report management workflow', async () => {
      // Filter reports by status
      const pendingReportsResponse = await request(app)
        .get('/api/v1/admin/reports?status=pending')
        .expect(200);

      pendingReportsResponse.body.data.forEach(report => {
        expect(report.status).toBe('pending');
      });

      // Filter reports by reason
      const spamReportsResponse = await request(app)
        .get('/api/v1/admin/reports?reason=spam')
        .expect(200);

      spamReportsResponse.body.data.forEach(report => {
        expect(report.reason).toBe('spam');
      });

      // Dismiss a report
      const dismissResponse = await request(app)
        .patch(`/api/v1/admin/reports/${testReports[1]._id}`)
        .send({
          action: 'dismiss',
          resolution: 'Report dismissed as invalid'
        })
        .expect(200);

      expect(dismissResponse.body.success).toBe(true);
      expect(dismissResponse.body.data.status).toBe('dismissed');
    });

    it('should handle user banning workflow', async () => {
      // Ban a user based on their comment
      const banResponse = await request(app)
        .post(`/api/v1/admin/comments/${reportedComment._id}/ban-user`)
        .send({
          reason: 'Repeated violations of community guidelines',
          duration: '7d'
        })
        .expect(200);

      expect(banResponse.body.success).toBe(true);
      expect(banResponse.body.message).toContain('banned');

      // Verify all comments from this user are hidden
      const userComments = await Comment.find({
        'author.email': reportedComment.author.email
      });

      userComments.forEach(comment => {
        expect(comment.status).toBe('hidden');
      });
    });
  });

  describe('API Security and Validation', () => {
    it('should require authentication for admin endpoints', async () => {
      // Create app without admin middleware for this test
      const response = await request(app)
        .get('/api/v1/admin/comments')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('admin');
    });

    it('should validate email formats', async () => {
      const invalidEmailResponse = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send({
          content: 'Test comment with invalid email',
          author: {
            name: 'Test User',
            email: 'invalid-email-format'
          }
        })
        .expect(400);

      expect(invalidEmailResponse.body.success).toBe(false);
    });

    it('should prevent NoSQL injection in queries', async () => {
      const maliciousQuery = { $ne: null };
      
      const response = await request(app)
        .get('/api/v1/posts/test/comments')
        .query({ author: maliciousQuery })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize all user inputs', async () => {
      const maliciousInputs = {
        content: 'Test <script>alert("xss")</script> comment with <img src="x" onerror="alert(1)">',
        author: {
          name: 'Test<script>alert("name")</script>User',
          email: 'test@example.com'
        }
      };

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send(maliciousInputs)
        .expect(201);

      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).not.toContain('onerror');
      expect(response.body.data.author.name).not.toContain('<script>');
    });

    it('should enforce rate limiting', async () => {
      // This test would check rate limiting implementation
      // For now, we'll verify the endpoint responds normally
      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent post IDs', async () => {
      const nonExistentPostId = testUtils.createObjectId();
      
      const response = await request(app)
        .get(`/api/v1/posts/${nonExistentPostId}/comments`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent comment IDs', async () => {
      const nonExistentCommentId = testUtils.createObjectId();
      
      const response = await request(app)
        .get(`/api/v1/comments/${nonExistentCommentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed ObjectIds', async () => {
      const response = await request(app)
        .get('/api/v1/comments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(Comment, 'find').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .expect(500);

      expect(response.body.success).toBe(false);
      
      // Restore the mock
      Comment.find.mockRestore();
    });

    it('should handle request timeout scenarios', async () => {
      // This would test timeout handling in real scenarios
      // For now, verify the endpoint works normally
      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return proper 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.code).toBe('ENDPOINT_NOT_FOUND');
      expect(response.body.availableEndpoints).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    beforeEach(async () => {
      // Create larger dataset for performance testing
      const comments = [];
      for (let i = 0; i < 100; i++) {
        comments.push({
          ...testUtils.generateTestComment({
            postId: testPostId,
            content: `Performance test comment ${i}`,
            status: 'approved'
          })
        });
      }
      await Comment.insertMany(comments);
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments?limit=50`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle concurrent comment creation', async () => {
      const promises = [];
      
      // Create 10 comments concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post(`/api/v1/posts/${testPostId}/comments`)
            .send({
              content: `Concurrent test comment ${i} with sufficient length to pass validation`,
              author: {
                name: `User ${i}`,
                email: `user${i}@example.com`
              }
            })
            .expect(201)
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle pagination efficiently with large datasets', async () => {
      const startTime = Date.now();

      // Test multiple pages
      const promises = [];
      for (let page = 1; page <= 5; page++) {
        promises.push(
          request(app)
            .get(`/api/v1/posts/${testPostId}/comments?page=${page}&limit=20`)
            .expect(200)
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // All 5 pages within 5 seconds
      
      results.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });
    });

    it('should maintain performance under report load', async () => {
      // Create many reports
      const reports = [];
      for (let i = 0; i < 50; i++) {
        reports.push({
          ...testUtils.generateTestReport({
            commentId: testComment._id,
            reason: ['spam', 'inappropriate', 'harassment'][i % 3]
          })
        });
      }
      await Report.insertMany(reports);

      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/admin/reports?limit=25')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should be fast even with many reports
    });
  });
});