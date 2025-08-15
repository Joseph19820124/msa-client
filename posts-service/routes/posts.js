const express = require('express');
const router = express.Router();

// Import controllers
const {
  getPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getPostsByCategory,
  getFeaturedPosts,
  searchPosts,
  getPostsByAuthor,
  getPostsByTag
} = require('../controllers/postsController');

// Import middleware
const { validate, validateObjectId, validateDateRange } = require('../middleware/validation');
const { rateLimit, strictRateLimit, validateContentLength } = require('../middleware/security');

// Validation schemas
const { schemas } = require('../middleware/validation');

// Public routes (read operations)
router.get('/', 
  rateLimit,
  validate(schemas.post.query, 'query'),
  validateDateRange,
  getPosts
);

router.get('/featured', 
  rateLimit,
  validate(schemas.post.query, 'query'),
  getFeaturedPosts
);

router.get('/search', 
  rateLimit,
  validate(schemas.post.query, 'query'),
  searchPosts
);

router.get('/category/:categoryId', 
  rateLimit,
  validateObjectId,
  validate(schemas.post.query, 'query'),
  getPostsByCategory
);

router.get('/author/:author', 
  rateLimit,
  validate(schemas.post.query, 'query'),
  getPostsByAuthor
);

router.get('/tags/:tag', 
  rateLimit,
  validate(schemas.post.query, 'query'),
  getPostsByTag
);

router.get('/slug/:slug', 
  rateLimit,
  validate(schemas.params.slug, 'params'),
  getPostBySlug
);

router.get('/:id', 
  rateLimit,
  validateObjectId,
  getPostById
);

// Write operations (require stricter rate limiting)
router.post('/', 
  strictRateLimit,
  validateContentLength(50000),
  validate(schemas.post.create),
  createPost
);

router.put('/:id', 
  strictRateLimit,
  validateObjectId,
  validateContentLength(50000),
  validate(schemas.post.update),
  updatePost
);

router.delete('/:id', 
  strictRateLimit,
  validateObjectId,
  deletePost
);

module.exports = router;