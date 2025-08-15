const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  author: {
    name: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    ip: {
      type: String,
      required: true
    }
  },
  // Threading support
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  depth: {
    type: Number,
    default: 0,
    min: 0,
    max: 3 // Maximum nesting depth
  },
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderatedBy: {
    type: String,
    default: null
  },
  moderatedAt: {
    type: Date,
    default: null
  },
  moderationReason: {
    type: String,
    default: null
  },
  // Engagement
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  likedBy: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  reports: {
    type: Number,
    default: 0,
    min: 0
  },
  // Content flags
  flags: {
    hasProfanity: { type: Boolean, default: false },
    isSpam: { type: Boolean, default: false },
    containsLinks: { type: Boolean, default: false }
  },
  // Edit tracking
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  editWindow: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ status: 1 });
commentSchema.index({ 'author.ip': 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 });

// Virtual for checking if comment can be edited
commentSchema.virtual('canEdit').get(function() {
  return new Date() < this.editWindow;
});

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

// Pre-save middleware to validate depth
commentSchema.pre('save', async function(next) {
  if (this.parentId && this.isNew) {
    const parent = await this.constructor.findById(this.parentId);
    if (!parent) {
      throw new Error('Parent comment not found');
    }
    if (parent.depth >= 3) {
      throw new Error('Maximum comment depth exceeded');
    }
    this.depth = parent.depth + 1;
  }
  next();
});

// Static method to get threaded comments
commentSchema.statics.getThreadedComments = async function(postId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc',
    status = 'approved'
  } = options;

  const skip = (page - 1) * limit;
  const sortObj = { [sort]: order === 'desc' ? -1 : 1 };

  // Get top-level comments first
  const topLevelComments = await this.find({
    postId,
    parentId: null,
    status
  })
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .populate('replyCount')
    .lean();

  // Get all replies for these comments
  const commentIds = topLevelComments.map(c => c._id);
  const replies = await this.find({
    postId,
    parentId: { $in: commentIds },
    status
  })
    .sort({ createdAt: 1 })
    .lean();

  // Organize replies under their parents
  const commentsWithReplies = topLevelComments.map(comment => ({
    ...comment,
    replies: replies.filter(reply => 
      reply.parentId.toString() === comment._id.toString()
    )
  }));

  const total = await this.countDocuments({ postId, parentId: null, status });

  return {
    comments: commentsWithReplies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Static method for spam detection
commentSchema.statics.isSpam = function(content, authorIp) {
  // Simple spam detection rules
  const spamPatterns = [
    /http[s]?:\/\//gi, // URLs
    /\b(buy|sell|cheap|free|click|visit|website)\b/gi, // Common spam words
    /(.)\1{4,}/g, // Repeated characters
  ];

  return spamPatterns.some(pattern => pattern.test(content));
};

// Instance method to check if user has already liked
commentSchema.methods.hasUserLiked = function(ip, userAgent) {
  return this.likedBy.some(like => 
    like.ip === ip && like.userAgent === userAgent
  );
};

module.exports = mongoose.model('Comment', commentSchema);