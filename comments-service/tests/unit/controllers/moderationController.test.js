const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../../../models/Comment');
const Report = require('../../../models/Report');
const moderationController = require('../../../controllers/moderationController');

// Create test app
const app = express();
app.use(express.json());

// Mock admin authentication middleware
app.use((req, res, next) => {
  req.user = {
    userId: testUtils.createObjectId(),
    email: 'admin@example.com',
    role: 'admin'
  };
  next();
});

// Mock routes for testing
app.get('/admin/comments', moderationController.getPendingComments);
app.patch('/admin/comments/:id', moderationController.moderateComment);
app.get('/admin/comments/reported', moderationController.getReportedComments);
app.get('/admin/reports', moderationController.getAllReports);
app.patch('/admin/reports/:id', moderationController.handleReport);
app.get('/admin/stats', moderationController.getModerationStats);
app.post('/admin/comments/:id/ban-user', moderationController.banUser);

describe('Moderation Controller Unit Tests', () => {
  let testComments;
  let testReports;

  beforeEach(async () => {
    // Create test comments with different statuses
    testComments = [];
    
    const commentData = [
      {
        ...testUtils.generateTestComment({
          content: 'Pending comment for moderation',
          status: 'pending',
          author: {
            name: 'User One',
            email: 'user1@example.com'
          }
        })
      },
      {
        ...testUtils.generateTestComment({
          content: 'Approved comment content',
          status: 'approved',
          author: {
            name: 'User Two',
            email: 'user2@example.com'
          }
        })
      },
      {
        ...testUtils.generateTestComment({
          content: 'Reported comment content',
          status: 'approved',
          isReported: true,
          reportCount: 3,
          author: {
            name: 'User Three',
            email: 'user3@example.com'
          }
        })
      },
      {
        ...testUtils.generateTestComment({
          content: 'Rejected comment content',
          status: 'rejected',
          author: {
            name: 'User Four',
            email: 'user4@example.com'
          }
        })
      }
    ];

    for (const data of commentData) {
      const comment = new Comment(data);
      await comment.save();
      testComments.push(comment);
    }

    // Create test reports
    testReports = [];
    const reportData = [
      {
        ...testUtils.generateTestReport({
          commentId: testComments[2]._id,
          reason: 'spam',
          status: 'pending'
        })
      },
      {
        ...testUtils.generateTestReport({
          commentId: testComments[2]._id,
          reason: 'inappropriate',
          status: 'pending'
        })
      }
    ];

    for (const data of reportData) {
      const report = new Report(data);
      await report.save();
      testReports.push(report);
    }
  });

  describe('GET /admin/comments - getPendingComments', () => {
    it('should return pending comments for moderation', async () => {
      const response = await request(app)
        .get('/admin/comments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should only return pending comments
      response.body.data.forEach(comment => {
        expect(comment.status).toBe('pending');
      });
    });

    it('should handle pagination for pending comments', async () => {
      const response = await request(app)
        .get('/admin/comments?page=1&limit=2')
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.pageSize).toBe(2);
    });

    it('should sort comments by creation date', async () => {
      const response = await request(app)
        .get('/admin/comments?sort=createdAt&order=desc')
        .expect(200);

      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          const current = new Date(response.body.data[i].createdAt);
          const previous = new Date(response.body.data[i - 1].createdAt);
          expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
        }
      }
    });

    it('should include full author information for moderation', async () => {
      const response = await request(app)
        .get('/admin/comments')
        .expect(200);

      response.body.data.forEach(comment => {
        expect(comment.author).toBeDefined();
        expect(comment.author.name).toBeDefined();
        expect(comment.author.email).toBeDefined(); // Should include email for moderation
      });
    });

    it('should filter by content keywords', async () => {
      const response = await request(app)
        .get('/admin/comments?search=Pending')
        .expect(200);

      response.body.data.forEach(comment => {
        expect(comment.content.toLowerCase()).toContain('pending');
      });
    });

    it('should handle empty results', async () => {
      // Mark all pending comments as approved
      await Comment.updateMany({ status: 'pending' }, { status: 'approved' });

      const response = await request(app)
        .get('/admin/comments')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PATCH /admin/comments/:id - moderateComment', () => {
    it('should approve a pending comment', async () => {
      const pendingComment = testComments.find(c => c.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/comments/${pendingComment._id}`)
        .send({
          action: 'approve',
          moderatorNote: 'Comment approved after review'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.moderatedBy).toBeDefined();
      expect(response.body.data.moderatorNote).toBe('Comment approved after review');

      // Verify in database
      const updatedComment = await Comment.findById(pendingComment._id);
      expect(updatedComment.status).toBe('approved');
    });

    it('should reject a pending comment', async () => {
      const pendingComment = testComments.find(c => c.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/comments/${pendingComment._id}`)
        .send({
          action: 'reject',
          moderatorNote: 'Comment rejected for inappropriate content'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.moderatorNote).toBe('Comment rejected for inappropriate content');
    });

    it('should hide a comment', async () => {
      const approvedComment = testComments.find(c => c.status === 'approved' && !c.isReported);
      
      const response = await request(app)
        .patch(`/admin/comments/${approvedComment._id}`)
        .send({
          action: 'hide',
          moderatorNote: 'Comment hidden due to violation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('hidden');
    });

    it('should validate moderation action', async () => {
      const pendingComment = testComments.find(c => c.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/comments/${pendingComment._id}`)
        .send({
          action: 'invalid-action'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('action');
    });

    it('should require moderator note for rejection', async () => {
      const pendingComment = testComments.find(c => c.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/comments/${pendingComment._id}`)
        .send({
          action: 'reject'
          // Missing moderatorNote
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const nonExistentId = testUtils.createObjectId();
      
      const response = await request(app)
        .patch(`/admin/comments/${nonExistentId}`)
        .send({
          action: 'approve'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should record moderation history', async () => {
      const pendingComment = testComments.find(c => c.status === 'pending');
      
      await request(app)
        .patch(`/admin/comments/${pendingComment._id}`)
        .send({
          action: 'approve',
          moderatorNote: 'Approved by admin'
        })
        .expect(200);

      const updatedComment = await Comment.findById(pendingComment._id);
      expect(updatedComment.moderatedAt).toBeDefined();
      expect(updatedComment.moderatedBy).toBeDefined();
    });
  });

  describe('GET /admin/comments/reported - getReportedComments', () => {
    it('should return reported comments', async () => {
      const response = await request(app)
        .get('/admin/comments/reported')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      response.body.data.forEach(comment => {
        expect(comment.isReported).toBe(true);
        expect(comment.reportCount).toBeGreaterThan(0);
      });
    });

    it('should sort by report count descending', async () => {
      const response = await request(app)
        .get('/admin/comments/reported?sort=reportCount&order=desc')
        .expect(200);

      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].reportCount)
            .toBeLessThanOrEqual(response.body.data[i - 1].reportCount);
        }
      }
    });

    it('should include report information', async () => {
      const response = await request(app)
        .get('/admin/comments/reported')
        .expect(200);

      response.body.data.forEach(comment => {
        expect(comment.reportCount).toBeDefined();
        expect(comment.isReported).toBe(true);
      });
    });

    it('should filter by report threshold', async () => {
      const response = await request(app)
        .get('/admin/comments/reported?minReports=2')
        .expect(200);

      response.body.data.forEach(comment => {
        expect(comment.reportCount).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('GET /admin/reports - getAllReports', () => {
    it('should return all reports', async () => {
      const response = await request(app)
        .get('/admin/reports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include comment information in reports', async () => {
      const response = await request(app)
        .get('/admin/reports')
        .expect(200);

      response.body.data.forEach(report => {
        expect(report.commentId).toBeDefined();
        expect(report.reason).toBeDefined();
        expect(report.status).toBeDefined();
      });
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/admin/reports?status=pending')
        .expect(200);

      response.body.data.forEach(report => {
        expect(report.status).toBe('pending');
      });
    });

    it('should filter reports by reason', async () => {
      const response = await request(app)
        .get('/admin/reports?reason=spam')
        .expect(200);

      response.body.data.forEach(report => {
        expect(report.reason).toBe('spam');
      });
    });

    it('should handle pagination for reports', async () => {
      const response = await request(app)
        .get('/admin/reports?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.pageSize).toBe(5);
    });
  });

  describe('PATCH /admin/reports/:id - handleReport', () => {
    it('should resolve a report', async () => {
      const pendingReport = testReports.find(r => r.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/reports/${pendingReport._id}`)
        .send({
          action: 'resolve',
          resolution: 'Report reviewed and resolved'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolution).toBe('Report reviewed and resolved');

      // Verify in database
      const updatedReport = await Report.findById(pendingReport._id);
      expect(updatedReport.status).toBe('resolved');
    });

    it('should dismiss a report', async () => {
      const pendingReport = testReports.find(r => r.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/reports/${pendingReport._id}`)
        .send({
          action: 'dismiss',
          resolution: 'Report dismissed as invalid'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('dismissed');
    });

    it('should validate report action', async () => {
      const pendingReport = testReports.find(r => r.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/reports/${pendingReport._id}`)
        .send({
          action: 'invalid-action'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require resolution message', async () => {
      const pendingReport = testReports.find(r => r.status === 'pending');
      
      const response = await request(app)
        .patch(`/admin/reports/${pendingReport._id}`)
        .send({
          action: 'resolve'
          // Missing resolution
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should record handler information', async () => {
      const pendingReport = testReports.find(r => r.status === 'pending');
      
      await request(app)
        .patch(`/admin/reports/${pendingReport._id}`)
        .send({
          action: 'resolve',
          resolution: 'Handled by admin'
        })
        .expect(200);

      const updatedReport = await Report.findById(pendingReport._id);
      expect(updatedReport.handledBy).toBeDefined();
      expect(updatedReport.handledAt).toBeDefined();
    });
  });

  describe('GET /admin/stats - getModerationStats', () => {
    it('should return comprehensive moderation statistics', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const stats = response.body.data;
      expect(stats.comments).toBeDefined();
      expect(stats.comments.total).toBeDefined();
      expect(stats.comments.pending).toBeDefined();
      expect(stats.comments.approved).toBeDefined();
      expect(stats.comments.rejected).toBeDefined();
      expect(stats.comments.reported).toBeDefined();

      expect(stats.reports).toBeDefined();
      expect(stats.reports.total).toBeDefined();
      expect(stats.reports.pending).toBeDefined();
      expect(stats.reports.resolved).toBeDefined();
      expect(stats.reports.dismissed).toBeDefined();
    });

    it('should include time-based statistics', async () => {
      const response = await request(app)
        .get('/admin/stats?period=week')
        .expect(200);

      const stats = response.body.data;
      expect(stats.timeframe).toBeDefined();
      expect(stats.commentsThisPeriod).toBeDefined();
      expect(stats.reportsThisPeriod).toBeDefined();
    });

    it('should calculate moderation workload', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .expect(200);

      const stats = response.body.data;
      expect(stats.workload).toBeDefined();
      expect(stats.workload.pendingComments).toBeDefined();
      expect(stats.workload.pendingReports).toBeDefined();
      expect(stats.workload.priorityItems).toBeDefined();
    });

    it('should include top reporters and moderators', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .expect(200);

      const stats = response.body.data;
      expect(stats.topReporters).toBeDefined();
      expect(stats.topModerators).toBeDefined();
    });
  });

  describe('POST /admin/comments/:id/ban-user - banUser', () => {
    it('should ban a user and hide their comments', async () => {
      const comment = testComments[0];
      
      const response = await request(app)
        .post(`/admin/comments/${comment._id}/ban-user`)
        .send({
          reason: 'Repeated violations of community guidelines',
          duration: '7d' // 7 days
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('banned');

      // Verify comments from this user are hidden
      const userComments = await Comment.find({
        'author.email': comment.author.email
      });
      
      userComments.forEach(userComment => {
        expect(userComment.status).toBe('hidden');
      });
    });

    it('should validate ban reason', async () => {
      const comment = testComments[0];
      
      const response = await request(app)
        .post(`/admin/comments/${comment._id}/ban-user`)
        .send({
          duration: '7d'
          // Missing reason
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate ban duration', async () => {
      const comment = testComments[0];
      
      const response = await request(app)
        .post(`/admin/comments/${comment._id}/ban-user`)
        .send({
          reason: 'Test ban',
          duration: 'invalid-duration'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle permanent bans', async () => {
      const comment = testComments[0];
      
      const response = await request(app)
        .post(`/admin/comments/${comment._id}/ban-user`)
        .send({
          reason: 'Permanent ban for severe violations',
          duration: 'permanent'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization and Security', () => {
    it('should require admin role for moderation actions', async () => {
      // Create app without admin middleware
      const nonAdminApp = express();
      nonAdminApp.use(express.json());
      nonAdminApp.use((req, res, next) => {
        req.user = {
          userId: testUtils.createObjectId(),
          email: 'user@example.com',
          role: 'user' // Regular user, not admin
        };
        next();
      });
      nonAdminApp.get('/admin/comments', moderationController.getPendingComments);

      const response = await request(nonAdminApp)
        .get('/admin/comments')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('admin');
    });

    it('should validate moderator permissions', async () => {
      // This would test more granular permissions if implemented
      const comment = testComments[0];
      
      const response = await request(app)
        .patch(`/admin/comments/${comment._id}`)
        .send({
          action: 'approve'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in moderation', async () => {
      jest.spyOn(Comment, 'findById').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const comment = testComments[0];
      
      const response = await request(app)
        .patch(`/admin/comments/${comment._id}`)
        .send({
          action: 'approve'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent moderation attempts', async () => {
      const comment = testComments[0];
      
      // Simulate two admins trying to moderate the same comment
      const promises = [
        request(app)
          .patch(`/admin/comments/${comment._id}`)
          .send({ action: 'approve' }),
        request(app)
          .patch(`/admin/comments/${comment._id}`)
          .send({ action: 'reject' })
      ];

      const results = await Promise.allSettled(promises);
      
      // One should succeed, one might fail or both might succeed with last-write-wins
      expect(results.some(r => r.value && r.value.status === 200)).toBe(true);
    });
  });
});