const Category = require('../models/Category');
const Post = require('../models/Post');
const { buildQuery } = require('../utils/pagination');
const { 
  sendSuccess, 
  sendCreated, 
  sendNotFound, 
  sendError, 
  sendPaginated,
  asyncHandler 
} = require('../utils/response');

/**
 * Get all categories with filtering and pagination
 * GET /categories
 */
const getCategories = asyncHandler(async (req, res) => {
  // Build query with filters and pagination
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Category,
    {} // No default filters for categories
  );

  // Execute query
  const categories = await Category.find(filter, null, options).lean();

  // Add additional metadata
  const meta = {
    hasFilters: Object.keys(req.query).length > 0,
    filters: {
      isActive: req.query.isActive || null,
      search: req.query.search || null
    }
  };

  return sendPaginated(res, categories, pagination, 'Categories retrieved successfully', meta);
});

/**
 * Get active categories only (public endpoint)
 * GET /categories/active
 */
const getActiveCategories = asyncHandler(async (req, res) => {
  // Build query for active categories only
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Category,
    { isActive: true }
  );

  // Execute query
  const categories = await Category.find(filter, null, options).lean();

  return sendPaginated(res, categories, pagination, 'Active categories retrieved successfully');
});

/**
 * Get a single category by ID
 * GET /categories/:id
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).lean();

  if (!category) {
    return sendNotFound(res, 'Category', req.params.id);
  }

  // Get recent posts in this category
  const recentPosts = await Post.find({ 
    category: req.params.id, 
    status: 'published' 
  })
    .select('title slug publishedAt stats.views stats.likes')
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();

  const categoryWithPosts = {
    ...category,
    recentPosts
  };

  return sendSuccess(res, categoryWithPosts, 'Category retrieved successfully');
});

/**
 * Get a single category by slug
 * GET /categories/slug/:slug
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug }).lean();

  if (!category) {
    return sendNotFound(res, 'Category', req.params.slug);
  }

  // Get recent posts in this category
  const recentPosts = await Post.find({ 
    category: category._id, 
    status: 'published' 
  })
    .select('title slug publishedAt stats.views stats.likes')
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();

  const categoryWithPosts = {
    ...category,
    recentPosts
  };

  return sendSuccess(res, categoryWithPosts, 'Category retrieved successfully');
});

/**
 * Create a new category (Admin only)
 * POST /categories
 */
const createCategory = asyncHandler(async (req, res) => {
  // Check for duplicate name
  const existingCategory = await Category.findOne({ 
    name: new RegExp(`^${req.body.name}$`, 'i') 
  });
  
  if (existingCategory) {
    return sendError(res, 'A category with this name already exists', 409);
  }

  // Check for duplicate slug if provided
  if (req.body.slug) {
    const existingSlug = await Category.findOne({ slug: req.body.slug });
    if (existingSlug) {
      return sendError(res, 'A category with this slug already exists', 409);
    }
  }

  // Create the category
  const category = new Category(req.body);
  await category.save();

  const location = `/categories/${category._id}`;
  return sendCreated(res, category, 'Category created successfully', location);
});

/**
 * Update an existing category (Admin only)
 * PUT /categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return sendNotFound(res, 'Category', req.params.id);
  }

  // Check for duplicate name if being updated
  if (req.body.name && req.body.name !== category.name) {
    const existingCategory = await Category.findOne({ 
      name: new RegExp(`^${req.body.name}$`, 'i'),
      _id: { $ne: req.params.id }
    });
    if (existingCategory) {
      return sendError(res, 'A category with this name already exists', 409);
    }
  }

  // Check for duplicate slug if being updated
  if (req.body.slug && req.body.slug !== category.slug) {
    const existingSlug = await Category.findOne({ 
      slug: req.body.slug,
      _id: { $ne: req.params.id }
    });
    if (existingSlug) {
      return sendError(res, 'A category with this slug already exists', 409);
    }
  }

  // Update the category
  Object.assign(category, req.body);
  await category.save();

  return sendSuccess(res, category, 'Category updated successfully');
});

/**
 * Delete a category (Admin only)
 * DELETE /categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return sendNotFound(res, 'Category', req.params.id);
  }

  // Check if category has posts
  const postCount = await Post.countDocuments({ category: req.params.id });
  
  if (postCount > 0) {
    return sendError(res, 
      `Cannot delete category. It has ${postCount} associated posts. Please reassign or delete the posts first.`, 
      409
    );
  }

  // Delete the category
  await Category.findByIdAndDelete(req.params.id);

  return sendSuccess(res, null, 'Category deleted successfully');
});

/**
 * Get category statistics
 * GET /categories/:id/stats
 */
const getCategoryStats = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return sendNotFound(res, 'Category', req.params.id);
  }

  // Aggregate statistics
  const [postStats] = await Post.aggregate([
    { $match: { category: category._id } },
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
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        avgViews: { $avg: '$stats.views' },
        avgLikes: { $avg: '$stats.likes' }
      }
    }
  ]);

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentActivity = await Post.countDocuments({
    category: req.params.id,
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get top posts by views
  const topPostsByViews = await Post.find({ 
    category: req.params.id, 
    status: 'published' 
  })
    .select('title slug stats.views stats.likes')
    .sort({ 'stats.views': -1 })
    .limit(5)
    .lean();

  const stats = {
    category: {
      id: category._id,
      name: category.name,
      slug: category.slug
    },
    posts: postStats || {
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      avgViews: 0,
      avgLikes: 0
    },
    recentActivity: {
      postsLast30Days: recentActivity
    },
    topPosts: topPostsByViews,
    lastUpdated: new Date().toISOString()
  };

  return sendSuccess(res, stats, 'Category statistics retrieved successfully');
});

/**
 * Toggle category active status (Admin only)
 * PATCH /categories/:id/toggle-status
 */
const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return sendNotFound(res, 'Category', req.params.id);
  }

  // Toggle the active status
  category.isActive = !category.isActive;
  await category.save();

  const message = `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`;
  
  return sendSuccess(res, category, message);
});

/**
 * Get categories with post counts
 * GET /categories/with-counts
 */
const getCategoriesWithCounts = asyncHandler(async (req, res) => {
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Category,
    { isActive: true }
  );

  // Get categories with aggregated post counts
  const categories = await Category.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'category',
        as: 'posts'
      }
    },
    {
      $addFields: {
        postCount: { $size: '$posts' },
        publishedPostCount: {
          $size: {
            $filter: {
              input: '$posts',
              cond: { $eq: ['$$this.status', 'published'] }
            }
          }
        }
      }
    },
    {
      $project: {
        posts: 0 // Remove the posts array from output
      }
    },
    { $sort: options.sort || { name: 1 } },
    { $skip: options.skip || 0 },
    { $limit: options.limit || 10 }
  ]);

  return sendPaginated(res, categories, pagination, 'Categories with counts retrieved successfully');
});

module.exports = {
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
};