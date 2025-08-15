const Filter = require('bad-words');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Initialize content filter and sanitizer
const filter = new Filter();
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Add custom profanity words and phrases
const customBadWords = [
  // Add custom words/phrases specific to your platform
  'spam', 'scam', 'phishing', 'bot', 'fake'
];
filter.addWords(...customBadWords);

// Spam detection patterns
const spamPatterns = [
  /http[s]?:\/\/[^\s]+/gi, // URLs
  /\b(?:buy|sell|cheap|free|discount|offer|deal|visit|click|website|link)\b/gi, // Commercial keywords
  /(.)\1{5,}/g, // Repeated characters (5 or more)
  /\b(?:\d{1,3}[-.]){2,}\d{1,4}\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\$\d+|\d+\s?(?:USD|EUR|GBP|dollars?)/gi, // Price mentions
];

// Suspicious content patterns
const suspiciousPatterns = [
  /\b(?:win|winner|prize|lottery|million|inheritance)\b/gi, // Lottery/prize scams
  /\b(?:urgent|immediate|asap|hurry|limited time)\b/gi, // Urgency keywords
  /\b(?:guarantee|100%|risk.?free|no.?obligation)\b/gi, // False promises
  /[A-Z]{10,}/, // Excessive caps
  /(.+)\s*\1\s*\1/gi, // Repeated phrases
];

// Content sanitization middleware
const sanitizeContent = (req, res, next) => {
  if (req.body.content) {
    // Sanitize HTML content
    req.body.content = DOMPurify.sanitize(req.body.content, {
      ALLOWED_TAGS: [], // No HTML tags allowed in comments
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true // Keep text content, remove tags
    });

    // Additional text cleaning
    req.body.content = req.body.content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  if (req.body.description) {
    req.body.description = DOMPurify.sanitize(req.body.description, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    }).replace(/\s+/g, ' ').trim();
  }

  next();
};

// Profanity detection middleware
const detectProfanity = (req, res, next) => {
  const content = req.body.content || '';
  
  // Check for profanity
  const hasProfanity = filter.isProfane(content);
  
  if (hasProfanity) {
    // Add flag to request for downstream processing
    req.contentFlags = req.contentFlags || {};
    req.contentFlags.hasProfanity = true;
    req.contentFlags.cleanContent = filter.clean(content);
    
    // For strict moderation, you might want to reject immediately
    // return res.status(400).json({
    //   error: 'Content contains inappropriate language',
    //   code: 'PROFANITY_DETECTED'
    // });
  }

  next();
};

// Spam detection middleware
const detectSpam = (req, res, next) => {
  const content = req.body.content || '';
  const authorIp = req.userInfo?.ip;
  
  req.contentFlags = req.contentFlags || {};
  
  // Check against spam patterns
  const spamScore = spamPatterns.reduce((score, pattern) => {
    const matches = content.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  // Check suspicious patterns
  const suspiciousScore = suspiciousPatterns.reduce((score, pattern) => {
    return score + (pattern.test(content) ? 1 : 0);
  }, 0);

  // Calculate total risk score
  const totalScore = spamScore + suspiciousScore;
  
  if (totalScore > 0) {
    req.contentFlags.isSpam = totalScore >= 3; // High threshold for spam
    req.contentFlags.isSuspicious = totalScore >= 1; // Lower threshold for suspicious
    req.contentFlags.spamScore = totalScore;
  }

  // Check for URL presence
  const hasUrls = /http[s]?:\/\/[^\s]+/gi.test(content);
  if (hasUrls) {
    req.contentFlags.containsLinks = true;
  }

  // Additional checks for new users or suspicious IPs
  if (req.userStatus && !req.userStatus.isWhitelisted) {
    // More strict checking for untrusted users
    if (totalScore >= 1) {
      req.flagForReview = true;
    }
  }

  next();
};

// Auto-moderation decision middleware
const autoModerate = (req, res, next) => {
  const flags = req.contentFlags || {};
  
  // Auto-approve for trusted users with clean content
  if (req.userStatus?.trustLevel === 'trusted' && !flags.hasProfanity && !flags.isSpam) {
    req.autoModerationDecision = 'approved';
    return next();
  }

  // Auto-reject severely problematic content
  if (flags.hasProfanity && flags.isSpam) {
    req.autoModerationDecision = 'rejected';
    return next();
  }

  // Flag for manual review
  if (flags.hasProfanity || flags.isSpam || flags.isSuspicious || req.flagForReview) {
    req.autoModerationDecision = 'pending';
    req.flagForReview = true;
  } else {
    // Auto-approve clean content
    req.autoModerationDecision = 'approved';
  }

  next();
};

// Content analysis middleware - provides detailed analysis
const analyzeContent = (req, res, next) => {
  const content = req.body.content || '';
  
  req.contentAnalysis = {
    length: content.length,
    wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
    hasUrls: /http[s]?:\/\/[^\s]+/gi.test(content),
    hasEmails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g.test(content),
    hasPhoneNumbers: /\b(?:\d{1,3}[-.]){2,}\d{1,4}\b/g.test(content),
    hasCaps: /[A-Z]{5,}/.test(content),
    hasRepeatedChars: /(.)\1{4,}/.test(content),
    languageComplexity: calculateComplexity(content),
    sentiment: analyzeSentiment(content)
  };

  next();
};

// Helper function to calculate text complexity
function calculateComplexity(text) {
  if (!text || text.length === 0) return 0;
  
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const uniqueWords = new Set(words.map(word => word.toLowerCase())).size;
  const vocabularyRichness = uniqueWords / words.length;
  
  return {
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
    readabilityScore: avgWordLength * vocabularyRichness
  };
}

// Simple sentiment analysis
function analyzeSentiment(text) {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'awesome', 'fantastic'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst'];
  
  const words = text.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// Moderation queue middleware
const addToModerationQueue = async (req, res, next) => {
  if (req.flagForReview || req.autoModerationDecision === 'pending') {
    req.requiresModeration = true;
    
    // You can add logic here to notify moderators
    // For example, send to a queue system like Redis or RabbitMQ
    console.log(`Content flagged for moderation: ${req.userInfo?.ip} - ${req.body.content?.substring(0, 50)}...`);
  }

  next();
};

// Middleware to check if content should be auto-rejected
const autoReject = (req, res, next) => {
  const flags = req.contentFlags || {};
  
  // Auto-reject conditions
  const shouldReject = 
    (flags.spamScore && flags.spamScore >= 5) || // Very high spam score
    (flags.hasProfanity && req.userStatus?.trustLevel === 'low') || // Low trust + profanity
    (req.userStatus?.isBanned); // Banned user

  if (shouldReject) {
    return res.status(400).json({
      error: 'Content violates community guidelines',
      code: 'CONTENT_REJECTED',
      reason: 'automated_moderation'
    });
  }

  next();
};

module.exports = {
  sanitizeContent,
  detectProfanity,
  detectSpam,
  autoModerate,
  analyzeContent,
  addToModerationQueue,
  autoReject,
  // Export utilities for testing
  spamPatterns,
  suspiciousPatterns,
  filter
};