const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name must not exceed 50 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description must not exceed 500 characters'],
    trim: true
  },
  color: {
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
    default: '#007bff'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  postCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Update post count when category is referenced
categorySchema.methods.updatePostCount = async function() {
  const Post = mongoose.model('Post');
  this.postCount = await Post.countDocuments({ category: this._id, status: 'published' });
  await this.save();
};

// Virtual for posts
categorySchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'category'
});

module.exports = mongoose.model('Category', categorySchema);