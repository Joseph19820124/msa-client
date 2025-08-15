/**
 * Standardized API response utilities
 */

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata
 */
const sendSuccess = (res, data = null, message = 'Request successful', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: {
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Created response helper
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 * @param {string} location - Resource location header
 */
const sendCreated = (res, data, message = 'Resource created successfully', location = null) => {
  if (location) {
    res.set('Location', location);
  }

  return sendSuccess(res, data, message, 201);
};

/**
 * No content response helper
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 */
const sendNoContent = (res, message = 'Request completed successfully') => {
  return res.status(204).json({
    success: true,
    message,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Not found response helper
 * @param {Object} res - Express response object
 * @param {string} resource - Resource type that was not found
 * @param {string} identifier - Resource identifier
 */
const sendNotFound = (res, resource = 'Resource', identifier = null) => {
  const message = identifier 
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`;
    
  return sendError(res, message, 404);
};

/**
 * Validation error response helper
 * @param {Object} res - Express response object
 * @param {Array|Object} validationErrors - Validation error details
 */
const sendValidationError = (res, validationErrors) => {
  return sendError(res, 'Validation failed', 400, validationErrors);
};

/**
 * Unauthorized response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendUnauthorized = (res, message = 'Authentication required') => {
  return sendError(res, message, 401);
};

/**
 * Forbidden response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendForbidden = (res, message = 'Access denied') => {
  return sendError(res, message, 403);
};

/**
 * Conflict response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendConflict = (res, message = 'Resource conflict') => {
  return sendError(res, message, 409);
};

/**
 * Too many requests response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendTooManyRequests = (res, message = 'Too many requests') => {
  return sendError(res, message, 429);
};

/**
 * Internal server error response helper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} error - Original error object (for logging)
 */
const sendInternalError = (res, message = 'Internal server error', error = null) => {
  // Log the actual error for debugging
  if (error) {
    console.error('Internal Server Error:', error);
  }

  return sendError(res, message, 500);
};

/**
 * Paginated response helper
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 */
const sendPaginated = (res, data, pagination, message = 'Request successful', meta = {}) => {
  const response = {
    success: true,
    message,
    data,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      totalResults: pagination.totalCount,
      ...meta
    }
  };

  return res.status(200).json(response);
};

/**
 * Stats response helper
 * @param {Object} res - Express response object
 * @param {Object} stats - Statistics data
 * @param {string} message - Success message
 */
const sendStats = (res, stats, message = 'Statistics retrieved successfully') => {
  return sendSuccess(res, stats, message, 200, {
    type: 'statistics',
    generatedAt: new Date().toISOString()
  });
};

/**
 * Health check response helper
 * @param {Object} res - Express response object
 * @param {Object} healthData - Health check data
 */
const sendHealthCheck = (res, healthData = {}) => {
  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'posts-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    ...healthData
  };

  return res.status(200).json(response);
};

/**
 * Cache response helper - adds cache headers
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} maxAge - Cache max age in seconds
 * @param {string} message - Success message
 */
const sendCached = (res, data, maxAge = 300, message = 'Request successful') => {
  res.set({
    'Cache-Control': `public, max-age=${maxAge}`,
    'Expires': new Date(Date.now() + maxAge * 1000).toUTCString()
  });

  return sendSuccess(res, data, message);
};

/**
 * Async handler wrapper to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendTooManyRequests,
  sendInternalError,
  sendPaginated,
  sendStats,
  sendHealthCheck,
  sendCached,
  asyncHandler
};