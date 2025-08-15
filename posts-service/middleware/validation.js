const Joi = require('joi');

// Common validation patterns
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Base schemas
const baseSchemas = {
  objectId: Joi.string().pattern(objectIdPattern).message('Invalid ID format'),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(100),
  status: Joi.string().valid('draft', 'published', 'archived'),
  sortOrder: Joi.string().valid('asc', 'desc', '1', '-1'),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }
};

// Post validation schemas
const postSchemas = {
  create: Joi.object({
    title: Joi.string()
      .trim()
      .min(3)
      .max(200)
      .required()
      .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title must not exceed 200 characters',
        'any.required': 'Title is required'
      }),
    
    content: Joi.string()
      .min(10)
      .max(50000)
      .required()
      .messages({
        'string.min': 'Content must be at least 10 characters long',
        'string.max': 'Content must not exceed 50000 characters',
        'any.required': 'Content is required'
      }),
    
    excerpt: Joi.string()
      .trim()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Excerpt must not exceed 500 characters'
      }),
    
    author: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Author name must be at least 2 characters long',
        'string.max': 'Author name must not exceed 100 characters',
        'any.required': 'Author is required'
      }),
    
    category: baseSchemas.objectId.required().messages({
      'any.required': 'Category is required'
    }),
    
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .lowercase()
          .max(30)
          .pattern(/^[a-z0-9-]+$/)
          .messages({
            'string.max': 'Each tag must not exceed 30 characters',
            'string.pattern.base': 'Tags can only contain lowercase letters, numbers, and hyphens'
          })
      )
      .max(10)
      .unique()
      .default([])
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'array.unique': 'Tags must be unique'
      }),
    
    status: baseSchemas.status.default('published'),
    
    featured: Joi.boolean().default(false),
    
    featuredImage: Joi.object({
      url: Joi.string().uri().messages({
        'string.uri': 'Featured image URL must be valid'
      }),
      alt: Joi.string().max(200).messages({
        'string.max': 'Alt text must not exceed 200 characters'
      })
    }).optional(),
    
    seo: Joi.object({
      metaTitle: Joi.string().max(60).messages({
        'string.max': 'Meta title must not exceed 60 characters'
      }),
      metaDescription: Joi.string().max(160).messages({
        'string.max': 'Meta description must not exceed 160 characters'
      }),
      keywords: Joi.array()
        .items(Joi.string().trim().lowercase().max(30))
        .max(20)
        .default([])
        .messages({
          'array.max': 'Maximum 20 SEO keywords allowed'
        })
    }).optional()
  }),

  update: Joi.object({
    title: Joi.string().trim().min(3).max(200),
    content: Joi.string().min(10).max(50000),
    excerpt: Joi.string().trim().max(500).allow(''),
    author: Joi.string().trim().min(2).max(100),
    category: baseSchemas.objectId,
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .lowercase()
          .max(30)
          .pattern(/^[a-z0-9-]+$/)
      )
      .max(10)
      .unique(),
    status: baseSchemas.status,
    featured: Joi.boolean(),
    featuredImage: Joi.object({
      url: Joi.string().uri(),
      alt: Joi.string().max(200)
    }),
    seo: Joi.object({
      metaTitle: Joi.string().max(60),
      metaDescription: Joi.string().max(160),
      keywords: Joi.array().items(Joi.string().trim().lowercase().max(30)).max(20)
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  query: Joi.object({
    page: baseSchemas.pagination.page,
    limit: baseSchemas.pagination.limit,
    status: baseSchemas.status,
    category: baseSchemas.objectId,
    author: Joi.string().trim().max(100),
    featured: Joi.boolean(),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    search: Joi.string().trim().min(2).max(100).messages({
      'string.min': 'Search query must be at least 2 characters long',
      'string.max': 'Search query must not exceed 100 characters'
    }),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'publishedAt', 'title', 'views', 'likes').default('createdAt'),
    sortOrder: baseSchemas.sortOrder.default('desc'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.min': 'End date must be after start date'
    })
  })
};

// Category validation schemas
const categorySchemas = {
  create: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Category name must be at least 2 characters long',
        'string.max': 'Category name must not exceed 50 characters',
        'any.required': 'Category name is required'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 500 characters'
      }),
    
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .default('#007bff')
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code'
      }),
    
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    description: Joi.string().trim().max(500).allow(''),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    isActive: Joi.boolean()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  query: Joi.object({
    page: baseSchemas.pagination.page,
    limit: baseSchemas.pagination.limit,
    isActive: Joi.boolean(),
    search: Joi.string().trim().min(2).max(50),
    sortBy: Joi.string().valid('name', 'createdAt', 'postCount').default('name'),
    sortOrder: baseSchemas.sortOrder.default('asc')
  })
};

// Parameter validation schemas
const paramSchemas = {
  postId: Joi.object({
    id: baseSchemas.objectId.required()
  }),
  
  categoryId: Joi.object({
    id: baseSchemas.objectId.required()
  }),
  
  slug: Joi.object({
    slug: baseSchemas.slug.required()
  })
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errorMessages
        }
      });
    }
    
    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Custom validation helpers
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!objectIdPattern.test(id)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format'
      }
    });
  }
  
  next();
};

const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Start date must be before end date'
        }
      });
    }
  }
  
  next();
};

module.exports = {
  validate,
  validateObjectId,
  validateDateRange,
  schemas: {
    post: postSchemas,
    category: categorySchemas,
    params: paramSchemas
  }
};