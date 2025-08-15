const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
    index: true
  },
  postId: {
    type: String,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'spam',
      'inappropriate',
      'harassment',
      'hate_speech',
      'violence',
      'misinformation',
      'copyright',
      'other'
    ]
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  reporter: {
    ip: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    fingerprint: {
      type: String, // Browser fingerprint for tracking
      required: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    maxlength: 500,
    default: null
  },
  actionTaken: {
    type: String,
    enum: ['none', 'comment_removed', 'comment_flagged', 'user_warned', 'user_banned'],
    default: 'none'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  metadata: {
    reportCount: {
      type: Number,
      default: 1
    },
    duplicateReports: [{
      ip: String,
      timestamp: { type: Date, default: Date.now },
      userAgent: String
    }],
    autoFlags: {
      profanityDetected: { type: Boolean, default: false },
      spamDetected: { type: Boolean, default: false },
      linkDetected: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
reportSchema.index({ commentId: 1, 'reporter.ip': 1 }, { unique: true }); // Prevent duplicate reports
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ priority: 1, status: 1 });
reportSchema.index({ postId: 1, status: 1 });
reportSchema.index({ reviewedBy: 1, reviewedAt: -1 });

// Virtual for comment details
reportSchema.virtual('comment', {
  ref: 'Comment',
  localField: 'commentId',
  foreignField: '_id',
  justOne: true
});

// Static method to check if IP has already reported this comment
reportSchema.statics.hasReported = async function(commentId, ip) {
  const report = await this.findOne({
    commentId,
    'reporter.ip': ip
  });
  return !!report;
};

// Static method to get reports summary
reportSchema.statics.getReportsSummary = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.status) matchStage.status = filters.status;
  if (filters.priority) matchStage.priority = filters.priority;
  if (filters.reason) matchStage.reason = filters.reason;
  if (filters.dateFrom) matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
  if (filters.dateTo) {
    matchStage.createdAt = { 
      ...matchStage.createdAt,
      $lte: new Date(filters.dateTo)
    };
  }

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        reviewed: {
          $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        dismissed: {
          $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
        },
        highPriority: {
          $sum: { $cond: [{ $in: ['$priority', ['high', 'critical']] }, 1, 0] }
        },
        reasonBreakdown: {
          $push: '$reason'
        }
      }
    }
  ]);

  // Count reasons
  const reasonCounts = {};
  if (summary.length > 0 && summary[0].reasonBreakdown) {
    summary[0].reasonBreakdown.forEach(reason => {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
  }

  return {
    ...(summary[0] || {
      total: 0,
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
      highPriority: 0
    }),
    reasonBreakdown: reasonCounts
  };
};

// Static method to auto-prioritize reports
reportSchema.statics.autoPrioritize = function(reason, commentContent, reportCount = 1) {
  // Critical priority conditions
  if (reason === 'violence' || reason === 'hate_speech') {
    return 'critical';
  }

  // High priority conditions
  if (reason === 'harassment' || reportCount >= 3) {
    return 'high';
  }

  // Medium priority conditions
  if (reason === 'inappropriate' || reason === 'misinformation') {
    return 'medium';
  }

  // Default to low priority
  return 'low';
};

// Pre-save middleware to auto-prioritize
reportSchema.pre('save', function(next) {
  if (this.isNew && !this.priority) {
    this.priority = this.constructor.autoPrioritize(
      this.reason,
      '',
      this.metadata.reportCount
    );
  }
  next();
});

// Instance method to mark as reviewed
reportSchema.methods.markAsReviewed = function(reviewerId, notes, actionTaken) {
  this.status = 'reviewed';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.actionTaken = actionTaken;
  return this.save();
};

// Instance method to resolve report
reportSchema.methods.resolve = function(reviewerId, notes, actionTaken) {
  this.status = 'resolved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.actionTaken = actionTaken;
  return this.save();
};

// Instance method to dismiss report
reportSchema.methods.dismiss = function(reviewerId, notes) {
  this.status = 'dismissed';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.actionTaken = 'none';
  return this.save();
};

module.exports = mongoose.model('Report', reportSchema);