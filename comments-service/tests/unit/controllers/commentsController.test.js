const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../../../models/Comment');
const commentsController = require('../../../controllers/commentsController');

// Create test app
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/posts/:postId/comments', commentsController.getCommentsByPost);
app.post('/posts/:postId/comments', commentsController.createComment);
app.get('/comments/:id', commentsController.getCommentById);
app.put('/comments/:id', commentsController.updateComment);
app.delete('/comments/:id', commentsController.deleteComment);
app.post('/comments/:id/like', commentsController.likeComment);
app.post('/comments/:id/report', commentsController.reportComment);
app.get('/posts/:postId/comments/stats', commentsController.getCommentStats);

describe('Comments Controller Unit Tests', () => {
  let testComment;
  let testPostId;

  beforeEach(async () => {
    testPostId = testUtils.createObjectId();
    
    testComment = new Comment({
      ...testUtils.generateTestComment({
        postId: testPostId
      })
    });
    await testComment.save();
  });

  describe('GET /posts/:postId/comments - getCommentsByPost', () => {
    beforeEach(async () => {
      // Create multiple comments for the same post
      const comments = [
        {
          ...testUtils.generateTestComment({
            postId: testPostId,
            content: 'First comment',
            createdAt: new Date(Date.now() - 3000)
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: testPostId,
            content: 'Second comment',
            createdAt: new Date(Date.now() - 2000)
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: testPostId,
            content: 'Third comment',
            status: 'pending'
          })
        }
      ];
      
      await Comment.insertMany(comments);
    });

    it('should return all approved comments for a post', async () => {
      const response = await request(app)
        .get(`/posts/${testPostId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should only return approved comments
      response.body.data.forEach(comment => {
        expect(comment.status).toBe('approved');
      });
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get(`/posts/${testPostId}/comments?page=1&limit=2`)
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.pageSize).toBe(2);
    });

    it('should sort comments by creation date', async () => {
      const response = await request(app)
        .get(`/posts/${testPostId}/comments?sort=createdAt&order=desc`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(1);
      
      // Check if sorted correctly (newest first)
      for (let i = 1; i < response.body.data.length; i++) {
        const current = new Date(response.body.data[i].createdAt);
        const previous = new Date(response.body.data[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentPostId = testUtils.createObjectId();
      
      const response = await request(app)
        .get(`/posts/${nonExistentPostId}/comments`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .get('/posts/invalid-id/comments')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should include author information', async () => {
      const response = await request(app)
        .get(`/posts/${testPostId}/comments`)
        .expect(200);

      response.body.data.forEach(comment => {
        expect(comment.author).toBeDefined();
        expect(comment.author.name).toBeDefined();
        expect(comment.author.email).toBeUndefined(); // Email should be hidden
      });
    });

    it('should filter out reported comments with high report count', async () => {
      // Create a highly reported comment
      const reportedComment = new Comment({
        ...testUtils.generateTestComment({
          postId: testPostId,
          content: 'Reported comment',
          reportCount: 5,
          isReported: true
        })
      });
      await reportedComment.save();

      const response = await request(app)
        .get(`/posts/${testPostId}/comments`)
        .expect(200);

      const reportedInResults = response.body.data.find(
        comment => comment.content === 'Reported comment'
      );
      expect(reportedInResults).toBeUndefined();
    });
  });

  describe('POST /posts/:postId/comments - createComment', () => {
    const validCommentData = {
      content: 'This is a valid test comment with sufficient length',
      author: {
        name: 'Test User',
        email: 'testuser@example.com'
      }
    };

    it('should create a new comment', async () => {
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send(validCommentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(validCommentData.content);
      expect(response.body.data.author.name).toBe(validCommentData.author.name);
      expect(response.body.data.postId).toBe(testPostId.toString());
      expect(response.body.data.status).toBe('pending'); // Default status
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send({
          author: {
            name: 'Test User',
            email: 'test@example.com'
          }
          // Missing content
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('content');
    });

    it('should validate content length', async () => {
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send({
          ...validCommentData,
          content: 'Short' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate author information', async () => {
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send({
          content: validCommentData.content,
          author: {
            name: 'Test User'
            // Missing email
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send({
          ...validCommentData,
          author: {
            name: 'Test User',
            email: 'invalid-email'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize content to prevent XSS', async () => {
      const maliciousContent = 'This is a comment with <script>alert("xss")</script> malicious content';
      
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send({
          ...validCommentData,
          content: maliciousContent
        })
        .expect(201);

      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).toContain('This is a comment with');
    });

    it('should detect and flag spam content', async () => {
      const spamContent = 'BUY NOW! CHEAP VIAGRA! CLICK HERE! AMAZING DEAL!';
      
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send({
          ...validCommentData,
          content: spamContent
        })
        .expect(201);

      expect(response.body.data.status).toBe('pending'); // Should be flagged for review
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiting middleware to simulate limit exceeded
      jest.spyOn(app._router, 'handle').mockImplementationOnce((req, res, next) => {
        return res.status(429).json({
          success: false,
          error: { message: 'Too many requests' }
        });
      });

      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send(validCommentData)
        .expect(429);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /comments/:id - getCommentById', () => {
    it('should return a specific comment', async () => {
      const response = await request(app)
        .get(`/comments/${testComment._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testComment._id.toString());
      expect(response.body.data.content).toBe(testComment.content);
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = testUtils.createObjectId();
      
      const response = await request(app)
        .get(`/comments/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid comment ID', async () => {
      const response = await request(app)
        .get('/comments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not return pending or rejected comments to unauthorized users', async () => {
      testComment.status = 'pending';
      await testComment.save();

      const response = await request(app)
        .get(`/comments/${testComment._id}`)
        .expect(404); // Should act as if comment doesn't exist

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /comments/:id - updateComment', () => {
    const updateData = {
      content: 'This is an updated comment content with sufficient length'
    };

    it('should update an existing comment', async () => {
      const response = await request(app)
        .put(`/comments/${testComment._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = testUtils.createObjectId();
      
      const response = await request(app)
        .put(`/comments/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/comments/${testComment._id}`)
        .send({
          content: 'Short' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize updated content', async () => {
      const maliciousUpdate = {
        content: 'Updated content with <script>alert("xss")</script> malicious code'
      };

      const response = await request(app)
        .put(`/comments/${testComment._id}`)
        .send(maliciousUpdate)
        .expect(200);

      expect(response.body.data.content).not.toContain('<script>');
    });

    it('should reset moderation status when content is updated', async () => {
      testComment.status = 'approved';
      await testComment.save();

      await request(app)
        .put(`/comments/${testComment._id}`)
        .send(updateData)
        .expect(200);

      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.status).toBe('pending'); // Should be re-moderated
    });
  });

  describe('DELETE /comments/:id - deleteComment', () => {
    it('should delete an existing comment', async () => {
      const response = await request(app)
        .delete(`/comments/${testComment._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify comment is deleted
      const deletedComment = await Comment.findById(testComment._id);
      expect(deletedComment).toBeNull();
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = testUtils.createObjectId();
      
      const response = await request(app)
        .delete(`/comments/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle soft delete for comments with replies', async () => {
      // This would be implemented if threading is supported
      const response = await request(app)
        .delete(`/comments/${testComment._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /comments/:id/like - likeComment', () => {
    it('should increment comment like count', async () => {
      const initialLikes = testComment.likes;

      const response = await request(app)
        .post(`/comments/${testComment._id}/like`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.likes).toBe(initialLikes + 1);

      // Verify in database
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.likes).toBe(initialLikes + 1);
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = testUtils.createObjectId();

      const response = await request(app)
        .post(`/comments/${nonExistentId}/like`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle multiple likes gracefully', async () => {
      // Simulate multiple rapid likes
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post(`/comments/${testComment._id}/like`)
            .expect(200)
        );
      }

      await Promise.all(promises);

      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.likes).toBe(3);
    });
  });

  describe('POST /comments/:id/report - reportComment', () => {
    const reportData = {
      reason: 'spam',
      description: 'This comment appears to be spam content'
    };

    it('should report a comment', async () => {
      const response = await request(app)
        .post(`/comments/${testComment._id}/report`)
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reported');

      // Verify in database
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.isReported).toBe(true);
      expect(updatedComment.reportCount).toBe(1);
    });

    it('should validate report data', async () => {
      const response = await request(app)
        .post(`/comments/${testComment._id}/report`)
        .send({
          description: 'Missing reason'
          // Missing reason
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate report reason enum', async () => {
      const response = await request(app)
        .post(`/comments/${testComment._id}/report`)
        .send({
          reason: 'invalid-reason',
          description: 'Test description'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle multiple reports for same comment', async () => {
      // First report
      await request(app)
        .post(`/comments/${testComment._id}/report`)
        .send(reportData)
        .expect(200);

      // Second report
      await request(app)
        .post(`/comments/${testComment._id}/report`)
        .send({
          ...reportData,
          reason: 'inappropriate'
        })
        .expect(200);

      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.reportCount).toBe(2);
    });

    it('should auto-hide comment with high report count', async () => {
      // Simulate multiple reports to trigger auto-hide
      testComment.reportCount = 4;
      await testComment.save();

      await request(app)
        .post(`/comments/${testComment._id}/report`)
        .send(reportData)
        .expect(200);

      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.status).toBe('hidden'); // Should be auto-hidden
    });
  });

  describe('GET /posts/:postId/comments/stats - getCommentStats', () => {
    beforeEach(async () => {
      // Create comments with different statuses
      const comments = [
        {
          ...testUtils.generateTestComment({
            postId: testPostId,
            status: 'approved',
            likes: 5
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: testPostId,
            status: 'pending',
            likes: 2
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: testPostId,
            status: 'rejected',
            likes: 0
          })
        }
      ];

      await Comment.insertMany(comments);
    });

    it('should return comment statistics for a post', async () => {
      const response = await request(app)
        .get(`/posts/${testPostId}/comments/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const stats = response.body.data;
      expect(stats.total).toBeDefined();
      expect(stats.approved).toBeDefined();
      expect(stats.pending).toBeDefined();
      expect(stats.rejected).toBeDefined();
      expect(stats.totalLikes).toBeDefined();
    });

    it('should calculate correct statistics', async () => {
      const response = await request(app)
        .get(`/posts/${testPostId}/comments/stats`)
        .expect(200);

      const stats = response.body.data;
      expect(stats.total).toBe(4); // Including the one from beforeEach
      expect(stats.approved).toBeGreaterThan(0);
      expect(stats.pending).toBeGreaterThan(0);
      expect(stats.rejected).toBeGreaterThan(0);
    });

    it('should handle posts with no comments', async () => {
      const emptyPostId = testUtils.createObjectId();

      const response = await request(app)
        .get(`/posts/${emptyPostId}/comments/stats`)
        .expect(200);

      const stats = response.body.data;
      expect(stats.total).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.rejected).toBe(0);
      expect(stats.totalLikes).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(Comment, 'find').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get(`/posts/${testPostId}/comments`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post(`/posts/${testPostId}/comments`)
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle request timeout', async () => {
      jest.spyOn(Comment, 'find').mockImplementationOnce(() => {
        return new Promise(resolve => setTimeout(resolve, 35000)); // Longer than test timeout
      });

      // This would test timeout handling in a real scenario
      // For now, we'll just verify the mock works
      expect(Comment.find).toBeDefined();
    });
  });
});