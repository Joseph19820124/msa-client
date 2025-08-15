const Post = require('../models/Post');
const Category = require('../models/Category');
const { 
  sendSuccess, 
  sendNotFound, 
  sendError,
  sendStats,
  asyncHandler 
} = require('../utils/response');

/**
 * Get post statistics
 * GET /posts/:id/stats
 */
const getPostStats = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .select('title slug stats metadata createdAt publishedAt')
    .populate('category', 'name slug')
    .lean();

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // Get additional analytics data
  const stats = {
    post: {
      id: post._id,
      title: post.title,
      slug: post.slug,
      category: post.category
    },
    engagement: {
      views: post.stats.views,
      likes: post.stats.likes,
      commentsCount: post.stats.commentsCount,
      engagementRate: post.stats.views > 0 
        ? ((post.stats.likes + post.stats.commentsCount) / post.stats.views * 100).toFixed(2)
        : 0
    },
    content: {
      wordCount: post.metadata.wordCount,
      readTime: post.metadata.readTime,
      readTimeFormatted: post.metadata.readTime <= 1 ? '1 min read' : `${post.metadata.readTime} min read`
    },
    dates: {
      created: post.createdAt,
      published: post.publishedAt,
      daysSincePublished: post.publishedAt 
        ? Math.floor((new Date() - new Date(post.publishedAt)) / (1000 * 60 * 60 * 24))
        : null
    },
    performance: {
      viewsPerDay: post.publishedAt 
        ? (post.stats.views / Math.max(1, Math.floor((new Date() - new Date(post.publishedAt)) / (1000 * 60 * 60 * 24)))).toFixed(2)
        : 0,
      likesPerView: post.stats.views > 0 
        ? (post.stats.likes / post.stats.views * 100).toFixed(2)
        : 0
    }
  };

  return sendStats(res, stats);
});

/**
 * Increment post views
 * POST /posts/:id/view
 */
const incrementPostViews = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // Increment view count
  post.stats.views += 1;
  await post.save();

  return sendSuccess(res, { 
    views: post.stats.views,
    message: 'View count updated'
  }, 'Post view recorded successfully');
});

/**
 * Like a post
 * POST /posts/:id/like
 */
const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // For now, just increment likes
  // In a real app, you'd check if user already liked and implement unlike
  post.stats.likes += 1;
  await post.save();

  return sendSuccess(res, { 
    likes: post.stats.likes,
    message: 'Post liked'
  }, 'Post liked successfully');
});

/**
 * Unlike a post
 * DELETE /posts/:id/like
 */
const unlikePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // Prevent negative likes
  if (post.stats.likes > 0) {
    post.stats.likes -= 1;
    await post.save();
  }

  return sendSuccess(res, { 
    likes: post.stats.likes,
    message: 'Post unliked'
  }, 'Post unliked successfully');
});

/**
 * Get overall blog statistics
 * GET /stats/overview
 */
const getOverviewStats = asyncHandler(async (req, res) => {
  // Get date ranges
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Aggregate post statistics
  const [postStats] = await Post.aggregate([
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        publishedPosts: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
        },
        draftPosts: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        featuredPosts: {
          $sum: { $cond: ['$featured', 1, 0] }
        },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        totalComments: { $sum: '$stats.commentsCount' },
        avgViews: { $avg: '$stats.views' },
        avgLikes: { $avg: '$stats.likes' },
        avgWordCount: { $avg: '$metadata.wordCount' },
        avgReadTime: { $avg: '$metadata.readTime' }
      }
    }
  ]);

  // Get recent activity
  const [recentActivity] = await Post.aggregate([
    {
      $facet: {
        last7Days: [
          { $match: { createdAt: { $gte: last7Days } } },
          { $count: 'count' }
        ],
        last30Days: [
          { $match: { createdAt: { $gte: last30Days } } },
          { $count: 'count' }
        ],
        publishedLast7Days: [
          { 
            $match: { 
              publishedAt: { $gte: last7Days },
              status: 'published'
            } 
          },
          { $count: 'count' }
        ],
        publishedLast30Days: [
          { 
            $match: { 
              publishedAt: { $gte: last30Days },
              status: 'published'
            } 
          },
          { $count: 'count' }
        ]
      }
    }
  ]);

  // Get category statistics
  const categoryStats = await Category.aggregate([
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'category',
        as: 'posts'
      }
    },
    {
      $project: {
        name: 1,
        postCount: { $size: '$posts' },
        publishedCount: {
          $size: {
            $filter: {
              input: '$posts',
              cond: { $eq: ['$$this.status', 'published'] }
            }
          }
        },
        totalViews: { $sum: '$posts.stats.views' },
        totalLikes: { $sum: '$posts.stats.likes' }
      }
    },
    { $sort: { postCount: -1 } },
    { $limit: 10 }
  ]);

  // Get top performing posts
  const topPosts = await Post.find({ status: 'published' })
    .select('title slug stats.views stats.likes category')
    .populate('category', 'name slug')
    .sort({ 'stats.views': -1 })
    .limit(10)
    .lean();

  // Get most liked posts
  const mostLikedPosts = await Post.find({ status: 'published' })
    .select('title slug stats.views stats.likes category')
    .populate('category', 'name slug')
    .sort({ 'stats.likes': -1 })
    .limit(5)
    .lean();

  // Get recent posts
  const recentPosts = await Post.find({ status: 'published' })
    .select('title slug publishedAt stats.views stats.likes category')
    .populate('category', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(10)
    .lean();

  const stats = {
    overview: {
      posts: postStats || {
        totalPosts: 0,
        publishedPosts: 0,
        draftPosts: 0,
        featuredPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        avgViews: 0,
        avgLikes: 0,
        avgWordCount: 0,
        avgReadTime: 0
      },
      categories: {
        total: await Category.countDocuments(),
        active: await Category.countDocuments({ isActive: true })
      }
    },
    recentActivity: {
      postsCreatedLast7Days: recentActivity.last7Days[0]?.count || 0,
      postsCreatedLast30Days: recentActivity.last30Days[0]?.count || 0,
      postsPublishedLast7Days: recentActivity.publishedLast7Days[0]?.count || 0,
      postsPublishedLast30Days: recentActivity.publishedLast30Days[0]?.count || 0
    },
    topCategories: categoryStats,
    topPosts: {
      mostViewed: topPosts,
      mostLiked: mostLikedPosts,
      recent: recentPosts
    },
    generatedAt: new Date().toISOString()
  };

  return sendStats(res, stats, 'Overview statistics retrieved successfully');
});

/**
 * Get trending posts (most viewed in last 7 days)
 * GET /stats/trending
 */
const getTrendingPosts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50);

  // For now, we'll use overall views as trending metric
  // In a real app, you'd track views by date and calculate trending based on recent activity
  const trendingPosts = await Post.find({ status: 'published' })
    .select('title slug stats.views stats.likes publishedAt category author')
    .populate('category', 'name slug color')
    .sort({ 'stats.views': -1, publishedAt: -1 })
    .limit(limitNum)
    .lean();

  // Add trending score calculation
  const postsWithScore = trendingPosts.map(post => {
    const daysSincePublished = post.publishedAt 
      ? Math.max(1, Math.floor((new Date() - new Date(post.publishedAt)) / (1000 * 60 * 60 * 24)))
      : 1;
    
    // Simple trending score: views per day since published
    const trendingScore = (post.stats.views / daysSincePublished).toFixed(2);
    
    return {
      ...post,
      trendingScore: parseFloat(trendingScore),
      daysSincePublished
    };
  });

  // Sort by trending score
  postsWithScore.sort((a, b) => b.trendingScore - a.trendingScore);

  return sendStats(res, {
    trending: postsWithScore,
    criteria: 'Views per day since published',
    generatedAt: new Date().toISOString()
  }, 'Trending posts retrieved successfully');
});

/**
 * Get posts performance analytics
 * GET /stats/performance
 */
const getPerformanceStats = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  const days = Math.min(parseInt(period), 365);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get performance metrics for posts published in the period
  const performanceStats = await Post.aggregate([
    {
      $match: {
        publishedAt: { $gte: startDate },
        status: 'published'
      }
    },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        avgViewsPerPost: { $avg: '$stats.views' },
        avgLikesPerPost: { $avg: '$stats.likes' },
        avgWordCount: { $avg: '$metadata.wordCount' },
        avgReadTime: { $avg: '$metadata.readTime' },
        maxViews: { $max: '$stats.views' },
        minViews: { $min: '$stats.views' }
      }
    }
  ]);

  // Get performance by category
  const categoryPerformance = await Post.aggregate([
    {
      $match: {
        publishedAt: { $gte: startDate },
        status: 'published'
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    {
      $unwind: '$categoryInfo'
    },
    {
      $group: {
        _id: '$category',
        categoryName: { $first: '$categoryInfo.name' },
        postCount: { $sum: 1 },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        avgViews: { $avg: '$stats.views' },
        avgLikes: { $avg: '$stats.likes' }
      }
    },
    { $sort: { totalViews: -1 } }
  ]);

  const stats = {
    period: `${days} days`,
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
    overall: performanceStats[0] || {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      avgViewsPerPost: 0,
      avgLikesPerPost: 0,
      avgWordCount: 0,
      avgReadTime: 0,
      maxViews: 0,
      minViews: 0
    },
    byCategory: categoryPerformance,
    generatedAt: new Date().toISOString()
  };

  return sendStats(res, stats, 'Performance statistics retrieved successfully');
});

module.exports = {
  getPostStats,
  incrementPostViews,
  likePost,
  unlikePost,
  getOverviewStats,
  getTrendingPosts,
  getPerformanceStats
};