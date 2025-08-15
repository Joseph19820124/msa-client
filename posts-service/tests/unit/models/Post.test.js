const mongoose = require('mongoose');
const Post = require('../../../models/Post');
const Category = require('../../../models/Category');

describe('Post Model Unit Tests', () => {
  let testCategory;

  beforeEach(async () => {
    testCategory = new Category(testUtils.generateTestCategory());
    await testCategory.save();
  });

  describe('Schema Validation', () => {
    it('should create a valid post with required fields', async () => {
      const postData = {
        ...testUtils.generateTestPost(),
        category: testCategory._id
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.title).toBe(postData.title);
      expect(savedPost.content).toBe(postData.content);
      expect(savedPost.slug).toBe(postData.slug);
      expect(savedPost.createdAt).toBeDefined();
      expect(savedPost.updatedAt).toBeDefined();
    });

    it('should require title field', async () => {
      const postData = {
        ...testUtils.generateTestPost(),
        category: testCategory._id
      };
      delete postData.title;

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/title.*required/i);
    });

    it('should require content field', async () => {
      const postData = {
        ...testUtils.generateTestPost(),
        category: testCategory._id
      };
      delete postData.content;

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/content.*required/i);
    });

    it('should require author field', async () => {
      const postData = {
        ...testUtils.generateTestPost(),
        category: testCategory._id
      };
      delete postData.author;

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/author.*required/i);
    });

    it('should validate title length constraints', async () => {
      const postData = {
        ...testUtils.generateTestPost({
          title: 'Ab' // Too short (minimum 3 characters)
        }),
        category: testCategory._id
      };

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/title.*shorter/i);
    });

    it('should validate title maximum length', async () => {
      const postData = {
        ...testUtils.generateTestPost({
          title: 'A'.repeat(201) // Too long (maximum 200 characters)
        }),
        category: testCategory._id
      };

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/title.*longer/i);
    });

    it('should validate content minimum length', async () => {
      const postData = {
        ...testUtils.generateTestPost({
          content: 'Short' // Too short (minimum 10 characters)
        }),
        category: testCategory._id
      };

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/content.*shorter/i);
    });

    it('should validate status enum values', async () => {
      const postData = {
        ...testUtils.generateTestPost({
          status: 'invalid-status'
        }),
        category: testCategory._id
      };

      const post = new Post(postData);

      await expect(post.save()).rejects.toThrow(/status.*valid/i);
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['draft', 'published', 'archived'];

      for (const status of validStatuses) {
        const postData = {
          ...testUtils.generateTestPost({
            title: `Test Post ${status}`,
            slug: `test-post-${status}`,
            status
          }),
          category: testCategory._id
        };

        const post = new Post(postData);
        const savedPost = await post.save();

        expect(savedPost.status).toBe(status);
      }
    });

    it('should validate category reference', async () => {
      const postData = {
        ...testUtils.generateTestPost(),
        category: new mongoose.Types.ObjectId() // Non-existent category
      };

      const post = new Post(postData);

      // Should save without error (referential integrity is handled at application level)
      const savedPost = await post.save();
      expect(savedPost.category).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const postData = {
        title: 'Minimal Post',
        content: 'Minimal content for testing',
        author: 'Test Author',
        category: testCategory._id
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost.status).toBe('draft'); // Default status
      expect(savedPost.featured).toBe(false); // Default featured
      expect(savedPost.tags).toEqual([]); // Default empty array
      expect(savedPost.stats.views).toBe(0); // Default views
      expect(savedPost.stats.likes).toBe(0); // Default likes
      expect(savedPost.stats.commentsCount).toBe(0); // Default comments
    });

    it('should auto-generate slug from title if not provided', async () => {
      const postData = {
        title: 'Test Post Title With Spaces',
        content: 'Content for slug generation test',
        author: 'Test Author',
        category: testCategory._id
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost.slug).toBe('test-post-title-with-spaces');
    });

    it('should auto-generate excerpt from content if not provided', async () => {
      const longContent = 'This is a very long content that should be truncated to create an excerpt. '.repeat(10);
      
      const postData = {
        title: 'Test Post',
        content: longContent,
        author: 'Test Author',
        category: testCategory._id
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost.excerpt).toBeDefined();
      expect(savedPost.excerpt.length).toBeLessThanOrEqual(160); // Max excerpt length
      expect(savedPost.excerpt).toContain('This is a very long content');
    });

    it('should calculate word count from content', async () => {
      const content = 'This is a test content with exactly ten words here.';
      
      const postData = {
        title: 'Word Count Test',
        content,
        author: 'Test Author',
        category: testCategory._id
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost.metadata.wordCount).toBe(10);
    });

    it('should calculate read time based on word count', async () => {
      const content = 'word '.repeat(250); // 250 words
      
      const postData = {
        title: 'Read Time Test',
        content,
        author: 'Test Author',
        category: testCategory._id
      };

      const post = new Post(postData);
      const savedPost = await post.save();

      expect(savedPost.metadata.readTime).toBe(1); // ~1 minute for 250 words
    });
  });

  describe('Instance Methods', () => {
    let testPost;

    beforeEach(async () => {
      testPost = new Post({
        ...testUtils.generateTestPost(),
        category: testCategory._id
      });
      await testPost.save();
    });

    it('should increment view count', async () => {
      const initialViews = testPost.stats.views;
      
      await testPost.incrementViews();
      
      expect(testPost.stats.views).toBe(initialViews + 1);
      
      // Verify in database
      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.stats.views).toBe(initialViews + 1);
    });

    it('should increment like count', async () => {
      const initialLikes = testPost.stats.likes;
      
      await testPost.incrementLikes();
      
      expect(testPost.stats.likes).toBe(initialLikes + 1);
      
      // Verify in database
      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.stats.likes).toBe(initialLikes + 1);
    });

    it('should update comment count', async () => {
      await testPost.updateCommentCount(5);
      
      expect(testPost.stats.commentsCount).toBe(5);
      
      // Verify in database
      const updatedPost = await Post.findById(testPost._id);
      expect(updatedPost.stats.commentsCount).toBe(5);
    });

    it('should check if post is published', () => {
      testPost.status = 'published';
      expect(testPost.isPublished()).toBe(true);

      testPost.status = 'draft';
      expect(testPost.isPublished()).toBe(false);

      testPost.status = 'archived';
      expect(testPost.isPublished()).toBe(false);
    });

    it('should format post for API response', () => {
      const formatted = testPost.toAPIResponse();

      expect(formatted.id).toBe(testPost._id.toString());
      expect(formatted.title).toBe(testPost.title);
      expect(formatted.content).toBe(testPost.content);
      expect(formatted.createdAt).toBeDefined();
      expect(formatted.updatedAt).toBeDefined();
      expect(formatted.__v).toBeUndefined(); // Should exclude version key
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test posts with different statuses and stats
      const posts = [
        {
          ...testUtils.generateTestPost({
            title: 'Published Post 1',
            slug: 'published-post-1',
            status: 'published',
            stats: { views: 100, likes: 10, commentsCount: 5 }
          }),
          category: testCategory._id
        },
        {
          ...testUtils.generateTestPost({
            title: 'Published Post 2',
            slug: 'published-post-2',
            status: 'published',
            stats: { views: 50, likes: 5, commentsCount: 2 }
          }),
          category: testCategory._id
        },
        {
          ...testUtils.generateTestPost({
            title: 'Draft Post',
            slug: 'draft-post',
            status: 'draft',
            stats: { views: 10, likes: 1, commentsCount: 0 }
          }),
          category: testCategory._id
        }
      ];

      await Post.insertMany(posts);
    });

    it('should find published posts only', async () => {
      const publishedPosts = await Post.findPublished();
      
      expect(publishedPosts).toHaveLength(2);
      expect(publishedPosts.every(post => post.status === 'published')).toBe(true);
    });

    it('should find popular posts by views', async () => {
      const popularPosts = await Post.findPopular(1);
      
      expect(popularPosts).toHaveLength(1);
      expect(popularPosts[0].title).toBe('Published Post 1');
      expect(popularPosts[0].stats.views).toBe(100);
    });

    it('should find posts by category', async () => {
      const categoryPosts = await Post.findByCategory(testCategory._id);
      
      expect(categoryPosts).toHaveLength(3);
      expect(categoryPosts.every(post => post.category.toString() === testCategory._id.toString())).toBe(true);
    });

    it('should search posts by title', async () => {
      const searchResults = await Post.searchByTitle('Published');
      
      expect(searchResults).toHaveLength(2);
      expect(searchResults.every(post => post.title.includes('Published'))).toBe(true);
    });

    it('should get stats summary', async () => {
      const stats = await Post.getStatsSummary();
      
      expect(stats).toBeDefined();
      expect(stats.totalPosts).toBe(3);
      expect(stats.publishedPosts).toBe(2);
      expect(stats.totalViews).toBe(160); // 100 + 50 + 10
      expect(stats.totalLikes).toBe(16); // 10 + 5 + 1
      expect(stats.averageViews).toBeCloseTo(53.33, 1); // 160/3
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes for queries', async () => {
      const indexes = await Post.collection.getIndexes();
      
      // Check for expected indexes
      expect(indexes).toHaveProperty('slug_1');
      expect(indexes).toHaveProperty('status_1');
      expect(indexes).toHaveProperty('category_1');
      expect(indexes).toHaveProperty('createdAt_-1');
    });

    it('should enforce unique slug constraint', async () => {
      const postData1 = {
        ...testUtils.generateTestPost({
          slug: 'unique-slug-test'
        }),
        category: testCategory._id
      };

      const postData2 = {
        ...testUtils.generateTestPost({
          title: 'Different Title',
          slug: 'unique-slug-test' // Same slug
        }),
        category: testCategory._id
      };

      const post1 = new Post(postData1);
      await post1.save();

      const post2 = new Post(postData2);
      await expect(post2.save()).rejects.toThrow(/duplicate.*slug/i);
    });
  });

  describe('Middleware Hooks', () => {
    it('should update timestamps on save', async () => {
      const post = new Post({
        ...testUtils.generateTestPost(),
        category: testCategory._id
      });

      const savedPost = await post.save();
      const originalUpdatedAt = savedPost.updatedAt;

      // Wait a moment and update
      await testUtils.wait(10);
      savedPost.title = 'Updated Title';
      await savedPost.save();

      expect(savedPost.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should auto-generate slug on save if not provided', async () => {
      const post = new Post({
        title: 'Auto Generated Slug Test',
        content: 'Content for auto slug generation',
        author: 'Test Author',
        category: testCategory._id
        // No slug provided
      });

      const savedPost = await post.save();
      expect(savedPost.slug).toBe('auto-generated-slug-test');
    });

    it('should auto-generate excerpt on save if not provided', async () => {
      const longContent = 'This is a long content that should be automatically truncated to create an excerpt. '.repeat(5);
      
      const post = new Post({
        title: 'Auto Excerpt Test',
        content: longContent,
        author: 'Test Author',
        category: testCategory._id
        // No excerpt provided
      });

      const savedPost = await post.save();
      expect(savedPost.excerpt).toBeDefined();
      expect(savedPost.excerpt).toContain('This is a long content');
      expect(savedPost.excerpt.length).toBeLessThanOrEqual(160);
    });
  });

  describe('Virtual Properties', () => {
    let testPost;

    beforeEach(async () => {
      testPost = new Post({
        ...testUtils.generateTestPost(),
        category: testCategory._id
      });
      await testPost.save();
    });

    it('should provide URL virtual property', () => {
      const expectedUrl = `/posts/${testPost.slug}`;
      expect(testPost.url).toBe(expectedUrl);
    });

    it('should provide summary virtual property', () => {
      const summary = testPost.summary;
      
      expect(summary).toBeDefined();
      expect(summary.id).toBe(testPost._id.toString());
      expect(summary.title).toBe(testPost.title);
      expect(summary.excerpt).toBe(testPost.excerpt);
      expect(summary.stats).toBeDefined();
    });
  });
});