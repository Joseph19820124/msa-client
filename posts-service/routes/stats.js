const express = require('express');
const router = express.Router();

// Import controllers
const {
  getPostStats,
  incrementPostViews,
  likePost,
  unlikePost,
  getOverviewStats,
  getTrendingPosts,
  getPerformanceStats
} = require('../controllers/statsController');

// Import middleware
const { validateObjectId } = require('../middleware/validation');
const { rateLimit, strictRateLimit } = require('../middleware/security');

// General statistics routes
router.get('/overview', 
  rateLimit,
  getOverviewStats
);

router.get('/trending', 
  rateLimit,
  getTrendingPosts
);

router.get('/performance', 
  rateLimit,
  getPerformanceStats
);

// Post-specific statistics and actions
router.get('/posts/:id', 
  rateLimit,
  validateObjectId,
  getPostStats
);

// Post interaction routes (require stricter rate limiting)
router.post('/posts/:id/view', 
  strictRateLimit,
  validateObjectId,
  incrementPostViews
);

router.post('/posts/:id/like', 
  strictRateLimit,
  validateObjectId,
  likePost
);

router.delete('/posts/:id/like', 
  strictRateLimit,
  validateObjectId,
  unlikePost
);

module.exports = router;