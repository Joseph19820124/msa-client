const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title must not exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    minlength: [10, 'Content must be at least 10 characters'],
    maxlength: [50000, 'Content must not exceed 50000 characters']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt must not exceed 500 characters'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    minlength: [2, 'Author name must be at least 2 characters'],
    maxlength: [100, 'Author name must not exceed 100 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag must not exceed 30 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  featured: {
    type: Boolean,
    default: false
  },
  featuredImage: {
    url: String,
    alt: String
  },
  metadata: {
    readTime: {
      type: Number,
      default: 0
    },
    wordCount: {
      type: Number,
      default: 0
    }
  },
  stats: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title must not exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description must not exceed 160 characters']
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ author: 1 });
postSchema.index({ featured: 1, status: 1 });

// Pre-save middleware
postSchema.pre('save', function(next) {
  // Generate slug from title if not provided
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
  
  // Generate excerpt if not provided
  if (this.isModified('content') && !this.excerpt) {
    this.excerpt = this.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 200)
      .trim() + '...';
  }
  
  // Calculate word count and reading time
  if (this.isModified('content')) {
    const words = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    this.metadata.wordCount = words;
    this.metadata.readTime = Math.ceil(words / 200); // Assuming 200 words per minute
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Generate SEO fields if not provided
  if (this.isModified('title') && !this.seo.metaTitle) {
    this.seo.metaTitle = this.title.substring(0, 60);
  }
  
  if (this.isModified('excerpt') && !this.seo.metaDescription) {
    this.seo.metaDescription = this.excerpt ? this.excerpt.substring(0, 160) : '';
  }
  
  next();
});

// Static methods for common queries
postSchema.statics.findPublished = function(options = {}) {
  return this.find({ status: 'published', ...options }).populate('category');
};

postSchema.statics.findByCategory = function(categoryId, options = {}) {
  return this.find({ category: categoryId, status: 'published', ...options }).populate('category');
};

postSchema.statics.searchPosts = function(query, options = {}) {
  return this.find({
    $text: { $search: query },
    status: 'published',
    ...options
  }).populate('category');
};

// Instance methods
postSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

postSchema.methods.incrementLikes = function() {
  this.stats.likes += 1;
  return this.save();
};

postSchema.methods.updateCommentsCount = async function() {
  // This would be called from the comments service
  // For now, it's a placeholder for future integration
  return this;
};

// Virtual for URL
postSchema.virtual('url').get(function() {
  return `/posts/${this.slug}`;
});

// Virtual for reading time formatted
postSchema.virtual('readTimeFormatted').get(function() {
  const time = this.metadata.readTime;
  return time <= 1 ? '1 min read' : `${time} min read`;
});

module.exports = mongoose.model('Post', postSchema);