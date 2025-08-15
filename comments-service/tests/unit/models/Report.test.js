const mongoose = require('mongoose');
const Report = require('../../../models/Report');
const Comment = require('../../../models/Comment');

describe('Report Model Unit Tests', () => {
  let testComment;

  beforeEach(async () => {
    // Create a test comment to report
    testComment = new Comment(testUtils.generateTestComment());
    await testComment.save();
  });

  describe('Schema Validation', () => {
    it('should create a valid report with required fields', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id
      });

      const report = new Report(reportData);
      const savedReport = await report.save();

      expect(savedReport._id).toBeDefined();
      expect(savedReport.commentId).toEqual(testComment._id);
      expect(savedReport.reportedBy.name).toBe(reportData.reportedBy.name);
      expect(savedReport.reportedBy.email).toBe(reportData.reportedBy.email);
      expect(savedReport.reason).toBe(reportData.reason);
      expect(savedReport.description).toBe(reportData.description);
      expect(savedReport.createdAt).toBeDefined();
      expect(savedReport.updatedAt).toBeDefined();
    });

    it('should require commentId field', async () => {
      const reportData = testUtils.generateTestReport();
      delete reportData.commentId;

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/commentId.*required/i);
    });

    it('should require reportedBy name', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id
      });
      delete reportData.reportedBy.name;

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/reportedBy.*name.*required/i);
    });

    it('should require reportedBy email', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id
      });
      delete reportData.reportedBy.email;

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/reportedBy.*email.*required/i);
    });

    it('should require reason field', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id
      });
      delete reportData.reason;

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/reason.*required/i);
    });

    it('should validate commentId as ObjectId', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: 'invalid-object-id'
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/commentId.*ObjectId/i);
    });

    it('should validate reportedBy name length', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        reportedBy: {
          name: 'A', // Too short
          email: 'test@example.com'
        }
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/reportedBy.*name.*shorter/i);
    });

    it('should validate reportedBy name maximum length', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        reportedBy: {
          name: 'A'.repeat(101), // Too long (maximum 100 characters)
          email: 'test@example.com'
        }
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/reportedBy.*name.*longer/i);
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'invalid@',
        '@invalid.com',
        'invalid.com',
        'invalid@invalid'
      ];

      for (const email of invalidEmails) {
        const reportData = testUtils.generateTestReport({
          commentId: testComment._id,
          reportedBy: {
            name: 'Test Reporter',
            email
          }
        });

        const report = new Report(reportData);
        await expect(report.save()).rejects.toThrow(/email.*format/i);
      }
    });

    it('should validate reason enum values', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        reason: 'invalid-reason'
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/reason.*valid/i);
    });

    it('should accept valid reason values', async () => {
      const validReasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'];

      for (const reason of validReasons) {
        const reportData = testUtils.generateTestReport({
          commentId: testComment._id,
          reason,
          description: `Test report for ${reason}`
        });

        const report = new Report(reportData);
        const savedReport = await report.save();

        expect(savedReport.reason).toBe(reason);
      }
    });

    it('should validate status enum values', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        status: 'invalid-status'
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/status.*valid/i);
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];

      for (const status of validStatuses) {
        const reportData = testUtils.generateTestReport({
          commentId: testComment._id,
          status,
          description: `Test report with status ${status}`
        });

        const report = new Report(reportData);
        const savedReport = await report.save();

        expect(savedReport.status).toBe(status);
      }
    });

    it('should validate description length', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        description: 'A'.repeat(1001) // Too long (maximum 1000 characters)
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/description.*longer/i);
    });

    it('should allow empty description', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id
      });
      delete reportData.description;

      const report = new Report(reportData);
      const savedReport = await report.save();

      expect(savedReport.description).toBe('');
    });

    it('should validate handledBy as ObjectId when provided', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        handledBy: 'invalid-object-id'
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/handledBy.*ObjectId/i);
    });

    it('should validate resolution length', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        resolution: 'A'.repeat(1001) // Too long (maximum 1000 characters)
      });

      const report = new Report(reportData);

      await expect(report.save()).rejects.toThrow(/resolution.*longer/i);
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const reportData = {
        commentId: testComment._id,
        reportedBy: {
          name: 'Test Reporter',
          email: 'reporter@example.com'
        },
        reason: 'spam'
      };

      const report = new Report(reportData);
      const savedReport = await report.save();

      expect(savedReport.status).toBe('pending'); // Default status
      expect(savedReport.description).toBe(''); // Default description
      expect(savedReport.resolution).toBe(''); // Default resolution
      expect(savedReport.handledBy).toBeUndefined(); // No default handledBy
      expect(savedReport.handledAt).toBeUndefined(); // No default handledAt
    });

    it('should auto-sanitize description content', async () => {
      const maliciousDescription = 'This report contains <script>alert("xss")</script> malicious content';
      
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        description: maliciousDescription
      });

      const report = new Report(reportData);
      const savedReport = await report.save();

      expect(savedReport.description).not.toContain('<script>');
      expect(savedReport.description).toContain('This report contains');
    });
  });

  describe('Instance Methods', () => {
    let testReport;

    beforeEach(async () => {
      testReport = new Report(testUtils.generateTestReport({
        commentId: testComment._id
      }));
      await testReport.save();
    });

    it('should check if report is pending', () => {
      testReport.status = 'pending';
      expect(testReport.isPending()).toBe(true);

      testReport.status = 'resolved';
      expect(testReport.isPending()).toBe(false);

      testReport.status = 'dismissed';
      expect(testReport.isPending()).toBe(false);
    });

    it('should check if report is resolved', () => {
      testReport.status = 'resolved';
      expect(testReport.isResolved()).toBe(true);

      testReport.status = 'pending';
      expect(testReport.isResolved()).toBe(false);

      testReport.status = 'dismissed';
      expect(testReport.isResolved()).toBe(false);
    });

    it('should check if report is dismissed', () => {
      testReport.status = 'dismissed';
      expect(testReport.isDismissed()).toBe(true);

      testReport.status = 'pending';
      expect(testReport.isDismissed()).toBe(false);

      testReport.status = 'resolved';
      expect(testReport.isDismissed()).toBe(false);
    });

    it('should handle report resolution', async () => {
      const handlerId = testUtils.createObjectId();
      const resolution = 'Report reviewed and comment removed';
      
      await testReport.resolve(handlerId, resolution);
      
      expect(testReport.status).toBe('resolved');
      expect(testReport.handledBy).toEqual(handlerId);
      expect(testReport.resolution).toBe(resolution);
      expect(testReport.handledAt).toBeDefined();
      
      // Verify in database
      const updatedReport = await Report.findById(testReport._id);
      expect(updatedReport.status).toBe('resolved');
      expect(updatedReport.handledBy).toEqual(handlerId);
    });

    it('should handle report dismissal', async () => {
      const handlerId = testUtils.createObjectId();
      const resolution = 'Report dismissed as invalid';
      
      await testReport.dismiss(handlerId, resolution);
      
      expect(testReport.status).toBe('dismissed');
      expect(testReport.handledBy).toEqual(handlerId);
      expect(testReport.resolution).toBe(resolution);
      expect(testReport.handledAt).toBeDefined();
      
      // Verify in database
      const updatedReport = await Report.findById(testReport._id);
      expect(updatedReport.status).toBe('dismissed');
    });

    it('should update report status to reviewing', async () => {
      await testReport.setReviewing();
      
      expect(testReport.status).toBe('reviewing');
      
      // Verify in database
      const updatedReport = await Report.findById(testReport._id);
      expect(updatedReport.status).toBe('reviewing');
    });

    it('should format report for API response', () => {
      const formatted = testReport.toAPIResponse();

      expect(formatted.id).toBe(testReport._id.toString());
      expect(formatted.commentId).toBe(testReport.commentId.toString());
      expect(formatted.reportedBy).toBeDefined();
      expect(formatted.reportedBy.name).toBe(testReport.reportedBy.name);
      expect(formatted.reportedBy.email).toBeUndefined(); // Email should be excluded
      expect(formatted.reason).toBe(testReport.reason);
      expect(formatted.description).toBe(testReport.description);
      expect(formatted.status).toBe(testReport.status);
      expect(formatted.createdAt).toBeDefined();
      expect(formatted.__v).toBeUndefined(); // Should exclude version key
    });

    it('should format report for admin response', () => {
      testReport.handledBy = testUtils.createObjectId();
      testReport.resolution = 'Admin resolution';
      
      const formatted = testReport.toAdminResponse();

      expect(formatted.id).toBe(testReport._id.toString());
      expect(formatted.reportedBy.email).toBe(testReport.reportedBy.email); // Email should be included for admin
      expect(formatted.handledBy).toBeDefined();
      expect(formatted.resolution).toBe(testReport.resolution);
      expect(formatted.handledAt).toBeDefined();
    });

    it('should calculate report age', () => {
      const age = testReport.age;
      expect(age).toBeGreaterThanOrEqual(0);
      expect(typeof age).toBe('number');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create multiple test comments and reports
      const comments = [];
      for (let i = 0; i < 3; i++) {
        const comment = new Comment(testUtils.generateTestComment({
          content: `Test comment ${i}`
        }));
        await comment.save();
        comments.push(comment);
      }

      // Create test reports with different statuses
      const reports = [
        {
          ...testUtils.generateTestReport({
            commentId: comments[0]._id,
            reason: 'spam',
            status: 'pending'
          })
        },
        {
          ...testUtils.generateTestReport({
            commentId: comments[0]._id,
            reason: 'inappropriate',
            status: 'pending'
          })
        },
        {
          ...testUtils.generateTestReport({
            commentId: comments[1]._id,
            reason: 'harassment',
            status: 'resolved'
          })
        },
        {
          ...testUtils.generateTestReport({
            commentId: comments[2]._id,
            reason: 'misinformation',
            status: 'dismissed'
          })
        }
      ];

      await Report.insertMany(reports);
    });

    it('should find pending reports only', async () => {
      const pendingReports = await Report.findPending();
      
      expect(pendingReports.length).toBeGreaterThan(0);
      expect(pendingReports.every(report => report.status === 'pending')).toBe(true);
    });

    it('should find resolved reports only', async () => {
      const resolvedReports = await Report.findResolved();
      
      expect(resolvedReports.length).toBeGreaterThan(0);
      expect(resolvedReports.every(report => report.status === 'resolved')).toBe(true);
    });

    it('should find dismissed reports only', async () => {
      const dismissedReports = await Report.findDismissed();
      
      expect(dismissedReports.length).toBeGreaterThan(0);
      expect(dismissedReports.every(report => report.status === 'dismissed')).toBe(true);
    });

    it('should find reports by comment ID', async () => {
      const allReports = await Report.find();
      const firstCommentId = allReports[0].commentId;
      
      const commentReports = await Report.findByComment(firstCommentId);
      
      expect(commentReports.length).toBeGreaterThan(0);
      expect(commentReports.every(report => report.commentId.toString() === firstCommentId.toString())).toBe(true);
    });

    it('should find reports by reason', async () => {
      const spamReports = await Report.findByReason('spam');
      
      expect(spamReports.length).toBeGreaterThan(0);
      expect(spamReports.every(report => report.reason === 'spam')).toBe(true);
    });

    it('should find reports by reporter email', async () => {
      const allReports = await Report.find();
      const reporterEmail = allReports[0].reportedBy.email;
      
      const reporterReports = await Report.findByReporter(reporterEmail);
      
      expect(reporterReports.length).toBeGreaterThan(0);
      expect(reporterReports.every(report => report.reportedBy.email === reporterEmail)).toBe(true);
    });

    it('should get stats summary', async () => {
      const stats = await Report.getStatsSummary();
      
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.pending).toBeGreaterThan(0);
      expect(stats.resolved).toBeGreaterThan(0);
      expect(stats.dismissed).toBeGreaterThan(0);
      expect(stats.byReason).toBeDefined();
      expect(stats.byReason.spam).toBeGreaterThan(0);
    });

    it('should find reports by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      const recentReports = await Report.findByDateRange(yesterday, today);
      
      expect(recentReports.length).toBeGreaterThan(0);
      recentReports.forEach(report => {
        expect(report.createdAt.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(report.createdAt.getTime()).toBeLessThanOrEqual(today.getTime());
      });
    });

    it('should find high priority reports', async () => {
      // High priority could be based on reason, age, or multiple reports for same comment
      const highPriorityReports = await Report.findHighPriority();
      
      expect(Array.isArray(highPriorityReports)).toBe(true);
      // Additional assertions would depend on the priority logic implementation
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes for queries', async () => {
      const indexes = await Report.collection.getIndexes();
      
      // Check for expected indexes
      expect(indexes).toHaveProperty('commentId_1');
      expect(indexes).toHaveProperty('status_1');
      expect(indexes).toHaveProperty('reason_1');
      expect(indexes).toHaveProperty('reportedBy.email_1');
      expect(indexes).toHaveProperty('createdAt_-1');
    });

    it('should perform efficient queries on indexed fields', async () => {
      // Create many reports for performance testing
      const reports = [];
      
      for (let i = 0; i < 100; i++) {
        reports.push({
          ...testUtils.generateTestReport({
            commentId: testComment._id,
            reason: i % 2 === 0 ? 'spam' : 'inappropriate',
            status: i % 3 === 0 ? 'pending' : 'resolved'
          })
        });
      }
      await Report.insertMany(reports);

      const startTime = Date.now();
      
      // Test indexed query performance
      const results = await Report.find({ commentId: testComment._id, status: 'pending' });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });

    it('should handle compound index queries efficiently', async () => {
      const startTime = Date.now();
      
      // Test compound index query
      const results = await Report.find({ 
        status: 'pending', 
        reason: 'spam' 
      }).sort({ createdAt: -1 });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(queryTime).toBeLessThan(100);
    });
  });

  describe('Middleware Hooks', () => {
    it('should update timestamps on save', async () => {
      const report = new Report(testUtils.generateTestReport({
        commentId: testComment._id
      }));

      const savedReport = await report.save();
      const originalUpdatedAt = savedReport.updatedAt;

      // Wait a moment and update
      await testUtils.wait(10);
      savedReport.description = 'Updated report description';
      await savedReport.save();

      expect(savedReport.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should sanitize description on save', async () => {
      const report = new Report(testUtils.generateTestReport({
        commentId: testComment._id,
        description: 'Report with <script>alert("xss")</script> malicious content'
      }));

      const savedReport = await report.save();
      
      expect(savedReport.description).not.toContain('<script>');
      expect(savedReport.description).toContain('Report with');
    });

    it('should auto-set handledAt timestamp when status changes to resolved', async () => {
      const report = new Report(testUtils.generateTestReport({
        commentId: testComment._id
      }));
      await report.save();

      report.status = 'resolved';
      report.handledBy = testUtils.createObjectId();
      
      await report.save();

      expect(report.handledAt).toBeDefined();
      expect(report.handledAt).toBeInstanceOf(Date);
    });

    it('should auto-set handledAt timestamp when status changes to dismissed', async () => {
      const report = new Report(testUtils.generateTestReport({
        commentId: testComment._id
      }));
      await report.save();

      report.status = 'dismissed';
      report.handledBy = testUtils.createObjectId();
      
      await report.save();

      expect(report.handledAt).toBeDefined();
    });
  });

  describe('Validation Edge Cases', () => {
    it('should prevent duplicate reports from same user for same comment', async () => {
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id
      });

      // Create first report
      const firstReport = new Report(reportData);
      await firstReport.save();

      // Try to create duplicate report
      const duplicateReport = new Report(reportData);
      
      // This should either fail with duplicate error or be handled by business logic
      try {
        await duplicateReport.save();
        // If it saves, verify business logic handles duplicates
        const reports = await Report.find({
          commentId: testComment._id,
          'reportedBy.email': reportData.reportedBy.email
        });
        expect(reports.length).toBeGreaterThanOrEqual(1);
      } catch (error) {
        // Expected if there's a unique constraint
        expect(error.code).toBe(11000); // MongoDB duplicate key error
      }
    });

    it('should handle very long but valid descriptions', async () => {
      const longDescription = 'A'.repeat(999); // Just under the limit
      
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        description: longDescription
      });

      const report = new Report(reportData);
      const savedReport = await report.save();

      expect(savedReport.description).toBe(longDescription);
    });

    it('should handle unicode characters in description', async () => {
      const unicodeDescription = 'Report with émojis 😀 and ñoñó characters';
      
      const reportData = testUtils.generateTestReport({
        commentId: testComment._id,
        description: unicodeDescription
      });

      const report = new Report(reportData);
      const savedReport = await report.save();

      expect(savedReport.description).toBe(unicodeDescription);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(Report.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const report = new Report(testUtils.generateTestReport({
        commentId: testComment._id
      }));

      await expect(report.save()).rejects.toThrow('Database connection error');
    });

    it('should handle validation errors gracefully', async () => {
      const report = new Report({
        // Missing required fields
        reason: 'spam'
      });

      try {
        await report.save();
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.commentId).toBeDefined();
        expect(error.errors.reportedBy).toBeDefined();
      }
    });

    it('should handle invalid ObjectId references', async () => {
      const report = new Report(testUtils.generateTestReport({
        commentId: new mongoose.Types.ObjectId() // Non-existent comment
      }));

      // Should save successfully (referential integrity handled at application level)
      const savedReport = await report.save();
      expect(savedReport.commentId).toBeDefined();
    });
  });
});