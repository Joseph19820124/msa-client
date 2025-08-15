const Comment = require('../models/Comment');
const Report = require('../models/Report');
const axios = require('axios');

// Helper function to handle database errors
const handleDatabaseError = (error, res, operation = 'database operation') => {
  console.error(`Error during ${operation}:`, error);
  
  // Handle different types of database errors
  if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
    return res.status(503).json({
      error: 'Database service temporarily unavailable',
      code: 'DATABASE_TIMEOUT',
      retryAfter: '30 seconds'
    });
  }
  
  if (error.name === 'MongooseServerSelectionError') {
    return res.status(503).json({
      error: 'Database connection failed',
      code: 'DATABASE_UNAVAILABLE',
      retryAfter: '30 seconds'
    });
  }
  
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationErrors
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_ID',
      field: error.path
    });
  }
  
  // Handle specific business logic errors
  if (error.message === 'Post not found') {
    return res.status(404).json({
      error: 'Post not found',
      code: 'POST_NOT_FOUND'
    });
  }
  
  if (error.message === 'Comment not found') {
    return res.status(404).json({
      error: 'Comment not found',
      code: 'COMMENT_NOT_FOUND'
    });
  }
  
  // Default server error
  return res.status(500).json({
    error: `Failed to perform ${operation}`,
    code: 'INTERNAL_ERROR'
  });
};

// Get all comments for a post with threading support
const getComments = async (req, res) => {
  try {
    const { post_id } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
      status = 'approved'
    } = req.query;

    // Validate post exists by calling Posts Service
    await validatePostExists(post_id);

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      status
    };

    const result = await Comment.getThreadedComments(post_id, options);

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
      meta: {
        postId: post_id,
        totalComments: result.pagination.total
      }
    });

  } catch (error) {
    return handleDatabaseError(error, res, 'fetch comments');
  }
};

// Create a new comment
const createComment = async (req, res) => {
  try {
    const { post_id } = req.params;
    const { content, author, parentId } = req.body;

    // Validate post exists
    await validatePostExists(post_id);

    // Validate parent comment if provided
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({
          error: 'Parent comment not found',
          code: 'PARENT_COMMENT_NOT_FOUND'
        });
      }
      
      if (parentComment.postId !== post_id) {
        return res.status(400).json({
          error: 'Parent comment does not belong to this post',
          code: 'INVALID_PARENT_COMMENT'
        });
      }
    }

    // Create comment object
    const commentData = {
      postId: post_id,
      content,
      author: {
        ...author,
        ip: req.userInfo.ip
      },
      parentId: parentId || null,
      status: req.autoModerationDecision || 'pending'
    };

    // Apply content flags if present
    if (req.contentFlags) {
      commentData.flags = {
        hasProfanity: req.contentFlags.hasProfanity || false,
        isSpam: req.contentFlags.isSpam || false,
        containsLinks: req.contentFlags.containsLinks || false
      };
    }

    const comment = new Comment(commentData);
    await comment.save();

    // Populate reply count for response
    await comment.populate('replyCount');

    res.status(201).json({
      success: true,
      data: comment,
      meta: {
        requiresModeration: req.requiresModeration || false,
        autoModerated: !!req.autoModerationDecision
      }
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    
    if (error.message === 'Post not found') {
      return res.status(404).json({
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    if (error.message === 'Maximum comment depth exceeded') {
      return res.status(400).json({
        error: 'Maximum reply depth exceeded (3 levels)',
        code: 'MAX_DEPTH_EXCEEDED'
      });
    }

    res.status(500).json({
      error: 'Failed to create comment',
      code: 'CREATE_COMMENT_ERROR'
    });
  }
};

// Update a comment (within edit window)
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Check if comment can still be edited
    if (!comment.canEdit) {
      return res.status(400).json({
        error: 'Comment edit window has expired (24 hours)',
        code: 'EDIT_WINDOW_EXPIRED'
      });
    }

    // For demo purposes, allow any IP to edit
    // In production, implement proper user authentication
    
    // Update content and set edited flags
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();

    // Apply content flags from moderation middleware
    if (req.contentFlags) {
      comment.flags = {
        hasProfanity: req.contentFlags.hasProfanity || false,
        isSpam: req.contentFlags.isSpam || false,
        containsLinks: req.contentFlags.containsLinks || false
      };

      // Re-moderate if content has issues
      if (req.contentFlags.hasProfanity || req.contentFlags.isSpam) {
        comment.status = 'pending';
      }
    }

    await comment.save();
    await comment.populate('replyCount');

    res.json({
      success: true,
      data: comment,
      meta: {
        wasEdited: true,
        requiresRemoderation: comment.status === 'pending'
      }
    });

  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      error: 'Failed to update comment',
      code: 'UPDATE_COMMENT_ERROR'
    });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Check if comment has replies
    const replyCount = await Comment.countDocuments({ parentId: id });
    
    if (replyCount > 0) {
      // Don't actually delete, just mark as deleted
      comment.content = '[This comment has been deleted]';
      comment.author.name = '[Deleted]';
      comment.author.email = '[deleted]';
      comment.status = 'rejected';
      await comment.save();

      return res.json({
        success: true,
        message: 'Comment marked as deleted (has replies)',
        data: { id, hasReplies: true }
      });
    }

    // If no replies, actually delete the comment
    await Comment.findByIdAndDelete(id);

    // Also delete any reports for this comment
    await Report.deleteMany({ commentId: id });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      data: { id, hasReplies: false }
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      error: 'Failed to delete comment',
      code: 'DELETE_COMMENT_ERROR'
    });
  }
};

// Like a comment
const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { ip, userAgent } = req.userInfo;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Check if user has already liked this comment
    if (comment.hasUserLiked(ip, userAgent)) {
      return res.status(400).json({
        error: 'You have already liked this comment',
        code: 'ALREADY_LIKED'
      });
    }

    // Add like
    comment.likes += 1;
    comment.likedBy.push({
      ip,
      userAgent,
      timestamp: new Date()
    });

    await comment.save();

    res.json({
      success: true,
      data: {
        commentId: id,
        likes: comment.likes,
        userHasLiked: true
      }
    });

  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({
      error: 'Failed to like comment',
      code: 'LIKE_COMMENT_ERROR'
    });
  }
};

// Report a comment
const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const { ip, userAgent, fingerprint } = req.userInfo;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Check if user has already reported this comment
    const existingReport = await Report.hasReported(id, ip);
    if (existingReport) {
      return res.status(400).json({
        error: 'You have already reported this comment',
        code: 'ALREADY_REPORTED'
      });
    }

    // Create report
    const report = new Report({
      commentId: id,
      postId: comment.postId,
      reason,
      description,
      reporter: {
        ip,
        userAgent,
        fingerprint
      }
    });

    await report.save();

    // Increment report count on comment
    comment.reports += 1;
    
    // Auto-flag comment if it receives multiple reports
    if (comment.reports >= 3 && comment.status === 'approved') {
      comment.status = 'flagged';
    }

    await comment.save();

    res.json({
      success: true,
      message: 'Comment reported successfully',
      data: {
        reportId: report._id,
        commentId: id,
        totalReports: comment.reports
      }
    });

  } catch (error) {
    console.error('Error reporting comment:', error);
    res.status(500).json({
      error: 'Failed to report comment',
      code: 'REPORT_COMMENT_ERROR'
    });
  }
};

// Get comment statistics
const getCommentStats = async (req, res) => {
  try {
    const { post_id } = req.params;

    // Validate post exists
    await validatePostExists(post_id);

    const stats = await Comment.aggregate([
      { $match: { postId: post_id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalLikes: { $sum: '$likes' },
          totalReports: { $sum: '$reports' }
        }
      }
    ]);

    const formattedStats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      flagged: 0,
      totalLikes: 0,
      totalReports: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
      formattedStats.totalLikes += stat.totalLikes;
      formattedStats.totalReports += stat.totalReports;
    });

    res.json({
      success: true,
      data: formattedStats,
      meta: {
        postId: post_id
      }
    });

  } catch (error) {
    console.error('Error fetching comment stats:', error);
    
    if (error.message === 'Post not found') {
      return res.status(404).json({
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch comment statistics',
      code: 'FETCH_STATS_ERROR'
    });
  }
};

// Helper function to validate post exists
const validatePostExists = async (postId) => {
  const postsServiceUrl = process.env.POSTS_SERVICE_URL || 'http://localhost:4000';
  
  try {
    const response = await axios.get(`${postsServiceUrl}/posts/${postId}`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error('Post not found');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Post not found');
    }
    // For demo purposes, if posts service is not available, assume post exists
    console.warn('Posts service unavailable, skipping validation');
  }
};

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  reportComment,
  getCommentStats
};