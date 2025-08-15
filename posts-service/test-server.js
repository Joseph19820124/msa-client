// Simple test script to verify server functionality without MongoDB
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = 4002;

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Mock data
const mockPosts = [
  {
    _id: '507f1f77bcf86cd799439011',
    title: 'Welcome to the Posts Service',
    content: 'This is a sample post to test the API functionality.',
    excerpt: 'This is a sample post to test...',
    author: 'System Admin',
    slug: 'welcome-to-posts-service',
    category: {
      _id: '507f1f77bcf86cd799439012',
      name: 'Announcements',
      slug: 'announcements',
      color: '#007bff'
    },
    tags: ['welcome', 'api', 'test'],
    status: 'published',
    featured: true,
    stats: {
      views: 42,
      likes: 5,
      commentsCount: 3
    },
    metadata: {
      wordCount: 150,
      readTime: 1
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date()
  },
  {
    _id: '507f1f77bcf86cd799439013',
    title: 'Getting Started with Node.js',
    content: 'Node.js is a powerful runtime for building server-side applications...',
    excerpt: 'Node.js is a powerful runtime for building...',
    author: 'John Doe',
    slug: 'getting-started-with-nodejs',
    category: {
      _id: '507f1f77bcf86cd799439014',
      name: 'Development',
      slug: 'development',
      color: '#28a745'
    },
    tags: ['nodejs', 'javascript', 'backend'],
    status: 'published',
    featured: false,
    stats: {
      views: 128,
      likes: 12,
      commentsCount: 8
    },
    metadata: {
      wordCount: 750,
      readTime: 4
    },
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000),
    publishedAt: new Date(Date.now() - 86400000)
  }
];

const mockCategories = [
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Announcements',
    slug: 'announcements',
    description: 'Important announcements and updates',
    color: '#007bff',
    isActive: true,
    postCount: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '507f1f77bcf86cd799439014',
    name: 'Development',
    slug: 'development',
    description: 'Development tutorials and guides',
    color: '#28a745',
    isActive: true,
    postCount: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function for standardized responses
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

const sendPaginated = (res, data, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalCount: data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'posts-service',
    version: '1.0.0',
    database: 'mock-data',
    environment: 'test'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Posts Service API - Test Mode',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      posts: '/posts',
      categories: '/categories',
      stats: '/stats',
      health: '/health'
    },
    note: 'This is a test server with mock data'
  });
});

// Posts endpoints
app.get('/posts', (req, res) => {
  // Convert array to object for React client compatibility
  const postsObject = {};
  mockPosts.forEach(post => {
    postsObject[post._id] = { ...post, id: post._id }; // Add id field for compatibility
  });
  
  sendPaginated(res, postsObject, 'Posts retrieved successfully');
});

app.get('/posts/:id', (req, res) => {
  const post = mockPosts.find(p => p._id === req.params.id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: { message: 'Post not found' }
    });
  }
  sendSuccess(res, post, 'Post retrieved successfully');
});

app.post('/posts', (req, res) => {
  const newPost = {
    _id: '507f1f77bcf86cd799439015',
    title: req.body.title || 'New Post',
    content: req.body.content || 'Content goes here...',
    excerpt: req.body.excerpt || 'Excerpt...',
    author: req.body.author || 'Anonymous',
    slug: (req.body.title || 'new-post').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: mockCategories[0],
    tags: req.body.tags || [],
    status: 'published',
    featured: false,
    stats: { views: 0, likes: 0, commentsCount: 0 },
    metadata: { wordCount: 100, readTime: 1 },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date()
  };
  
  sendSuccess(res, newPost, 'Post created successfully', 201);
});

// Categories endpoints
app.get('/categories', (req, res) => {
  sendPaginated(res, mockCategories, 'Categories retrieved successfully');
});

app.get('/categories/active', (req, res) => {
  const activeCategories = mockCategories.filter(c => c.isActive);
  sendPaginated(res, activeCategories, 'Active categories retrieved successfully');
});

// Stats endpoints
app.get('/stats/overview', (req, res) => {
  const stats = {
    overview: {
      posts: {
        totalPosts: mockPosts.length,
        publishedPosts: mockPosts.filter(p => p.status === 'published').length,
        totalViews: mockPosts.reduce((sum, p) => sum + p.stats.views, 0),
        totalLikes: mockPosts.reduce((sum, p) => sum + p.stats.likes, 0)
      },
      categories: {
        total: mockCategories.length,
        active: mockCategories.filter(c => c.isActive).length
      }
    },
    topPosts: {
      mostViewed: mockPosts.sort((a, b) => b.stats.views - a.stats.views).slice(0, 5)
    },
    generatedAt: new Date().toISOString()
  };
  
  sendSuccess(res, stats, 'Overview statistics retrieved successfully');
});

app.post('/stats/posts/:id/view', (req, res) => {
  const post = mockPosts.find(p => p._id === req.params.id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: { message: 'Post not found' }
    });
  }
  
  post.stats.views += 1;
  sendSuccess(res, { views: post.stats.views }, 'Post view recorded successfully');
});

app.post('/stats/posts/:id/like', (req, res) => {
  const post = mockPosts.find(p => p._id === req.params.id);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: { message: 'Post not found' }
    });
  }
  
  post.stats.likes += 1;
  sendSuccess(res, { likes: post.stats.likes }, 'Post liked successfully');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint not found: ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Posts Service Test Server running on port ${PORT}`);
  console.log(`📚 API Base URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Posts: http://localhost:${PORT}/posts`);
  console.log(`🏷️  Categories: http://localhost:${PORT}/categories`);
  console.log(`📊 Stats: http://localhost:${PORT}/stats/overview`);
  console.log(`\n✅ Server ready! Test with: curl http://localhost:${PORT}/health`);
});

module.exports = app;