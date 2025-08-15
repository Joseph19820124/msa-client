const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCategories,
  getActiveCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  toggleCategoryStatus,
  getCategoriesWithCounts
} = require('../controllers/categoriesController');

// Import middleware
const { validate, validateObjectId } = require('../middleware/validation');
const { rateLimit, strictRateLimit, veryStrictRateLimit } = require('../middleware/security');

// Validation schemas
const { schemas } = require('../middleware/validation');

// Public routes (read operations)
router.get('/', 
  rateLimit,
  validate(schemas.category.query, 'query'),
  getCategories
);

router.get('/active', 
  rateLimit,
  validate(schemas.category.query, 'query'),
  getActiveCategories
);

router.get('/with-counts', 
  rateLimit,
  validate(schemas.category.query, 'query'),
  getCategoriesWithCounts
);

router.get('/slug/:slug', 
  rateLimit,
  validate(schemas.params.slug, 'params'),
  getCategoryBySlug
);

router.get('/:id', 
  rateLimit,
  validateObjectId,
  getCategoryById
);

router.get('/:id/stats', 
  rateLimit,
  validateObjectId,
  getCategoryStats
);

// Admin routes (write operations)
// Note: In a real application, these would require authentication middleware
// For now, they use strict rate limiting as a basic protection measure

router.post('/', 
  veryStrictRateLimit, // Very strict for admin operations
  validate(schemas.category.create),
  createCategory
);

router.put('/:id', 
  veryStrictRateLimit,
  validateObjectId,
  validate(schemas.category.update),
  updateCategory
);

router.patch('/:id/toggle-status', 
  veryStrictRateLimit,
  validateObjectId,
  toggleCategoryStatus
);

router.delete('/:id', 
  veryStrictRateLimit,
  validateObjectId,
  deleteCategory
);

module.exports = router;