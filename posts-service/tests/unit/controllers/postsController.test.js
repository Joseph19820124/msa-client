const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Post = require('../../../models/Post');
const Category = require('../../../models/Category');
const postsController = require('../../../controllers/postsController');

// Create test app
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/posts', postsController.getAllPosts);
app.get('/posts/:id', postsController.getPostById);
app.post('/posts', postsController.createPost);
app.put('/posts/:id', postsController.updatePost);
app.delete('/posts/:id', postsController.deletePost);
app.get('/posts/slug/:slug', postsController.getPostBySlug);

describe('Posts Controller Unit Tests', () => {
  let testCategory;
  let testPost;

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

  describe('GET /posts - getAllPosts', () => {
    it('should return all posts with pagination', async () => {
      const response = await request(app)
        .get('/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalCount).toBe(1);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/posts?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.pageSize).toBe(5);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get(`/posts?category=${testCategory._id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/posts?status=published')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should search by title', async () => {
      const response = await request(app)
        .get('/posts?search=Test')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should sort posts', async () => {
      // Create another post
      const secondPost = new Post({
        ...testUtils.generateTestPost({
          title: 'Another Test Post',
          createdAt: new Date(Date.now() + 1000)
        }),
        category: testCategory._id
      });
      await secondPost.save();

      const response = await request(app)
        .get('/posts?sort=createdAt&order=desc')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Another Test Post');
    });

    it('should handle database errors', async () => {
      // Mock Post.find to throw an error
      jest.spyOn(Post, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/posts')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /posts/:id - getPostById', () => {
    it('should return a specific post', async () => {
      const response = await request(app)
        .get(`/posts/${testPost._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPost._id.toString());
      expect(response.body.data.title).toBe(testPost.title);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/posts/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/posts/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should increment view count', async () => {
      const initialViews = testPost.stats.views;

      await request(app)
        .get(`/posts/${testPost._id}`)
        .expect(200);

      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.stats.views).toBe(initialViews + 1);
    });
  });

  describe('POST /posts - createPost', () => {
    const validPostData = {
      title: 'New Test Post',
      content: 'This is a new test post content',
      excerpt: 'New test excerpt',
      author: 'Test Author',
      tags: ['new', 'test']
    };

    it('should create a new post', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          ...validPostData,
          category: testCategory._id
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(validPostData.title);
      expect(response.body.data.slug).toBe('new-test-post');
    });

    it('should auto-generate slug from title', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          ...validPostData,
          title: 'Test Post With Special Characters!@#',
          category: testCategory._id
        })
        .expect(201);

      expect(response.body.data.slug).toBe('test-post-with-special-characters');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          content: 'Content without title'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });

    it('should validate minimum title length', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          ...validPostData,
          title: 'Ab', // Too short
          category: testCategory._id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate maximum title length', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          ...validPostData,
          title: 'A'.repeat(201), // Too long
          category: testCategory._id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should ensure slug uniqueness', async () => {
      // Create first post
      await request(app)
        .post('/posts')
        .send({
          ...validPostData,
          category: testCategory._id
        })
        .expect(201);

      // Try to create post with same title (should generate unique slug)
      const response = await request(app)
        .post('/posts')
        .send({
          ...validPostData,
          category: testCategory._id
        })
        .expect(201);

      expect(response.body.data.slug).toBe('new-test-post-1');
    });
  });

  describe('PUT /posts/:id - updatePost', () => {
    it('should update an existing post', async () => {
      const updateData = {
        title: 'Updated Test Post',
        content: 'Updated content'
      };

      const response = await request(app)
        .put(`/posts/${testPost._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/posts/${nonExistentId}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/posts/${testPost._id}`)
        .send({ title: 'A' }) // Too short
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should update slug when title changes', async () => {
      const response = await request(app)
        .put(`/posts/${testPost._id}`)
        .send({ title: 'Completely New Title' })
        .expect(200);

      expect(response.body.data.slug).toBe('completely-new-title');
    });
  });

  describe('DELETE /posts/:id - deletePost', () => {
    it('should delete an existing post', async () => {
      const response = await request(app)
        .delete(`/posts/${testPost._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify post is deleted
      const deletedPost = await Post.findById(testPost._id);
      expect(deletedPost).toBeNull();
    });

    it('should return 404 for non-existent post', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/posts/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /posts/slug/:slug - getPostBySlug', () => {
    it('should return post by slug', async () => {
      const response = await request(app)
        .get(`/posts/slug/${testPost.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe(testPost.slug);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/posts/slug/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should increment view count', async () => {
      const initialViews = testPost.stats.views;

      await request(app)
        .get(`/posts/slug/${testPost.slug}`)
        .expect(200);

      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.stats.views).toBe(initialViews + 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock mongoose connection error
      jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const response = await request(app)
        .get('/posts')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/posts')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});