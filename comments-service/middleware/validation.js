const Joi = require('joi');

// Validation schemas
const schemas = {
  createComment: Joi.object({
    content: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .trim()
      .messages({
        'string.empty': 'Comment content cannot be empty',
        'string.max': 'Comment content cannot exceed 1000 characters',
        'any.required': 'Comment content is required'
      }),
    author: Joi.object({
      name: Joi.string()
        .min(1)
        .max(50)
        .required()
        .trim()
        .pattern(/^[a-zA-Z0-9\s\-_.]+$/)
        .messages({
          'string.empty': 'Author name cannot be empty',
          'string.max': 'Author name cannot exceed 50 characters',
          'string.pattern.base': 'Author name contains invalid characters',
          'any.required': 'Author name is required'
        }),
      email: Joi.string()
        .email()
        .required()
        .lowercase()
        .trim()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        })
    }).required(),
    parentId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid parent comment ID format'
      })
  }),

  updateComment: Joi.object({
    content: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .trim()
      .messages({
        'string.empty': 'Comment content cannot be empty',
        'string.max': 'Comment content cannot exceed 1000 characters',
        'any.required': 'Comment content is required'
      })
  }),

  createReport: Joi.object({
    reason: Joi.string()
      .valid('spam', 'inappropriate', 'harassment', 'hate_speech', 'violence', 'misinformation', 'copyright', 'other')
      .required()
      .messages({
        'any.only': 'Invalid report reason',
        'any.required': 'Report reason is required'
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .trim()
      .messages({
        'string.max': 'Report description cannot exceed 500 characters'
      })
  }),

  moderateComment: Joi.object({
    status: Joi.string()
      .valid('approved', 'rejected', 'flagged')
      .required()
      .messages({
        'any.only': 'Invalid moderation status',
        'any.required': 'Moderation status is required'
      }),
    reason: Joi.string()
      .max(500)
      .optional()
      .trim()
      .messages({
        'string.max': 'Moderation reason cannot exceed 500 characters'
      })
  }),

  reviewReport: Joi.object({
    status: Joi.string()
      .valid('reviewed', 'resolved', 'dismissed')
      .required()
      .messages({
        'any.only': 'Invalid review status',
        'any.required': 'Review status is required'
      }),
    notes: Joi.string()
      .max(500)
      .optional()
      .trim()
      .messages({
        'string.max': 'Review notes cannot exceed 500 characters'
      }),
    actionTaken: Joi.string()
      .valid('none', 'comment_removed', 'comment_flagged', 'user_warned', 'user_banned')
      .optional()
      .messages({
        'any.only': 'Invalid action type'
      })
  }),

  queryParams: {
    pagination: Joi.object({
      page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
          'number.base': 'Page must be a number',
          'number.integer': 'Page must be an integer',
          'number.min': 'Page must be at least 1'
        }),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .messages({
          'number.base': 'Limit must be a number',
          'number.integer': 'Limit must be an integer',
          'number.min': 'Limit must be at least 1',
          'number.max': 'Limit cannot exceed 100'
        })
    }),

    sorting: Joi.object({
      sort: Joi.string()
        .valid('createdAt', 'likes', 'reports')
        .default('createdAt')
        .messages({
          'any.only': 'Invalid sort field'
        }),
      order: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .messages({
          'any.only': 'Order must be asc or desc'
        })
    }),

    commentStatus: Joi.object({
      status: Joi.string()
        .valid('pending', 'approved', 'rejected', 'flagged')
        .default('approved')
        .messages({
          'any.only': 'Invalid comment status'
        })
    })
  }
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                 source === 'params' ? req.params : 
                 req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Combined validation for comments endpoints
const validateCommentQuery = validate(
  schemas.queryParams.pagination
    .concat(schemas.queryParams.sorting)
    .concat(schemas.queryParams.commentStatus),
  'query'
);

// Validation for MongoDB ObjectId parameters
const validateObjectId = (paramName = 'id') => {
  const schema = Joi.object({
    [paramName]: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': `Invalid ${paramName} format`,
        'any.required': `${paramName} is required`
      })
  });

  return validate(schema, 'params');
};

// Validation for post ID parameter
const validatePostId = () => {
  const schema = Joi.object({
    post_id: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(200)
      .pattern(/^[a-zA-Z0-9\-_\.]+$/)
      .messages({
        'string.empty': 'Post ID cannot be empty',
        'string.min': 'Post ID cannot be empty',
        'string.max': 'Post ID too long',
        'string.pattern.base': 'Post ID contains invalid characters',
        'any.required': 'Post ID is required'
      })
  });

  return validate(schema, 'params');
};

// Content sanitization middleware
const sanitizeContent = (req, res, next) => {
  if (req.body.content) {
    // Remove potentially dangerous HTML tags and scripts
    req.body.content = req.body.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (req.body.description) {
    req.body.description = req.body.description
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  next();
};

module.exports = {
  schemas,
  validate,
  validateCommentQuery,
  validateObjectId,
  validatePostId,
  sanitizeContent,
  // Specific validators for common use cases
  validateCreateComment: validate(schemas.createComment),
  validateUpdateComment: validate(schemas.updateComment),
  validateCreateReport: validate(schemas.createReport),
  validateModerateComment: validate(schemas.moderateComment),
  validateReviewReport: validate(schemas.reviewReport)
};