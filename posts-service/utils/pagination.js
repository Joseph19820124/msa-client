const config = require('../config/config');

/**
 * Creates pagination metadata and query options
 * @param {Object} params - Pagination parameters
 * @param {number} params.page - Current page number
 * @param {number} params.limit - Number of items per page
 * @param {number} totalCount - Total number of items
 * @returns {Object} Pagination metadata and query options
 */
const createPagination = ({ page = 1, limit = config.pagination.defaultPageSize }, totalCount) => {
  // Ensure valid pagination values
  const currentPage = Math.max(1, parseInt(page));
  const pageSize = Math.min(
    Math.max(1, parseInt(limit)), 
    config.pagination.maxPageSize
  );
  
  const skip = (currentPage - 1) * pageSize;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Calculate pagination info
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  const nextPage = hasNextPage ? currentPage + 1 : null;
  const prevPage = hasPrevPage ? currentPage - 1 : null;
  
  return {
    // Query options for mongoose
    queryOptions: {
      skip,
      limit: pageSize
    },
    
    // Metadata for response
    pagination: {
      currentPage,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage,
      prevPage,
      startIndex: skip + 1,
      endIndex: Math.min(skip + pageSize, totalCount)
    }
  };
};

/**
 * Creates sorting options for mongoose queries
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort direction (asc/desc or 1/-1)
 * @returns {Object} Mongoose sort object
 */
const createSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = ['desc', '-1'].includes(sortOrder.toString()) ? -1 : 1;
  
  // Map common sort fields
  const sortMap = {
    createdAt: { createdAt: order },
    updatedAt: { updatedAt: order },
    publishedAt: { publishedAt: order },
    title: { title: order },
    views: { 'stats.views': order },
    likes: { 'stats.likes': order },
    name: { name: order }, // For categories
    postCount: { postCount: order } // For categories
  };
  
  return sortMap[sortBy] || { createdAt: -1 };
};

/**
 * Creates filter options for mongoose queries
 * @param {Object} filters - Filter parameters
 * @returns {Object} Mongoose filter object
 */
const createFilterOptions = (filters = {}) => {
  const mongoFilter = {};
  
  // Status filter
  if (filters.status) {
    mongoFilter.status = filters.status;
  }
  
  // Category filter
  if (filters.category) {
    mongoFilter.category = filters.category;
  }
  
  // Author filter
  if (filters.author) {
    mongoFilter.author = new RegExp(filters.author, 'i');
  }
  
  // Featured filter
  if (typeof filters.featured === 'boolean') {
    mongoFilter.featured = filters.featured;
  }
  
  // Tags filter
  if (filters.tags) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    mongoFilter.tags = { $in: tags };
  }
  
  // Date range filter
  if (filters.startDate || filters.endDate) {
    mongoFilter.createdAt = {};
    
    if (filters.startDate) {
      mongoFilter.createdAt.$gte = new Date(filters.startDate);
    }
    
    if (filters.endDate) {
      mongoFilter.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  // Search filter
  if (filters.search) {
    mongoFilter.$text = { $search: filters.search };
  }
  
  // Active filter (for categories)
  if (typeof filters.isActive === 'boolean') {
    mongoFilter.isActive = filters.isActive;
  }
  
  return mongoFilter;
};

/**
 * Builds complete query options for paginated requests
 * @param {Object} queryParams - Request query parameters
 * @param {number} totalCount - Total number of matching documents
 * @returns {Object} Complete query configuration
 */
const buildQuery = async (queryParams, Model, baseFilter = {}) => {
  // Create filter options
  const filters = createFilterOptions(queryParams);
  const combinedFilter = { ...baseFilter, ...filters };
  
  // Get total count with filters applied
  const totalCount = await Model.countDocuments(combinedFilter);
  
  // Create pagination and sorting
  const { queryOptions, pagination } = createPagination(queryParams, totalCount);
  const sortOptions = createSortOptions(queryParams.sortBy, queryParams.sortOrder);
  
  return {
    filter: combinedFilter,
    options: {
      ...queryOptions,
      sort: sortOptions
    },
    pagination
  };
};

/**
 * Formats paginated response
 * @param {Array} data - Array of documents
 * @param {Object} pagination - Pagination metadata
 * @param {Object} additionalMeta - Additional metadata
 * @returns {Object} Formatted response
 */
const formatPaginatedResponse = (data, pagination, additionalMeta = {}) => {
  return {
    success: true,
    data,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      ...additionalMeta
    }
  };
};

/**
 * Validates pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Object} Validated parameters or error
 */
const validatePaginationParams = (params) => {
  const { page, limit } = params;
  
  const errors = [];
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    errors.push('Page must be a positive integer');
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > config.pagination.maxPageSize)) {
    errors.push(`Limit must be between 1 and ${config.pagination.maxPageSize}`);
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  return {
    isValid: true,
    params: {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || config.pagination.defaultPageSize
    }
  };
};

module.exports = {
  createPagination,
  createSortOptions,
  createFilterOptions,
  buildQuery,
  formatPaginatedResponse,
  validatePaginationParams
};