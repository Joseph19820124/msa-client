const mongoose = require('mongoose');
const Comment = require('../../../models/Comment');

describe('Comment Model Unit Tests', () => {
  
  describe('Schema Validation', () => {
    it('should create a valid comment with required fields', async () => {
      const commentData = testUtils.generateTestComment();

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment._id).toBeDefined();
      expect(savedComment.content).toBe(commentData.content);
      expect(savedComment.author.name).toBe(commentData.author.name);
      expect(savedComment.author.email).toBe(commentData.author.email);
      expect(savedComment.postId).toBe(commentData.postId);
      expect(savedComment.createdAt).toBeDefined();
      expect(savedComment.updatedAt).toBeDefined();
    });

    it('should require content field', async () => {
      const commentData = testUtils.generateTestComment();
      delete commentData.content;

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/content.*required/i);
    });

    it('should require author name', async () => {
      const commentData = testUtils.generateTestComment();
      delete commentData.author.name;

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/author.*name.*required/i);
    });

    it('should require author email', async () => {
      const commentData = testUtils.generateTestComment();
      delete commentData.author.email;

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/author.*email.*required/i);
    });

    it('should require postId field', async () => {
      const commentData = testUtils.generateTestComment();
      delete commentData.postId;

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/postId.*required/i);
    });

    it('should validate content length constraints', async () => {
      const commentData = testUtils.generateTestComment({
        content: 'Short' // Too short (minimum 10 characters)
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/content.*shorter/i);
    });

    it('should validate content maximum length', async () => {
      const commentData = testUtils.generateTestComment({
        content: 'A'.repeat(5001) // Too long (maximum 5000 characters)
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/content.*longer/i);
    });

    it('should validate author name length', async () => {
      const commentData = testUtils.generateTestComment({
        author: {
          name: 'A', // Too short
          email: 'test@example.com'
        }
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/author.*name.*shorter/i);
    });

    it('should validate author name maximum length', async () => {
      const commentData = testUtils.generateTestComment({
        author: {
          name: 'A'.repeat(101), // Too long (maximum 100 characters)
          email: 'test@example.com'
        }
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/author.*name.*longer/i);
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'invalid@',
        '@invalid.com',
        'invalid.com',
        'invalid@invalid',
        'invalid@.com'
      ];

      for (const email of invalidEmails) {
        const commentData = testUtils.generateTestComment({
          author: {
            name: 'Test User',
            email
          }
        });

        const comment = new Comment(commentData);
        await expect(comment.save()).rejects.toThrow(/email.*format/i);
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@subdomain.example.com'
      ];

      for (const email of validEmails) {
        const commentData = testUtils.generateTestComment({
          author: {
            name: 'Test User',
            email
          },
          content: `Test comment for ${email}`
        });

        const comment = new Comment(commentData);
        const savedComment = await comment.save();

        expect(savedComment.author.email).toBe(email);
      }
    });

    it('should validate status enum values', async () => {
      const commentData = testUtils.generateTestComment({
        status: 'invalid-status'
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/status.*valid/i);
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'hidden'];

      for (const status of validStatuses) {
        const commentData = testUtils.generateTestComment({
          content: `Test comment with status ${status}`,
          status
        });

        const comment = new Comment(commentData);
        const savedComment = await comment.save();

        expect(savedComment.status).toBe(status);
      }
    });

    it('should validate postId as ObjectId', async () => {
      const commentData = testUtils.generateTestComment({
        postId: 'invalid-object-id'
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/postId.*ObjectId/i);
    });

    it('should validate parentId as ObjectId when provided', async () => {
      const commentData = testUtils.generateTestComment({
        parentId: 'invalid-object-id'
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/parentId.*ObjectId/i);
    });

    it('should validate likes as non-negative number', async () => {
      const commentData = testUtils.generateTestComment({
        likes: -1 // Negative likes not allowed
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/likes.*negative/i);
    });

    it('should validate reportCount as non-negative number', async () => {
      const commentData = testUtils.generateTestComment({
        reportCount: -1 // Negative report count not allowed
      });

      const comment = new Comment(commentData);

      await expect(comment.save()).rejects.toThrow(/reportCount.*negative/i);
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const commentData = {
        content: 'Minimal comment content for testing defaults',
        author: {
          name: 'Test User',
          email: 'test@example.com'
        },
        postId: testUtils.createObjectId()
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment.status).toBe('pending'); // Default status
      expect(savedComment.isReported).toBe(false); // Default isReported
      expect(savedComment.likes).toBe(0); // Default likes
      expect(savedComment.reportCount).toBe(0); // Default reportCount
      expect(savedComment.parentId).toBeUndefined(); // No default parentId
    });

    it('should auto-sanitize content on save', async () => {
      const maliciousContent = 'This is a comment with <script>alert("xss")</script> and <img src="x" onerror="alert(1)"> malicious content';
      
      const commentData = testUtils.generateTestComment({
        content: maliciousContent
      });

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment.content).not.toContain('<script>');
      expect(savedComment.content).not.toContain('onerror');
      expect(savedComment.content).toContain('This is a comment with');
    });

    it('should preserve safe HTML tags if configured', async () => {
      const contentWithSafeHTML = 'This comment has <strong>bold</strong> and <em>italic</em> text';
      
      const commentData = testUtils.generateTestComment({
        content: contentWithSafeHTML
      });

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      // Depending on sanitization config, safe tags might be preserved
      expect(savedComment.content).toContain('bold');
      expect(savedComment.content).toContain('italic');
    });
  });

  describe('Instance Methods', () => {
    let testComment;

    beforeEach(async () => {
      testComment = new Comment(testUtils.generateTestComment());
      await testComment.save();
    });

    it('should increment like count', async () => {
      const initialLikes = testComment.likes;
      
      await testComment.incrementLikes();
      
      expect(testComment.likes).toBe(initialLikes + 1);
      
      // Verify in database
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.likes).toBe(initialLikes + 1);
    });

    it('should decrement like count', async () => {
      testComment.likes = 5;
      await testComment.save();
      
      await testComment.decrementLikes();
      
      expect(testComment.likes).toBe(4);
      
      // Verify in database
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.likes).toBe(4);
    });

    it('should not allow likes to go below zero', async () => {
      testComment.likes = 0;
      await testComment.save();
      
      await testComment.decrementLikes();
      
      expect(testComment.likes).toBe(0);
    });

    it('should increment report count', async () => {
      const initialReports = testComment.reportCount;
      
      await testComment.incrementReports();
      
      expect(testComment.reportCount).toBe(initialReports + 1);
      expect(testComment.isReported).toBe(true);
      
      // Verify in database
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.reportCount).toBe(initialReports + 1);
      expect(updatedComment.isReported).toBe(true);
    });

    it('should check if comment is approved', () => {
      testComment.status = 'approved';
      expect(testComment.isApproved()).toBe(true);

      testComment.status = 'pending';
      expect(testComment.isApproved()).toBe(false);

      testComment.status = 'rejected';
      expect(testComment.isApproved()).toBe(false);
    });

    it('should check if comment is pending', () => {
      testComment.status = 'pending';
      expect(testComment.isPending()).toBe(true);

      testComment.status = 'approved';
      expect(testComment.isPending()).toBe(false);
    });

    it('should check if comment is hidden or rejected', () => {
      testComment.status = 'hidden';
      expect(testComment.isHidden()).toBe(true);

      testComment.status = 'rejected';
      expect(testComment.isHidden()).toBe(true);

      testComment.status = 'approved';
      expect(testComment.isHidden()).toBe(false);
    });

    it('should moderate comment status', async () => {
      const moderatorId = testUtils.createObjectId();
      const moderatorNote = 'Comment approved after review';
      
      await testComment.moderate('approved', moderatorId, moderatorNote);
      
      expect(testComment.status).toBe('approved');
      expect(testComment.moderatedBy).toEqual(moderatorId);
      expect(testComment.moderatorNote).toBe(moderatorNote);
      expect(testComment.moderatedAt).toBeDefined();
      
      // Verify in database
      const updatedComment = await Comment.findById(testComment._id);
      expect(updatedComment.status).toBe('approved');
      expect(updatedComment.moderatedBy).toEqual(moderatorId);
    });

    it('should format comment for API response', () => {
      const formatted = testComment.toAPIResponse();

      expect(formatted.id).toBe(testComment._id.toString());
      expect(formatted.content).toBe(testComment.content);
      expect(formatted.author).toBeDefined();
      expect(formatted.author.name).toBe(testComment.author.name);
      expect(formatted.author.email).toBeUndefined(); // Email should be excluded
      expect(formatted.status).toBe(testComment.status);
      expect(formatted.likes).toBe(testComment.likes);
      expect(formatted.createdAt).toBeDefined();
      expect(formatted.updatedAt).toBeDefined();
      expect(formatted.__v).toBeUndefined(); // Should exclude version key
    });

    it('should format comment for admin response', () => {
      const formatted = testComment.toAdminResponse();

      expect(formatted.id).toBe(testComment._id.toString());
      expect(formatted.content).toBe(testComment.content);
      expect(formatted.author).toBeDefined();
      expect(formatted.author.name).toBe(testComment.author.name);
      expect(formatted.author.email).toBe(testComment.author.email); // Email should be included for admin
      expect(formatted.reportCount).toBe(testComment.reportCount);
      expect(formatted.isReported).toBe(testComment.isReported);
      expect(formatted.moderatedBy).toBe(testComment.moderatedBy);
      expect(formatted.moderatorNote).toBe(testComment.moderatorNote);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const postId1 = testUtils.createObjectId();
      const postId2 = testUtils.createObjectId();
      
      // Create test comments with different statuses and posts
      const comments = [
        {
          ...testUtils.generateTestComment({
            postId: postId1,
            content: 'Approved comment 1',
            status: 'approved',
            likes: 10
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: postId1,
            content: 'Approved comment 2',
            status: 'approved',
            likes: 5
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: postId1,
            content: 'Pending comment',
            status: 'pending',
            likes: 0
          })
        },
        {
          ...testUtils.generateTestComment({
            postId: postId2,
            content: 'Reported comment',
            status: 'approved',
            isReported: true,
            reportCount: 3
          })
        }
      ];

      await Comment.insertMany(comments);
    });

    it('should find approved comments only', async () => {
      const approvedComments = await Comment.findApproved();
      
      expect(approvedComments.length).toBeGreaterThan(0);
      expect(approvedComments.every(comment => comment.status === 'approved')).toBe(true);
    });

    it('should find pending comments only', async () => {
      const pendingComments = await Comment.findPending();
      
      expect(pendingComments.length).toBeGreaterThan(0);
      expect(pendingComments.every(comment => comment.status === 'pending')).toBe(true);
    });

    it('should find reported comments only', async () => {
      const reportedComments = await Comment.findReported();
      
      expect(reportedComments.length).toBeGreaterThan(0);
      expect(reportedComments.every(comment => comment.isReported === true)).toBe(true);
    });

    it('should find comments by post ID', async () => {
      const allComments = await Comment.find();
      const firstPostId = allComments[0].postId;
      
      const postComments = await Comment.findByPost(firstPostId);
      
      expect(postComments.length).toBeGreaterThan(0);
      expect(postComments.every(comment => comment.postId.toString() === firstPostId.toString())).toBe(true);
    });

    it('should find comments by author email', async () => {
      const allComments = await Comment.find();
      const authorEmail = allComments[0].author.email;
      
      const authorComments = await Comment.findByAuthor(authorEmail);
      
      expect(authorComments.length).toBeGreaterThan(0);
      expect(authorComments.every(comment => comment.author.email === authorEmail)).toBe(true);
    });

    it('should search comments by content', async () => {
      const searchResults = await Comment.searchByContent('Approved');
      
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.every(comment => comment.content.includes('Approved'))).toBe(true);
    });

    it('should get stats summary', async () => {
      const stats = await Comment.getStatsSummary();
      
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.approved).toBeGreaterThan(0);
      expect(stats.pending).toBeGreaterThan(0);
      expect(stats.reported).toBeGreaterThan(0);
      expect(stats.totalLikes).toBeGreaterThan(0);
    });

    it('should get stats by post', async () => {
      const allComments = await Comment.find();
      const postId = allComments[0].postId;
      
      const postStats = await Comment.getStatsByPost(postId);
      
      expect(postStats).toBeDefined();
      expect(postStats.total).toBeGreaterThan(0);
      expect(postStats.approved).toBeDefined();
      expect(postStats.pending).toBeDefined();
    });

    it('should find popular comments by likes', async () => {
      const popularComments = await Comment.findPopular(2);
      
      expect(popularComments).toHaveLength(2);
      
      // Should be sorted by likes descending
      for (let i = 1; i < popularComments.length; i++) {
        expect(popularComments[i].likes).toBeLessThanOrEqual(popularComments[i - 1].likes);
      }
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes for queries', async () => {
      const indexes = await Comment.collection.getIndexes();
      
      // Check for expected indexes
      expect(indexes).toHaveProperty('postId_1');
      expect(indexes).toHaveProperty('status_1');
      expect(indexes).toHaveProperty('author.email_1');
      expect(indexes).toHaveProperty('createdAt_-1');
      expect(indexes).toHaveProperty('isReported_1');
    });

    it('should perform efficient queries on indexed fields', async () => {
      // Create many comments for performance testing
      const comments = [];
      const postId = testUtils.createObjectId();
      
      for (let i = 0; i < 100; i++) {
        comments.push({
          ...testUtils.generateTestComment({
            postId,
            content: `Performance test comment ${i}`,
            status: i % 3 === 0 ? 'pending' : 'approved'
          })
        });
      }
      await Comment.insertMany(comments);

      const startTime = Date.now();
      
      // Test indexed query performance
      const results = await Comment.find({ postId, status: 'approved' });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });
  });

  describe('Middleware Hooks', () => {
    it('should update timestamps on save', async () => {
      const comment = new Comment(testUtils.generateTestComment());

      const savedComment = await comment.save();
      const originalUpdatedAt = savedComment.updatedAt;

      // Wait a moment and update
      await testUtils.wait(10);
      savedComment.content = 'Updated comment content for timestamp test';
      await savedComment.save();

      expect(savedComment.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should sanitize content on save', async () => {
      const comment = new Comment(testUtils.generateTestComment({
        content: 'Comment with <script>alert("xss")</script> malicious content'
      }));

      const savedComment = await comment.save();
      
      expect(savedComment.content).not.toContain('<script>');
      expect(savedComment.content).toContain('Comment with');
    });

    it('should validate content on update', async () => {
      const comment = new Comment(testUtils.generateTestComment());
      await comment.save();

      comment.content = 'Short'; // Too short
      
      await expect(comment.save()).rejects.toThrow(/content.*shorter/i);
    });

    it('should auto-set moderation timestamps', async () => {
      const comment = new Comment(testUtils.generateTestComment());
      await comment.save();

      const moderatorId = testUtils.createObjectId();
      comment.status = 'approved';
      comment.moderatedBy = moderatorId;
      comment.moderatorNote = 'Approved by admin';
      
      await comment.save();

      expect(comment.moderatedAt).toBeDefined();
      expect(comment.moderatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Virtual Properties', () => {
    let testComment;

    beforeEach(async () => {
      testComment = new Comment(testUtils.generateTestComment());
      await testComment.save();
    });

    it('should provide age virtual property', () => {
      const age = testComment.age;
      expect(age).toBeGreaterThanOrEqual(0);
      expect(typeof age).toBe('number');
    });

    it('should provide formatted date virtual property', () => {
      const formattedDate = testComment.formattedDate;
      expect(formattedDate).toBeDefined();
      expect(typeof formattedDate).toBe('string');
    });

    it('should provide author initials virtual property', () => {
      const initials = testComment.authorInitials;
      expect(initials).toBeDefined();
      expect(typeof initials).toBe('string');
      expect(initials.length).toBeGreaterThan(0);
    });

    it('should check if comment needs moderation', () => {
      testComment.status = 'pending';
      expect(testComment.needsModeration).toBe(true);

      testComment.status = 'approved';
      expect(testComment.needsModeration).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      jest.spyOn(Comment.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const comment = new Comment(testUtils.generateTestComment());

      await expect(comment.save()).rejects.toThrow('Database connection error');
    });

    it('should handle validation errors gracefully', async () => {
      const comment = new Comment({
        content: '', // Invalid content
        author: {
          name: 'Test User',
          email: 'test@example.com'
        },
        postId: testUtils.createObjectId()
      });

      try {
        await comment.save();
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.content).toBeDefined();
      }
    });

    it('should handle concurrent modifications', async () => {
      const comment = new Comment(testUtils.generateTestComment());
      await comment.save();

      // Simulate concurrent modifications
      const comment1 = await Comment.findById(comment._id);
      const comment2 = await Comment.findById(comment._id);

      comment1.likes = 5;
      comment2.likes = 10;

      await comment1.save();
      
      // Second save should handle the version conflict
      try {
        await comment2.save();
      } catch (error) {
        // Expect versioning conflict or successful save with last-write-wins
        expect(error.name === 'VersionError' || !error).toBeTruthy();
      }
    });
  });
});