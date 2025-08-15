const mongoose = require('mongoose');

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate email address
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate IP address (IPv4 and IPv6)
 */
const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Validate URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate comment content
 */
const validateCommentContent = (content, options = {}) => {
  const {
    minLength = 1,
    maxLength = 1000,
    allowEmpty = false
  } = options;

  const errors = [];

  if (!content && !allowEmpty) {
    errors.push('Content is required');
    return { isValid: false, errors };
  }

  if (content && typeof content !== 'string') {
    errors.push('Content must be a string');
    return { isValid: false, errors };
  }

  if (content) {
    const trimmed = content.trim();
    
    if (trimmed.length < minLength) {
      errors.push(`Content must be at least ${minLength} character${minLength === 1 ? '' : 's'} long`);
    }
    
    if (trimmed.length > maxLength) {
      errors.push(`Content cannot exceed ${maxLength} characters`);
    }

    // Check for potentially dangerous content
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
      errors.push('Script tags are not allowed');
    }

    if (/javascript:/gi.test(content)) {
      errors.push('JavaScript URLs are not allowed');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: content?.trim() || ''
  };
};

/**
 * Validate author information
 */
const validateAuthor = (author) => {
  const errors = [];

  if (!author || typeof author !== 'object') {
    errors.push('Author information is required');
    return { isValid: false, errors };
  }

  // Validate name
  if (!author.name || typeof author.name !== 'string') {
    errors.push('Author name is required');
  } else {
    const name = author.name.trim();
    if (name.length < 1) {
      errors.push('Author name cannot be empty');
    } else if (name.length > 50) {
      errors.push('Author name cannot exceed 50 characters');
    } else if (!/^[a-zA-Z0-9\s\-_.]+$/.test(name)) {
      errors.push('Author name contains invalid characters');
    }
  }

  // Validate email
  if (!author.email || typeof author.email !== 'string') {
    errors.push('Author email is required');
  } else if (!isValidEmail(author.email)) {
    errors.push('Invalid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      name: author.name?.trim() || '',
      email: author.email?.toLowerCase().trim() || ''
    }
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (page, limit) => {
  const errors = [];
  let validPage = 1;
  let validLimit = 20;

  // Validate page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    } else {
      validPage = pageNum;
    }
  }

  // Validate limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      errors.push('Limit must be a positive integer');
    } else if (limitNum > 100) {
      errors.push('Limit cannot exceed 100');
    } else {
      validLimit = limitNum;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: { page: validPage, limit: validLimit }
  };
};

/**
 * Validate sort parameters
 */
const validateSort = (sort, order, allowedFields = ['createdAt', 'likes', 'reports']) => {
  const errors = [];
  let validSort = 'createdAt';
  let validOrder = 'desc';

  // Validate sort field
  if (sort !== undefined) {
    if (!allowedFields.includes(sort)) {
      errors.push(`Sort field must be one of: ${allowedFields.join(', ')}`);
    } else {
      validSort = sort;
    }
  }

  // Validate sort order
  if (order !== undefined) {
    if (!['asc', 'desc'].includes(order)) {
      errors.push('Sort order must be "asc" or "desc"');
    } else {
      validOrder = order;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: { sort: validSort, order: validOrder }
  };
};

/**
 * Validate report data
 */
const validateReport = (reportData) => {
  const errors = [];
  const validReasons = [
    'spam', 'inappropriate', 'harassment', 'hate_speech', 
    'violence', 'misinformation', 'copyright', 'other'
  ];

  if (!reportData || typeof reportData !== 'object') {
    errors.push('Report data is required');
    return { isValid: false, errors };
  }

  // Validate reason
  if (!reportData.reason) {
    errors.push('Report reason is required');
  } else if (!validReasons.includes(reportData.reason)) {
    errors.push(`Report reason must be one of: ${validReasons.join(', ')}`);
  }

  // Validate description (optional)
  if (reportData.description) {
    if (typeof reportData.description !== 'string') {
      errors.push('Report description must be a string');
    } else if (reportData.description.trim().length > 500) {
      errors.push('Report description cannot exceed 500 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      reason: reportData.reason,
      description: reportData.description?.trim() || ''
    }
  };
};

/**
 * Validate moderation action
 */
const validateModerationAction = (actionData) => {
  const errors = [];
  const validStatuses = ['approved', 'rejected', 'flagged'];

  if (!actionData || typeof actionData !== 'object') {
    errors.push('Moderation action data is required');
    return { isValid: false, errors };
  }

  // Validate status
  if (!actionData.status) {
    errors.push('Moderation status is required');
  } else if (!validStatuses.includes(actionData.status)) {
    errors.push(`Moderation status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate reason (optional)
  if (actionData.reason) {
    if (typeof actionData.reason !== 'string') {
      errors.push('Moderation reason must be a string');
    } else if (actionData.reason.trim().length > 500) {
      errors.push('Moderation reason cannot exceed 500 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      status: actionData.status,
      reason: actionData.reason?.trim() || ''
    }
  };
};

/**
 * Validate date range
 */
const validateDateRange = (dateFrom, dateTo) => {
  const errors = [];
  let validFrom, validTo;

  if (dateFrom) {
    validFrom = new Date(dateFrom);
    if (isNaN(validFrom.getTime())) {
      errors.push('Invalid dateFrom format');
    }
  }

  if (dateTo) {
    validTo = new Date(dateTo);
    if (isNaN(validTo.getTime())) {
      errors.push('Invalid dateTo format');
    }
  }

  if (validFrom && validTo && validFrom > validTo) {
    errors.push('dateFrom must be before dateTo');
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: { dateFrom: validFrom, dateTo: validTo }
  };
};

/**
 * Sanitize user input to prevent injection attacks
 */
const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\0/g, ''); // Remove null bytes
};

/**
 * Validate bulk operation data
 */
const validateBulkOperation = (data, maxItems = 50) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Bulk operation data is required');
    return { isValid: false, errors };
  }

  if (!Array.isArray(data.ids)) {
    errors.push('IDs array is required');
  } else {
    if (data.ids.length === 0) {
      errors.push('At least one ID is required');
    } else if (data.ids.length > maxItems) {
      errors.push(`Cannot process more than ${maxItems} items at once`);
    } else {
      // Validate each ID
      const invalidIds = data.ids.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        errors.push(`Invalid ID format: ${invalidIds.join(', ')}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      ids: data.ids || [],
      ...Object.fromEntries(
        Object.entries(data)
          .filter(([key]) => key !== 'ids')
          .map(([key, value]) => [key, sanitizeUserInput(value)])
      )
    }
  };
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isValidIP,
  isValidUrl,
  validateCommentContent,
  validateAuthor,
  validatePagination,
  validateSort,
  validateReport,
  validateModerationAction,
  validateDateRange,
  sanitizeUserInput,
  validateBulkOperation
};