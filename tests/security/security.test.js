const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

// Import both services
const postsApp = require('../../posts-service/server');
const { app: commentsApp } = require('../../comments-service/server');

// Security test utilities
const SecurityTestUtils = {
  // Common XSS payloads
  xssPayloads: [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert("xss")',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<body onload="alert(1)">',
    '<div onclick="alert(1)">click</div>'
  ],

  // Common SQL injection payloads (adapted for NoSQL)
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users--",
    "admin'--",
    "admin'/*",
    "' OR 1=1#"
  ],

  // NoSQL injection payloads
  nosqlInjectionPayloads: [
    { $ne: null },
    { $regex: '.*' },
    { $where: 'function() { return true; }' },
    { $gt: '' },
    { $or: [{ username: 'admin' }, { username: 'user' }] }
  ],

  // Path traversal payloads
  pathTraversalPayloads: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd'
  ],

  // Command injection payloads
  commandInjectionPayloads: [
    '; ls -la',
    '| cat /etc/passwd',
    '`whoami`',
    '$(cat /etc/passwd)',
    '; rm -rf /',
    '|| ping -c 10 127.0.0.1'
  ],

  // Generate JWT tokens for testing
  generateToken: (payload, secret = 'test-secret', options = {}) => {
    return jwt.sign(payload, secret, { expiresIn: '1h', ...options });
  },

  // Generate expired token
  generateExpiredToken: (payload, secret = 'test-secret') => {
    return jwt.sign(payload, secret, { expiresIn: '-1h' });
  },

  // Generate invalid token
  generateInvalidToken: () => {
    return 'invalid.jwt.token';
  }
};

describe('Security Tests', () => {
  let testCategory;
  let testPost;
  let testComment;
  let validUserToken;
  let adminToken;

  beforeEach(async () => {
    // Set up test data
    const categoryResponse = await request(postsApp)
      .post('/categories')
      .send({
        name: 'Security Test Category',
        description: 'Category for security testing',
        color: '#007bff'
      });
    testCategory = categoryResponse.body.data;

    const postResponse = await request(postsApp)
      .post('/posts')
      .send({
        title: 'Security Test Post',
        content: 'This is a post for security testing',
        excerpt: 'Security test post',
        author: 'Security Tester',
        category: testCategory._id
      });
    testPost = postResponse.body.data;

    const commentResponse = await request(commentsApp)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .send({
        content: 'This is a test comment for security testing purposes',
        author: {
          name: 'Test Commenter',
          email: 'commenter@example.com'
        }
      });
    testComment = commentResponse.body.data;

    // Generate test tokens
    validUserToken = SecurityTestUtils.generateToken({
      userId: new mongoose.Types.ObjectId(),
      email: 'user@example.com',
      role: 'user'
    });

    adminToken = SecurityTestUtils.generateToken({
      userId: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      role: 'admin'
    });
  });

  describe('Input Validation and Sanitization', () => {
    describe('XSS Prevention', () => {
      it('should sanitize XSS payloads in post content', async () => {
        for (const payload of SecurityTestUtils.xssPayloads) {
          const response = await request(postsApp)
            .post('/posts')
            .send({
              title: `XSS Test: ${payload}`,
              content: `This content contains XSS: ${payload}`,
              excerpt: 'XSS test excerpt',
              author: 'Security Tester',
              category: testCategory._id
            });

          if (response.status === 201) {
            expect(response.body.data.title).not.toContain('<script>');
            expect(response.body.data.content).not.toContain('<script>');
            expect(response.body.data.title).not.toContain('javascript:');
            expect(response.body.data.content).not.toContain('onerror');
          }
        }
      });

      it('should sanitize XSS payloads in comments', async () => {
        for (const payload of SecurityTestUtils.xssPayloads) {
          const response = await request(commentsApp)
            .post(`/api/v1/posts/${testPost._id}/comments`)
            .send({
              content: `Comment with XSS payload: ${payload}`,
              author: {
                name: `XSS Test ${payload}`,
                email: 'xss@example.com'
              }
            });

          if (response.status === 201) {
            expect(response.body.data.content).not.toContain('<script>');
            expect(response.body.data.content).not.toContain('javascript:');
            expect(response.body.data.content).not.toContain('onerror');
            expect(response.body.data.author.name).not.toContain('<script>');
          }
        }
      });

      it('should sanitize XSS payloads in category data', async () => {
        for (const payload of SecurityTestUtils.xssPayloads) {
          const response = await request(postsApp)
            .post('/categories')
            .send({
              name: `Category ${payload}`,
              description: `Description with XSS: ${payload}`,
              color: '#ff0000'
            });

          if (response.status === 201) {
            expect(response.body.data.name).not.toContain('<script>');
            expect(response.body.data.description).not.toContain('<script>');
            expect(response.body.data.name).not.toContain('javascript:');
          }
        }
      });
    });

    describe('SQL/NoSQL Injection Prevention', () => {
      it('should prevent NoSQL injection in query parameters', async () => {
        for (const payload of SecurityTestUtils.nosqlInjectionPayloads) {
          const response = await request(postsApp)
            .get('/posts')
            .query({ category: payload })
            .expect(400);

          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent NoSQL injection in post filters', async () => {
        const maliciousQueries = [
          { status: { $ne: null } },
          { author: { $regex: '.*' } },
          { title: { $where: 'function() { return true; }' } }
        ];

        for (const query of maliciousQueries) {
          const response = await request(postsApp)
            .get('/posts')
            .query(query);

          expect(response.status).not.toBe(200);
        }
      });

      it('should prevent NoSQL injection in comment queries', async () => {
        for (const payload of SecurityTestUtils.nosqlInjectionPayloads) {
          const response = await request(commentsApp)
            .get(`/api/v1/posts/${testPost._id}/comments`)
            .query({ author: payload });

          expect(response.status).not.toBe(200);
        }
      });

      it('should sanitize NoSQL operators in request bodies', async () => {
        const maliciousBody = {
          title: 'Test Post',
          content: { $ne: null },
          author: { $regex: '.*' },
          category: testCategory._id
        };

        const response = await request(postsApp)
          .post('/posts')
          .send(maliciousBody)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Command Injection Prevention', () => {
      it('should prevent command injection in file operations', async () => {
        for (const payload of SecurityTestUtils.commandInjectionPayloads) {
          const response = await request(postsApp)
            .post('/posts')
            .send({
              title: `Command Test ${payload}`,
              content: 'Test content',
              excerpt: 'Test excerpt',
              author: payload,
              category: testCategory._id
            });

          if (response.status === 201) {
            expect(response.body.data.author).not.toContain(';');
            expect(response.body.data.author).not.toContain('|');
            expect(response.body.data.author).not.toContain('`');
            expect(response.body.data.author).not.toContain('$(');
          }
        }
      });
    });

    describe('Path Traversal Prevention', () => {
      it('should prevent path traversal in file paths', async () => {
        for (const payload of SecurityTestUtils.pathTraversalPayloads) {
          const response = await request(postsApp)
            .get(`/posts/${payload}`)
            .expect(400);

          expect(response.body.success).toBe(false);
        }
      });
    });

    describe('Data Length Validation', () => {
      it('should enforce maximum length limits for posts', async () => {
        const oversizedData = {
          title: 'A'.repeat(1000), // Assuming max is less than 1000
          content: 'B'.repeat(100000), // Very large content
          excerpt: 'C'.repeat(1000),
          author: 'Test Author',
          category: testCategory._id
        };

        const response = await request(postsApp)
          .post('/posts')
          .send(oversizedData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should enforce maximum length limits for comments', async () => {
        const oversizedComment = {
          content: 'A'.repeat(10000), // Very large content
          author: {
            name: 'B'.repeat(500), // Very long name
            email: 'test@example.com'
          }
        };

        const response = await request(commentsApp)
          .post(`/api/v1/posts/${testPost._id}/comments`)
          .send(oversizedComment);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    describe('JWT Token Validation', () => {
      it('should reject requests with invalid JWT tokens', async () => {
        const invalidToken = SecurityTestUtils.generateInvalidToken();

        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_JWT_TOKEN');
      });

      it('should reject requests with expired JWT tokens', async () => {
        const expiredToken = SecurityTestUtils.generateExpiredToken({
          userId: new mongoose.Types.ObjectId(),
          email: 'expired@example.com',
          role: 'admin'
        });

        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('JWT_TOKEN_EXPIRED');
      });

      it('should reject requests with tampered JWT tokens', async () => {
        const validToken = SecurityTestUtils.generateToken({
          userId: new mongoose.Types.ObjectId(),
          email: 'user@example.com',
          role: 'user'
        });

        // Tamper with the token
        const tamperedToken = validToken.slice(0, -10) + 'tampered123';

        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject requests without authorization header', async () => {
        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Role-Based Access Control', () => {
      it('should allow admin access to admin endpoints', async () => {
        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should deny user access to admin endpoints', async () => {
        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .set('Authorization', `Bearer ${validUserToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('admin');
      });

      it('should allow users to create comments', async () => {
        const response = await request(commentsApp)
          .post(`/api/v1/posts/${testPost._id}/comments`)
          .set('Authorization', `Bearer ${validUserToken}`)
          .send({
            content: 'User comment with proper authorization',
            author: {
              name: 'Authorized User',
              email: 'authorized@example.com'
            }
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should prevent privilege escalation attempts', async () => {
        // Try to modify user role in token
        const escalationToken = SecurityTestUtils.generateToken({
          userId: new mongoose.Types.ObjectId(),
          email: 'user@example.com',
          role: 'admin' // User trying to claim admin role
        }, 'different-secret'); // But with wrong secret

        const response = await request(commentsApp)
          .get('/api/v1/admin/comments')
          .set('Authorization', `Bearer ${escalationToken}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Session Management', () => {
      it('should handle concurrent sessions properly', async () => {
        const user1Token = SecurityTestUtils.generateToken({
          userId: new mongoose.Types.ObjectId(),
          email: 'user1@example.com',
          role: 'user'
        });

        const user2Token = SecurityTestUtils.generateToken({
          userId: new mongoose.Types.ObjectId(),
          email: 'user2@example.com',
          role: 'user'
        });

        // Both users should be able to access their allowed endpoints
        const response1 = await request(commentsApp)
          .post(`/api/v1/posts/${testPost._id}/comments`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'Comment from user 1',
            author: { name: 'User 1', email: 'user1@example.com' }
          })
          .expect(201);

        const response2 = await request(commentsApp)
          .post(`/api/v1/posts/${testPost._id}/comments`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            content: 'Comment from user 2',
            author: { name: 'User 2', email: 'user2@example.com' }
          })
          .expect(201);

        expect(response1.body.success).toBe(true);
        expect(response2.body.success).toBe(true);
      });
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should enforce rate limits on API endpoints', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 150; i++) { // Exceed typical rate limits
        promises.push(
          request(commentsApp)
            .get(`/api/v1/posts/${testPost._id}/comments`)
        );
      }

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(result => 
        result.value && result.value.status === 429
      );
      
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    it('should handle large payload attacks', async () => {
      const largePayload = {
        title: 'A'.repeat(50 * 1024 * 1024), // 50MB payload
        content: 'B'.repeat(50 * 1024 * 1024),
        author: 'Attacker',
        category: testCategory._id
      };

      const response = await request(postsApp)
        .post('/posts')
        .send(largePayload)
        .expect(413); // Request Entity Too Large

      expect(response.body.success).toBe(false);
    });

    it('should prevent ReDoS attacks with complex regex', async () => {
      // Test with patterns that could cause ReDoS
      const maliciousPatterns = [
        'a'.repeat(50000) + 'X', // Catastrophic backtracking
        '('.repeat(1000) + 'a' + ')'.repeat(1000),
        '^(a+)+$' // Vulnerable regex pattern
      ];

      for (const pattern of maliciousPatterns) {
        const startTime = Date.now();
        
        const response = await request(postsApp)
          .get('/posts')
          .query({ search: pattern })
          .timeout(5000);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Should not take more than 5 seconds to respond
        expect(responseTime).toBeLessThan(5000);
      }
    });
  });

  describe('Data Exposure and Privacy', () => {
    it('should not expose sensitive user data in API responses', async () => {
      const response = await request(commentsApp)
        .get(`/api/v1/posts/${testPost._id}/comments`)
        .expect(200);

      response.body.data.forEach(comment => {
        // Email should not be exposed to public
        expect(comment.author.email).toBeUndefined();
        // Internal IDs should be strings, not ObjectIds
        expect(typeof comment._id).toBe('string');
        // Version keys should not be exposed
        expect(comment.__v).toBeUndefined();
      });
    });

    it('should expose admin data only to authorized admins', async () => {
      const response = await request(commentsApp)
        .get('/api/v1/admin/comments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach(comment => {
        // Admin endpoints should include email for moderation
        expect(comment.author.email).toBeDefined();
        // Should include moderation metadata
        expect(comment.reportCount).toBeDefined();
        expect(comment.isReported).toBeDefined();
      });
    });

    it('should not leak database errors with sensitive information', async () => {
      // Try to trigger a database error
      const response = await request(postsApp)
        .post('/posts')
        .send({
          title: 'Test',
          content: 'Test',
          author: 'Test',
          category: 'invalid-object-id-format'
        })
        .expect(400);

      // Error message should not contain database internals
      expect(response.body.error.message).not.toContain('mongo');
      expect(response.body.error.message).not.toContain('collection');
      expect(response.body.error.message).not.toContain('database');
      expect(response.body.error.message).not.toContain('connection string');
    });

    it('should handle CORS properly', async () => {
      const response = await request(postsApp)
        .options('/posts')
        .set('Origin', 'http://malicious-site.com')
        .expect(200);

      // Should only allow configured origins
      const allowedOrigin = response.get('Access-Control-Allow-Origin');
      expect(allowedOrigin).not.toBe('http://malicious-site.com');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types if file upload is supported', async () => {
      // This test would be relevant if the services support file uploads
      const maliciousFile = Buffer.from('<?php echo "malicious code"; ?>');
      
      // Test would verify that PHP files, executables, etc. are rejected
      // For now, we'll just verify the endpoints don't accept unexpected file uploads
      const response = await request(postsApp)
        .post('/posts')
        .attach('file', maliciousFile, 'malicious.php')
        .field('title', 'Test')
        .field('content', 'Test')
        .field('author', 'Test')
        .field('category', testCategory._id);

      // Should either reject the file or ignore the attachment
      expect(response.status).not.toBe(200);
    });

    it('should prevent path traversal in file operations', async () => {
      for (const payload of SecurityTestUtils.pathTraversalPayloads) {
        const response = await request(postsApp)
          .get(`/static/${payload}`)
          .expect(404);

        // Should not serve files outside allowed directories
        expect(response.status).toBe(404);
      }
    });
  });

  describe('HTTP Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(postsApp)
        .get('/health')
        .expect(200);

      // Check for important security headers
      expect(response.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.get('X-Frame-Options')).toBeDefined();
      expect(response.get('X-XSS-Protection')).toBeDefined();
      expect(response.get('Strict-Transport-Security')).toBeDefined();
      expect(response.get('Content-Security-Policy')).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await request(postsApp)
        .get('/health')
        .expect(200);

      // Should not expose server version or technology stack
      expect(response.get('Server')).toBeUndefined();
      expect(response.get('X-Powered-By')).toBeUndefined();
    });
  });

  describe('Business Logic Security', () => {
    it('should prevent comment spam through validation', async () => {
      // Try to create multiple identical comments rapidly
      const spamComment = {
        content: 'This is spam content repeated multiple times',
        author: {
          name: 'Spammer',
          email: 'spam@example.com'
        }
      };

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(commentsApp)
            .post(`/api/v1/posts/${testPost._id}/comments`)
            .send(spamComment)
        );
      }

      const results = await Promise.allSettled(promises);
      
      // Should prevent or limit rapid identical comments
      const successfulRequests = results.filter(result => 
        result.value && result.value.status === 201
      );
      
      expect(successfulRequests.length).toBeLessThan(10);
    });

    it('should validate business rules for moderation actions', async () => {
      // Try to moderate a comment that doesn't exist
      const nonExistentCommentId = new mongoose.Types.ObjectId();
      
      const response = await request(commentsApp)
        .patch(`/api/v1/admin/comments/${nonExistentCommentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          moderatorNote: 'Approving non-existent comment'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized data modification', async () => {
      // Try to modify someone else's comment
      const anotherUserToken = SecurityTestUtils.generateToken({
        userId: new mongoose.Types.ObjectId(),
        email: 'another@example.com',
        role: 'user'
      });

      const response = await request(commentsApp)
        .put(`/api/v1/comments/${testComment._id}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({
          content: 'Trying to modify someone else comment'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('API Security Misconfiguration', () => {
    it('should not accept HTTP methods that are not implemented', async () => {
      const response = await request(postsApp)
        .patch('/posts')
        .expect(405); // Method Not Allowed

      expect(response.status).toBe(405);
    });

    it('should handle OPTIONS requests properly', async () => {
      const response = await request(postsApp)
        .options('/posts')
        .expect(200);

      expect(response.get('Allow')).toBeDefined();
    });

    it('should return proper error codes for various scenarios', async () => {
      // Test various error scenarios
      await request(postsApp).get('/nonexistent').expect(404);
      await request(postsApp).post('/posts').send({}).expect(400);
      
      // Test with malformed JSON
      await request(postsApp)
        .post('/posts')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});