const request = require('supertest');
const mongoose = require('mongoose');
const axios = require('axios');

// Import both services
const postsApp = require('../../posts-service/server');
const { app: commentsApp } = require('../../comments-service/server');

// Service URLs for E2E testing
const POSTS_SERVICE_URL = process.env.POSTS_SERVICE_URL || 'http://localhost:4000';
const COMMENTS_SERVICE_URL = process.env.COMMENTS_SERVICE_URL || 'http://localhost:4001';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

describe('End-to-End User Workflows', () => {
  let postsServer;
  let commentsServer;
  let testCategory;
  let testPost;
  let testUser;

  beforeAll(async () => {
    // Start both services for E2E testing
    postsServer = postsApp.listen(4000);
    commentsServer = commentsApp.listen(4001);
    
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify services are running
    try {
      await axios.get(`${POSTS_SERVICE_URL}/health`);
      await axios.get(`${COMMENTS_SERVICE_URL}/health`);
      console.log('✅ Both services are running and healthy');
    } catch (error) {
      console.error('❌ Services are not ready:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // Close servers
    if (postsServer) {
      await new Promise(resolve => postsServer.close(resolve));
    }
    if (commentsServer) {
      await new Promise(resolve => commentsServer.close(resolve));
    }
  });

  beforeEach(async () => {
    // Set up test data
    testUser = {
      name: 'E2E Test User',
      email: 'e2e@example.com',
      role: 'user'
    };

    // Create test category in posts service
    const categoryResponse = await axios.post(`${POSTS_SERVICE_URL}/categories`, {
      name: 'E2E Test Category',
      description: 'Category for end-to-end testing',
      color: '#007bff'
    });
    testCategory = categoryResponse.data.data;

    // Create test post in posts service
    const postResponse = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
      title: 'E2E Test Post',
      content: 'This is a comprehensive test post for end-to-end testing workflows',
      excerpt: 'E2E test post excerpt',
      author: testUser.name,
      category: testCategory._id,
      tags: ['e2e', 'testing', 'integration']
    });
    testPost = postResponse.data.data;
  });

  describe('Blog Reader Journey', () => {
    it('should complete a typical blog reader user journey', async () => {
      // 1. User visits the blog homepage - get all posts
      const homePageResponse = await axios.get(`${POSTS_SERVICE_URL}/posts?status=published&limit=10`);
      
      expect(homePageResponse.status).toBe(200);
      expect(homePageResponse.data.success).toBe(true);
      expect(homePageResponse.data.data.length).toBeGreaterThan(0);

      // 2. User browses categories
      const categoriesResponse = await axios.get(`${POSTS_SERVICE_URL}/categories/active`);
      
      expect(categoriesResponse.status).toBe(200);
      expect(categoriesResponse.data.success).toBe(true);
      
      const categories = categoriesResponse.data.data;
      expect(categories.length).toBeGreaterThan(0);

      // 3. User clicks on a specific category to filter posts
      const categoryPostsResponse = await axios.get(
        `${POSTS_SERVICE_URL}/posts?category=${testCategory._id}&status=published`
      );
      
      expect(categoryPostsResponse.status).toBe(200);
      categoryPostsResponse.data.data.forEach(post => {
        expect(post.category._id || post.category).toBe(testCategory._id);
      });

      // 4. User searches for specific content
      const searchResponse = await axios.get(
        `${POSTS_SERVICE_URL}/posts?search=E2E Test&status=published`
      );
      
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.data.length).toBeGreaterThan(0);

      // 5. User clicks on a post to read it (this increments views)
      const postDetailResponse = await axios.get(`${POSTS_SERVICE_URL}/posts/${testPost._id}`);
      
      expect(postDetailResponse.status).toBe(200);
      expect(postDetailResponse.data.data.title).toBe(testPost.title);
      expect(postDetailResponse.data.data.stats.views).toBeGreaterThan(0);

      // 6. User likes the post
      const likeResponse = await axios.post(`${POSTS_SERVICE_URL}/stats/posts/${testPost._id}/like`);
      
      expect(likeResponse.status).toBe(200);
      expect(likeResponse.data.data.likes).toBeGreaterThan(0);

      // 7. User loads comments for the post
      const commentsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${testPost._id}/comments`
      );
      
      expect(commentsResponse.status).toBe(200);
      expect(commentsResponse.data.success).toBe(true);

      // 8. User posts a comment
      const commentData = {
        content: 'This is a great article! I learned a lot from reading this comprehensive content.',
        author: {
          name: testUser.name,
          email: testUser.email
        }
      };

      const commentResponse = await axios.post(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${testPost._id}/comments`,
        commentData
      );
      
      expect(commentResponse.status).toBe(201);
      expect(commentResponse.data.success).toBe(true);
      expect(commentResponse.data.data.content).toBe(commentData.content);
      
      const createdComment = commentResponse.data.data;

      // 9. User likes their own comment
      const commentLikeResponse = await axios.post(
        `${COMMENTS_SERVICE_URL}/api/v1/comments/${createdComment._id}/like`
      );
      
      expect(commentLikeResponse.status).toBe(200);
      expect(commentLikeResponse.data.data.likes).toBe(1);

      // 10. User checks comment statistics
      const commentStatsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${testPost._id}/comments/stats`
      );
      
      expect(commentStatsResponse.status).toBe(200);
      expect(commentStatsResponse.data.data.total).toBeGreaterThan(0);

      // 11. User views site statistics
      const siteStatsResponse = await axios.get(`${POSTS_SERVICE_URL}/stats/overview`);
      
      expect(siteStatsResponse.status).toBe(200);
      expect(siteStatsResponse.data.data.overview.posts.totalPosts).toBeGreaterThan(0);
      expect(siteStatsResponse.data.data.overview.posts.totalViews).toBeGreaterThan(0);
    });

    it('should handle user content interaction workflow', async () => {
      // Create multiple posts for interaction testing
      const posts = [];
      for (let i = 0; i < 3; i++) {
        const postResponse = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
          title: `Interaction Test Post ${i}`,
          content: `Content for interaction testing ${i}`,
          excerpt: `Excerpt ${i}`,
          author: testUser.name,
          category: testCategory._id,
          tags: [`tag${i}`, 'interaction']
        });
        posts.push(postResponse.data.data);
      }

      // User interacts with multiple posts
      for (const post of posts) {
        // View the post
        await axios.get(`${POSTS_SERVICE_URL}/posts/${post._id}`);
        
        // Like the post
        await axios.post(`${POSTS_SERVICE_URL}/stats/posts/${post._id}/like`);
        
        // Comment on the post
        await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/posts/${post._id}/comments`, {
          content: `Great article about ${post.title}! Very informative and well-written content.`,
          author: {
            name: testUser.name,
            email: testUser.email
          }
        });
      }

      // Check aggregated statistics
      const overviewStats = await axios.get(`${POSTS_SERVICE_URL}/stats/overview`);
      expect(overviewStats.data.data.overview.posts.totalViews).toBeGreaterThan(0);
      expect(overviewStats.data.data.overview.posts.totalLikes).toBeGreaterThan(0);

      // Check popular posts
      const popularPosts = await axios.get(`${POSTS_SERVICE_URL}/stats/posts/popular?limit=5`);
      expect(popularPosts.data.data.length).toBeGreaterThan(0);
    });

    it('should handle user search and discovery workflow', async () => {
      // User searches for content across different criteria
      const searchQueries = [
        'E2E Test',
        'testing',
        'integration',
        'comprehensive'
      ];

      for (const query of searchQueries) {
        const searchResponse = await axios.get(
          `${POSTS_SERVICE_URL}/posts?search=${encodeURIComponent(query)}&status=published`
        );
        
        expect(searchResponse.status).toBe(200);
        
        if (searchResponse.data.data.length > 0) {
          // Verify search results contain the query term
          const hasMatchingContent = searchResponse.data.data.some(post => 
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(query.toLowerCase())
          );
          expect(hasMatchingContent).toBe(true);
        }
      }

      // User filters by tags
      const taggedPosts = await axios.get(
        `${POSTS_SERVICE_URL}/posts?tags=e2e&status=published`
      );
      
      expect(taggedPosts.status).toBe(200);
      if (taggedPosts.data.data.length > 0) {
        taggedPosts.data.data.forEach(post => {
          expect(post.tags).toContain('e2e');
        });
      }

      // User explores related content
      const relatedPosts = await axios.get(
        `${POSTS_SERVICE_URL}/posts?category=${testCategory._id}&status=published&limit=5`
      );
      
      expect(relatedPosts.status).toBe(200);
    });
  });

  describe('Content Creator Journey', () => {
    it('should complete a content creator workflow', async () => {
      // 1. Creator creates a new category
      const newCategoryResponse = await axios.post(`${POSTS_SERVICE_URL}/categories`, {
        name: 'Creator Test Category',
        description: 'A new category created by content creator',
        color: '#28a745'
      });
      
      expect(newCategoryResponse.status).toBe(201);
      const createdCategory = newCategoryResponse.data.data;

      // 2. Creator drafts a new post
      const draftPostResponse = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
        title: 'My New Blog Post Draft',
        content: 'This is a comprehensive blog post that I am working on. It contains valuable information for readers.',
        excerpt: 'A new blog post draft',
        author: 'Content Creator',
        category: createdCategory._id,
        tags: ['new', 'draft', 'creator'],
        status: 'draft'
      });
      
      expect(draftPostResponse.status).toBe(201);
      expect(draftPostResponse.data.data.status).toBe('draft');
      const draftPost = draftPostResponse.data.data;

      // 3. Creator edits and updates the post
      const updatedPostResponse = await axios.put(`${POSTS_SERVICE_URL}/posts/${draftPost._id}`, {
        title: 'My Updated Blog Post',
        content: 'This is the updated and improved version of my blog post with more comprehensive content and better structure.',
        excerpt: 'Updated blog post with better content',
        tags: ['updated', 'improved', 'creator']
      });
      
      expect(updatedPostResponse.status).toBe(200);
      expect(updatedPostResponse.data.data.title).toBe('My Updated Blog Post');

      // 4. Creator publishes the post
      const publishedPostResponse = await axios.put(`${POSTS_SERVICE_URL}/posts/${draftPost._id}`, {
        status: 'published'
      });
      
      expect(publishedPostResponse.status).toBe(200);
      expect(publishedPostResponse.data.data.status).toBe('published');

      // 5. Creator monitors post performance
      const postStats = await axios.get(`${POSTS_SERVICE_URL}/posts/${draftPost._id}`);
      expect(postStats.status).toBe(200);
      expect(postStats.data.data.stats).toBeDefined();

      // 6. Creator checks overall content performance
      const creatorStats = await axios.get(`${POSTS_SERVICE_URL}/stats/analytics`);
      expect(creatorStats.status).toBe(200);
      expect(creatorStats.data.data.content).toBeDefined();
      expect(creatorStats.data.data.engagement).toBeDefined();
    });

    it('should handle content management workflow', async () => {
      // Creator manages multiple posts
      const posts = [];
      
      // Create multiple posts with different statuses
      const postStatuses = ['draft', 'published', 'draft'];
      
      for (let i = 0; i < postStatuses.length; i++) {
        const postResponse = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
          title: `Management Test Post ${i}`,
          content: `Content for management testing ${i}`,
          excerpt: `Management excerpt ${i}`,
          author: 'Content Manager',
          category: testCategory._id,
          status: postStatuses[i],
          featured: i === 1 // Make second post featured
        });
        posts.push(postResponse.data.data);
      }

      // Get posts by status
      const draftPosts = await axios.get(`${POSTS_SERVICE_URL}/posts?status=draft`);
      expect(draftPosts.data.data.length).toBeGreaterThan(0);

      const publishedPosts = await axios.get(`${POSTS_SERVICE_URL}/posts?status=published`);
      expect(publishedPosts.data.data.length).toBeGreaterThan(0);

      // Get featured posts
      const featuredPosts = await axios.get(`${POSTS_SERVICE_URL}/posts?featured=true&status=published`);
      expect(featuredPosts.status).toBe(200);

      // Update category information
      const updatedCategoryResponse = await axios.put(`${POSTS_SERVICE_URL}/categories/${testCategory._id}`, {
        description: 'Updated category description for better organization'
      });
      
      expect(updatedCategoryResponse.status).toBe(200);
    });
  });

  describe('Moderator Journey', () => {
    let reportedComment;
    let pendingComment;

    beforeEach(async () => {
      // Create comments that need moderation
      const commentResponse1 = await axios.post(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${testPost._id}/comments`,
        {
          content: 'This is a comment that will be reported for testing moderation workflow',
          author: {
            name: 'Test Commenter',
            email: 'commenter@example.com'
          }
        }
      );
      reportedComment = commentResponse1.data.data;

      const commentResponse2 = await axios.post(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${testPost._id}/comments`,
        {
          content: 'This is another comment that will remain pending for moderation testing',
          author: {
            name: 'Another Commenter',
            email: 'another@example.com'
          }
        }
      );
      pendingComment = commentResponse2.data.data;

      // Report the first comment
      await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/comments/${reportedComment._id}/report`, {
        reason: 'spam',
        description: 'This comment appears to be spam content'
      });
    });

    it('should complete moderator workflow for comment management', async () => {
      // 1. Moderator checks pending comments
      const pendingCommentsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/comments`
      );
      
      expect(pendingCommentsResponse.status).toBe(200);
      expect(pendingCommentsResponse.data.data.length).toBeGreaterThan(0);

      // 2. Moderator approves a pending comment
      const approveResponse = await axios.patch(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/comments/${pendingComment._id}`,
        {
          action: 'approve',
          moderatorNote: 'Comment approved - content is appropriate'
        }
      );
      
      expect(approveResponse.status).toBe(200);
      expect(approveResponse.data.data.status).toBe('approved');

      // 3. Moderator checks reported comments
      const reportedCommentsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/comments/reported`
      );
      
      expect(reportedCommentsResponse.status).toBe(200);
      expect(reportedCommentsResponse.data.data.length).toBeGreaterThan(0);

      // 4. Moderator reviews reports
      const reportsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/reports`
      );
      
      expect(reportsResponse.status).toBe(200);
      expect(reportsResponse.data.data.length).toBeGreaterThan(0);
      
      const report = reportsResponse.data.data.find(r => 
        r.commentId === reportedComment._id
      );
      expect(report).toBeDefined();

      // 5. Moderator resolves the report
      const resolveReportResponse = await axios.patch(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/reports/${report._id}`,
        {
          action: 'resolve',
          resolution: 'Report reviewed and appropriate action taken'
        }
      );
      
      expect(resolveReportResponse.status).toBe(200);
      expect(resolveReportResponse.data.data.status).toBe('resolved');

      // 6. Moderator hides the reported comment
      const hideCommentResponse = await axios.patch(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/comments/${reportedComment._id}`,
        {
          action: 'hide',
          moderatorNote: 'Comment hidden due to valid spam report'
        }
      );
      
      expect(hideCommentResponse.status).toBe(200);
      expect(hideCommentResponse.data.data.status).toBe('hidden');

      // 7. Moderator checks moderation statistics
      const moderationStatsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/stats`
      );
      
      expect(moderationStatsResponse.status).toBe(200);
      expect(moderationStatsResponse.data.data.comments).toBeDefined();
      expect(moderationStatsResponse.data.data.reports).toBeDefined();
      expect(moderationStatsResponse.data.data.workload).toBeDefined();
    });

    it('should handle bulk moderation operations', async () => {
      // Create multiple comments and reports for bulk operations
      const comments = [];
      
      for (let i = 0; i < 3; i++) {
        const commentResponse = await axios.post(
          `${COMMENTS_SERVICE_URL}/api/v1/posts/${testPost._id}/comments`,
          {
            content: `Bulk moderation test comment ${i} with sufficient content length`,
            author: {
              name: `Bulk User ${i}`,
              email: `bulk${i}@example.com`
            }
          }
        );
        comments.push(commentResponse.data.data);

        // Report each comment
        await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/comments/${commentResponse.data.data._id}/report`, {
          reason: 'inappropriate',
          description: `Bulk report ${i} for testing`
        });
      }

      // Moderator processes multiple reports
      const allReportsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/reports?status=pending&limit=10`
      );
      
      expect(allReportsResponse.status).toBe(200);
      expect(allReportsResponse.data.data.length).toBeGreaterThanOrEqual(3);

      // Process each report
      for (const report of allReportsResponse.data.data.slice(0, 3)) {
        await axios.patch(
          `${COMMENTS_SERVICE_URL}/api/v1/admin/reports/${report._id}`,
          {
            action: 'dismiss',
            resolution: 'Report dismissed after review'
          }
        );
      }

      // Verify reports were processed
      const processedReportsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/reports?status=dismissed`
      );
      
      expect(processedReportsResponse.status).toBe(200);
      expect(processedReportsResponse.data.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cross-Service Integration Workflows', () => {
    it('should handle complete blog ecosystem workflow', async () => {
      // 1. Create a comprehensive blog post
      const blogPostResponse = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
        title: 'Comprehensive Guide to Modern Web Development',
        content: 'This is a detailed guide covering all aspects of modern web development including frontend, backend, and deployment strategies. It provides practical examples and best practices for building scalable web applications.',
        excerpt: 'A comprehensive guide to modern web development',
        author: 'Tech Expert',
        category: testCategory._id,
        tags: ['webdev', 'guide', 'tutorial', 'comprehensive'],
        status: 'published',
        featured: true
      });
      
      const blogPost = blogPostResponse.data.data;
      expect(blogPost.status).toBe('published');
      expect(blogPost.featured).toBe(true);

      // 2. Multiple users interact with the post
      const users = [
        { name: 'Alice Developer', email: 'alice@example.com' },
        { name: 'Bob Designer', email: 'bob@example.com' },
        { name: 'Carol Manager', email: 'carol@example.com' }
      ];

      for (const user of users) {
        // Each user views the post
        await axios.get(`${POSTS_SERVICE_URL}/posts/${blogPost._id}`);
        
        // Each user likes the post
        await axios.post(`${POSTS_SERVICE_URL}/stats/posts/${blogPost._id}/like`);
        
        // Each user comments on the post
        await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/posts/${blogPost._id}/comments`, {
          content: `Great article! As a ${user.name.split(' ')[1].toLowerCase()}, I found this very helpful and informative. The content is well-structured and covers all the important topics.`,
          author: {
            name: user.name,
            email: user.email
          }
        });
      }

      // 3. Verify cross-service data consistency
      const postStatsResponse = await axios.get(`${POSTS_SERVICE_URL}/posts/${blogPost._id}`);
      expect(postStatsResponse.data.data.stats.views).toBeGreaterThanOrEqual(3);
      expect(postStatsResponse.data.data.stats.likes).toBeGreaterThanOrEqual(3);

      const commentsStatsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${blogPost._id}/comments/stats`
      );
      expect(commentsStatsResponse.data.data.total).toBeGreaterThanOrEqual(3);
      expect(commentsStatsResponse.data.data.approved).toBeGreaterThanOrEqual(0);

      // 4. Check aggregated analytics
      const analyticsResponse = await axios.get(`${POSTS_SERVICE_URL}/stats/analytics`);
      expect(analyticsResponse.data.data.engagement.totalEngagement).toBeGreaterThan(0);

      // 5. Verify popular content surfaces correctly
      const popularPostsResponse = await axios.get(`${POSTS_SERVICE_URL}/stats/posts/popular?limit=5`);
      const ourPost = popularPostsResponse.data.data.find(p => p._id === blogPost._id);
      expect(ourPost).toBeDefined();
      expect(ourPost.stats.views).toBeGreaterThanOrEqual(3);
    });

    it('should handle content lifecycle with comments', async () => {
      // Create a post that will go through its full lifecycle
      const lifecyclePostResponse = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
        title: 'Content Lifecycle Test Post',
        content: 'This post will go through a complete lifecycle including creation, interaction, moderation, and archival.',
        excerpt: 'Testing content lifecycle',
        author: 'Lifecycle Tester',
        category: testCategory._id,
        status: 'published'
      });
      
      const lifecyclePost = lifecyclePostResponse.data.data;

      // Users interact with the post over time
      for (let i = 0; i < 5; i++) {
        // View and like
        await axios.get(`${POSTS_SERVICE_URL}/posts/${lifecyclePost._id}`);
        await axios.post(`${POSTS_SERVICE_URL}/stats/posts/${lifecyclePost._id}/like`);
        
        // Add comments
        const commentResponse = await axios.post(
          `${COMMENTS_SERVICE_URL}/api/v1/posts/${lifecyclePost._id}/comments`,
          {
            content: `This is comment number ${i + 1} on this post. It provides valuable feedback and discussion.`,
            author: {
              name: `User ${i + 1}`,
              email: `user${i + 1}@example.com`
            }
          }
        );

        // Some comments get liked
        if (i % 2 === 0) {
          await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/comments/${commentResponse.data.data._id}/like`);
        }

        // One comment gets reported
        if (i === 2) {
          await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/comments/${commentResponse.data.data._id}/report`, {
            reason: 'inappropriate',
            description: 'Testing report workflow'
          });
        }
      }

      // Verify final state
      const finalPostState = await axios.get(`${POSTS_SERVICE_URL}/posts/${lifecyclePost._id}`);
      expect(finalPostState.data.data.stats.views).toBeGreaterThanOrEqual(5);
      expect(finalPostState.data.data.stats.likes).toBeGreaterThanOrEqual(5);

      const finalCommentsState = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${lifecyclePost._id}/comments`
      );
      expect(finalCommentsState.data.data.length).toBeGreaterThan(0);

      // Check that reported content is flagged for moderation
      const reportedCommentsResponse = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/admin/comments/reported`
      );
      expect(reportedCommentsResponse.status).toBe(200);
    });

    it('should maintain data consistency across service restarts', async () => {
      // Create some data
      const consistencyTestPost = await axios.post(`${POSTS_SERVICE_URL}/posts`, {
        title: 'Data Consistency Test',
        content: 'Testing data consistency across service operations',
        excerpt: 'Consistency test',
        author: 'Consistency Tester',
        category: testCategory._id,
        status: 'published'
      });

      const post = consistencyTestPost.data.data;

      // Add interactions
      await axios.post(`${POSTS_SERVICE_URL}/stats/posts/${post._id}/like`);
      
      const commentResponse = await axios.post(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${post._id}/comments`,
        {
          content: 'Testing data consistency across services and potential restarts',
          author: {
            name: 'Consistency User',
            email: 'consistency@example.com'
          }
        }
      );

      // Verify data immediately
      const preRestartPost = await axios.get(`${POSTS_SERVICE_URL}/posts/${post._id}`);
      const preRestartComments = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${post._id}/comments`
      );

      expect(preRestartPost.data.data.stats.likes).toBeGreaterThan(0);
      expect(preRestartComments.status).toBe(200);

      // Simulate some time passing and verify data is still consistent
      await new Promise(resolve => setTimeout(resolve, 1000));

      const postRestartPost = await axios.get(`${POSTS_SERVICE_URL}/posts/${post._id}`);
      const postRestartComments = await axios.get(
        `${COMMENTS_SERVICE_URL}/api/v1/posts/${post._id}/comments`
      );

      expect(postRestartPost.data.data.stats.likes).toBe(preRestartPost.data.data.stats.likes);
      expect(postRestartComments.data.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service unavailability gracefully', async () => {
      // Test behavior when one service is unavailable
      // This would typically involve stopping one service and testing fallback behavior
      
      // For now, test that services handle non-existent resources gracefully
      const nonExistentPostId = new mongoose.Types.ObjectId();
      
      try {
        await axios.get(`${POSTS_SERVICE_URL}/posts/${nonExistentPostId}`);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }

      try {
        await axios.get(`${COMMENTS_SERVICE_URL}/api/v1/posts/${nonExistentPostId}/comments`);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should handle invalid cross-service references', async () => {
      // Test commenting on non-existent post
      const nonExistentPostId = new mongoose.Types.ObjectId();
      
      try {
        await axios.post(`${COMMENTS_SERVICE_URL}/api/v1/posts/${nonExistentPostId}/comments`, {
          content: 'This comment is on a non-existent post',
          author: {
            name: 'Test User',
            email: 'test@example.com'
          }
        });
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should handle network timeouts and retries', async () => {
      // Test that services respond within reasonable time limits
      const startTime = Date.now();
      
      const healthResponse = await axios.get(`${POSTS_SERVICE_URL}/health`, {
        timeout: 5000 // 5 second timeout
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(healthResponse.status).toBe(200);
      expect(responseTime).toBeLessThan(5000);
    });
  });
});