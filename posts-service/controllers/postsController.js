const Post = require('../models/Post');
const Category = require('../models/Category');
const { buildQuery, formatPaginatedResponse } = require('../utils/pagination');
const { 
  sendSuccess, 
  sendCreated, 
  sendNotFound, 
  sendError, 
  sendPaginated,
  asyncHandler 
} = require('../utils/response');

/**
 * Get all posts with filtering, searching, and pagination
 * GET /posts
 */
const getPosts = asyncHandler(async (req, res) => {
  // Build query with filters and pagination
  const { filter, options, pagination } = await buildQuery(
    req.query, 
    Post, 
    { status: 'published' } // Default filter for published posts only
  );

  // Execute query with population
  const posts = await Post.find(filter, null, options)
    .populate('category', 'name slug color')
    .select('-content') // Exclude full content in list view
    .lean();

  // Convert array to object for React client compatibility
  const postsObject = {};
  posts.forEach(post => {
    postsObject[post._id] = { ...post, id: post._id.toString() }; // Add id field for compatibility
  });

  // Add additional metadata
  const meta = {
    hasFilters: Object.keys(req.query).length > 0,
    filters: {
      status: req.query.status || 'published',
      category: req.query.category || null,
      search: req.query.search || null,
      featured: req.query.featured || null
    }
  };

  return sendPaginated(res, postsObject, pagination, 'Posts retrieved successfully', meta);
});

/**
 * Get a single post by ID
 * GET /posts/:id
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('category', 'name slug color description')
    .lean();

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // Increment view count (in background, don't wait)
  Post.findByIdAndUpdate(req.params.id, { $inc: { 'stats.views': 1 } }).exec();

  return sendSuccess(res, post, 'Post retrieved successfully');
});

/**
 * Get a single post by slug
 * GET /posts/slug/:slug
 */
const getPostBySlug = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
    .populate('category', 'name slug color description')
    .lean();

  if (!post) {
    return sendNotFound(res, 'Post', req.params.slug);
  }

  // Increment view count (in background, don't wait)
  Post.findOneAndUpdate(
    { slug: req.params.slug }, 
    { $inc: { 'stats.views': 1 } }
  ).exec();

  return sendSuccess(res, post, 'Post retrieved successfully');
});

/**
 * Create a new post
 * POST /posts
 */
const createPost = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.body.category);
  if (!category) {
    return sendNotFound(res, 'Category', req.body.category);
  }

  // Check for duplicate slug if provided
  if (req.body.slug) {
    const existingPost = await Post.findOne({ slug: req.body.slug });
    if (existingPost) {
      return sendError(res, 'A post with this slug already exists', 409);
    }
  }

  // Create the post
  const post = new Post(req.body);
  await post.save();

  // Update category post count
  await category.updatePostCount();

  // Populate category info for response
  await post.populate('category', 'name slug color');

  const location = `/posts/${post._id}`;
  return sendCreated(res, post, 'Post created successfully', location);
});

/**
 * Update an existing post
 * PUT /posts/:id
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // If category is being updated, verify it exists
  if (req.body.category && req.body.category !== post.category.toString()) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return sendNotFound(res, 'Category', req.body.category);
    }
  }

  // Check for duplicate slug if being updated
  if (req.body.slug && req.body.slug !== post.slug) {
    const existingPost = await Post.findOne({ 
      slug: req.body.slug, 
      _id: { $ne: req.params.id } 
    });
    if (existingPost) {
      return sendError(res, 'A post with this slug already exists', 409);
    }
  }

  // Store old category for post count update
  const oldCategoryId = post.category;

  // Update the post
  Object.assign(post, req.body);
  await post.save();

  // Update category post counts if category changed
  if (req.body.category && req.body.category !== oldCategoryId.toString()) {
    const [oldCategory, newCategory] = await Promise.all([
      Category.findById(oldCategoryId),
      Category.findById(req.body.category)
    ]);
    
    await Promise.all([
      oldCategory?.updatePostCount(),
      newCategory?.updatePostCount()
    ]);
  }

  // Populate category info for response
  await post.populate('category', 'name slug color');

  return sendSuccess(res, post, 'Post updated successfully');
});

/**
 * Delete a post
 * DELETE /posts/:id
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return sendNotFound(res, 'Post', req.params.id);
  }

  // Store category ID for post count update
  const categoryId = post.category;

  // Delete the post
  await Post.findByIdAndDelete(req.params.id);

  // Update category post count
  const category = await Category.findById(categoryId);
  if (category) {
    await category.updatePostCount();
  }

  return sendSuccess(res, null, 'Post deleted successfully');
});

/**
 * Get posts by category
 * GET /posts/category/:categoryId
 */
const getPostsByCategory = asyncHandler(async (req, res) => {
  // Verify category exists
  const category = await Category.findById(req.params.categoryId);
  if (!category) {
    return sendNotFound(res, 'Category', req.params.categoryId);
  }

  // Build query with category filter
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Post,
    { category: req.params.categoryId, status: 'published' }
  );

  // Execute query
  const posts = await Post.find(filter, null, options)
    .populate('category', 'name slug color')
    .select('-content')
    .lean();

  const meta = {
    category: {
      id: category._id,
      name: category.name,
      slug: category.slug
    }
  };

  return sendPaginated(res, posts, pagination, 'Posts retrieved successfully', meta);
});

/**
 * Get featured posts
 * GET /posts/featured
 */
const getFeaturedPosts = asyncHandler(async (req, res) => {
  // Build query with featured filter
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Post,
    { featured: true, status: 'published' }
  );

  // Execute query
  const posts = await Post.find(filter, null, options)
    .populate('category', 'name slug color')
    .select('-content')
    .lean();

  return sendPaginated(res, posts, pagination, 'Featured posts retrieved successfully');
});

/**
 * Search posts
 * GET /posts/search
 */
const searchPosts = asyncHandler(async (req, res) => {
  const { q: searchQuery } = req.query;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return sendError(res, 'Search query must be at least 2 characters long', 400);
  }

  // Build search query
  const { filter, options, pagination } = await buildQuery(
    { ...req.query, search: searchQuery },
    Post,
    { status: 'published' }
  );

  // Execute search with text score for relevance
  const posts = await Post.find(filter, { score: { $meta: 'textScore' } }, {
    ...options,
    sort: { score: { $meta: 'textScore' }, ...options.sort }
  })
    .populate('category', 'name slug color')
    .select('-content')
    .lean();

  const meta = {
    searchQuery,
    searchType: 'full-text'
  };

  return sendPaginated(res, posts, pagination, 'Search results retrieved successfully', meta);
});

/**
 * Get posts by author
 * GET /posts/author/:author
 */
const getPostsByAuthor = asyncHandler(async (req, res) => {
  const { author } = req.params;

  // Build query with author filter
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Post,
    { author: new RegExp(author, 'i'), status: 'published' }
  );

  // Execute query
  const posts = await Post.find(filter, null, options)
    .populate('category', 'name slug color')
    .select('-content')
    .lean();

  const meta = {
    author,
    searchType: 'by-author'
  };

  return sendPaginated(res, posts, pagination, 'Posts by author retrieved successfully', meta);
});

/**
 * Get posts by tags
 * GET /posts/tags/:tag
 */
const getPostsByTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;

  // Build query with tag filter
  const { filter, options, pagination } = await buildQuery(
    req.query,
    Post,
    { tags: { $in: [tag.toLowerCase()] }, status: 'published' }
  );

  // Execute query
  const posts = await Post.find(filter, null, options)
    .populate('category', 'name slug color')
    .select('-content')
    .lean();

  const meta = {
    tag,
    searchType: 'by-tag'
  };

  return sendPaginated(res, posts, pagination, 'Posts by tag retrieved successfully', meta);
});

module.exports = {
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
};