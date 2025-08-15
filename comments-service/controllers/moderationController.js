const Comment = require('../models/Comment');
const Report = require('../models/Report');

// Get all comments for moderation
const getModerationQueue = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'pending',
      sort = 'createdAt',
      order = 'desc',
      priority = null,
      postId = null
    } = req.query;

    const query = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by post if provided
    if (postId) {
      query.postId = postId;
    }

    // Build sort object
    const sortObj = { [sort]: order === 'desc' ? -1 : 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('replyCount')
      .lean();

    const total = await Comment.countDocuments(query);

    // Get additional metadata for each comment
    const commentsWithMetadata = await Promise.all(
      comments.map(async (comment) => {
        const reportCount = await Report.countDocuments({ 
          commentId: comment._id, 
          status: { $in: ['pending', 'reviewed'] }
        });

        return {
          ...comment,
          reportCount,
          riskScore: calculateRiskScore(comment),
          moderationPriority: determinePriority(comment, reportCount)
        };
      })
    );

    res.json({
      success: true,
      data: commentsWithMetadata,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      meta: {
        queueStats: await getModerationStats()
      }
    });

  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    res.status(500).json({
      error: 'Failed to fetch moderation queue',
      code: 'FETCH_MODERATION_QUEUE_ERROR'
    });
  }
};

// Moderate a comment (approve/reject/flag)
const moderateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const moderatorId = req.user?.id || 'system';

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Update comment status and moderation info
    comment.status = status;
    comment.moderatedBy = moderatorId;
    comment.moderatedAt = new Date();
    comment.moderationReason = reason || null;

    await comment.save();

    // If comment is approved/rejected, update related reports
    if (status === 'approved' || status === 'rejected') {
      await Report.updateMany(
        { commentId: id, status: 'pending' },
        {
          $set: {
            status: 'reviewed',
            reviewedBy: moderatorId,
            reviewedAt: new Date(),
            actionTaken: status === 'approved' ? 'none' : 'comment_removed'
          }
        }
      );
    }

    await comment.populate('replyCount');

    res.json({
      success: true,
      data: comment,
      meta: {
        moderatedBy: moderatorId,
        actionTaken: status,
        relatedReportsUpdated: true
      }
    });

  } catch (error) {
    console.error('Error moderating comment:', error);
    res.status(500).json({
      error: 'Failed to moderate comment',
      code: 'MODERATE_COMMENT_ERROR'
    });
  }
};

// Bulk moderate comments
const bulkModerateComments = async (req, res) => {
  try {
    const { commentIds, status, reason } = req.body;
    const moderatorId = req.user?.id || 'system';

    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        error: 'Comment IDs array is required',
        code: 'INVALID_COMMENT_IDS'
      });
    }

    if (commentIds.length > 50) {
      return res.status(400).json({
        error: 'Cannot moderate more than 50 comments at once',
        code: 'TOO_MANY_COMMENTS'
      });
    }

    // Update all comments
    const updateResult = await Comment.updateMany(
      { _id: { $in: commentIds } },
      {
        $set: {
          status,
          moderatedBy: moderatorId,
          moderatedAt: new Date(),
          moderationReason: reason || null
        }
      }
    );

    // Update related reports
    await Report.updateMany(
      { commentId: { $in: commentIds }, status: 'pending' },
      {
        $set: {
          status: 'reviewed',
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          actionTaken: status === 'approved' ? 'none' : 'comment_removed'
        }
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: updateResult.modifiedCount,
        requestedCount: commentIds.length
      },
      meta: {
        moderatedBy: moderatorId,
        actionTaken: status,
        bulkOperation: true
      }
    });

  } catch (error) {
    console.error('Error bulk moderating comments:', error);
    res.status(500).json({
      error: 'Failed to bulk moderate comments',
      code: 'BULK_MODERATE_ERROR'
    });
  }
};

// Get all reports for moderation
const getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'pending',
      priority = null,
      reason = null,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (reason) {
      query.reason = reason;
    }

    const sortObj = { [sort]: order === 'desc' ? -1 : 1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('comment')
      .lean();

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      meta: {
        reportsSummary: await Report.getReportsSummary()
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      code: 'FETCH_REPORTS_ERROR'
    });
  }
};

// Review a report
const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, actionTaken } = req.body;
    const reviewerId = req.user?.id || 'system';

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    // Update report based on status
    let updatedReport;
    switch (status) {
      case 'reviewed':
        updatedReport = await report.markAsReviewed(reviewerId, notes, actionTaken);
        break;
      case 'resolved':
        updatedReport = await report.resolve(reviewerId, notes, actionTaken);
        break;
      case 'dismissed':
        updatedReport = await report.dismiss(reviewerId, notes);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid status',
          code: 'INVALID_STATUS'
        });
    }

    // If action was taken on the comment, update it
    if (actionTaken && actionTaken !== 'none') {
      const comment = await Comment.findById(report.commentId);
      if (comment) {
        switch (actionTaken) {
          case 'comment_removed':
          case 'comment_flagged':
            comment.status = 'rejected';
            comment.moderatedBy = reviewerId;
            comment.moderatedAt = new Date();
            comment.moderationReason = `Report action: ${actionTaken}`;
            await comment.save();
            break;
        }
      }
    }

    await updatedReport.populate('comment');

    res.json({
      success: true,
      data: updatedReport,
      meta: {
        reviewedBy: reviewerId,
        actionTaken: actionTaken || 'none'
      }
    });

  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({
      error: 'Failed to review report',
      code: 'REVIEW_REPORT_ERROR'
    });
  }
};

// Get moderation statistics
const getModerationStats = async () => {
  try {
    const [commentStats, reportStats] = await Promise.all([
      Comment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Report.getReportsSummary()
    ]);

    const formattedCommentStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0
    };

    commentStats.forEach(stat => {
      formattedCommentStats[stat._id] = stat.count;
    });

    return {
      comments: formattedCommentStats,
      reports: reportStats
    };
  } catch (error) {
    console.error('Error calculating moderation stats:', error);
    return {
      comments: { pending: 0, approved: 0, rejected: 0, flagged: 0 },
      reports: { total: 0, pending: 0, reviewed: 0, resolved: 0, dismissed: 0 }
    };
  }
};

// Get detailed moderation statistics
const getDetailedModerationStats = async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      groupBy = 'day' // day, week, month
    } = req.query;

    const matchStage = {};
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    // Group by time period
    let dateGrouping;
    switch (groupBy) {
      case 'week':
        dateGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default: // day
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const [commentTrends, reportTrends, topReasons] = await Promise.all([
      Comment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: dateGrouping,
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      Report.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: dateGrouping,
              reason: '$reason'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      Report.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const stats = await getModerationStats();

    res.json({
      success: true,
      data: {
        overview: stats,
        trends: {
          comments: commentTrends,
          reports: reportTrends
        },
        topReportReasons: topReasons,
        period: {
          from: dateFrom,
          to: dateTo,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error fetching detailed moderation stats:', error);
    res.status(500).json({
      error: 'Failed to fetch detailed moderation statistics',
      code: 'FETCH_DETAILED_STATS_ERROR'
    });
  }
};

// Helper function to calculate risk score for a comment
const calculateRiskScore = (comment) => {
  let score = 0;

  // Content flags
  if (comment.flags?.hasProfanity) score += 30;
  if (comment.flags?.isSpam) score += 40;
  if (comment.flags?.containsLinks) score += 10;

  // Report count
  score += comment.reports * 15;

  // New user (no previous comments from this IP)
  // This would require additional data from the database
  
  // Comment length (very short or very long might be suspicious)
  if (comment.content.length < 10) score += 5;
  if (comment.content.length > 800) score += 10;

  return Math.min(score, 100); // Cap at 100
};

// Helper function to determine priority
const determinePriority = (comment, reportCount) => {
  const riskScore = calculateRiskScore(comment);
  
  if (riskScore >= 70 || reportCount >= 5) return 'critical';
  if (riskScore >= 50 || reportCount >= 3) return 'high';
  if (riskScore >= 30 || reportCount >= 1) return 'medium';
  return 'low';
};

module.exports = {
  getModerationQueue,
  moderateComment,
  bulkModerateComments,
  getReports,
  reviewReport,
  getModerationStats,
  getDetailedModerationStats
};