const Filter = require('bad-words');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Initialize content filter
const filter = new Filter();

// Initialize DOM purifier for XSS protection
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Custom bad words and phrases (extend as needed)
const customBadWords = [
  // Platform-specific terms
  'spam', 'scam', 'phishing', 'bot', 'fake',
  // Add more words based on your platform's needs
];

// Add custom words to the filter
filter.addWords(...customBadWords);

// Spam detection patterns
const spamPatterns = {
  urls: /http[s]?:\/\/[^\s]+/gi,
  emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phoneNumbers: /\b(?:\d{1,3}[-.]){2,}\d{1,4}\b/g,
  repeatedChars: /(.)\1{5,}/g,
  commercialKeywords: /\b(?:buy|sell|cheap|free|discount|offer|deal|visit|click|website|link|money|cash|prize|win|winner)\b/gi,
  urgencyKeywords: /\b(?:urgent|immediate|asap|hurry|limited time|act now|don't miss|expires|deadline)\b/gi,
  excessiveCaps: /[A-Z]{10,}/,
  repeatedPhrases: /(.{3,})\s*\1\s*\1/gi
};

// Suspicious content patterns
const suspiciousPatterns = {
  lottery: /\b(?:lottery|million|inheritance|beneficiary|deceased|will|testament)\b/gi,
  medical: /\b(?:viagra|cialis|pharmacy|prescription|pills|medication|cure|treatment)\b/gi,
  financial: /\b(?:loan|credit|debt|mortgage|investment|profit|income|earning)\b/gi,
  promises: /\b(?:guarantee|100%|risk.?free|no.?obligation|satisfaction|promised)\b/gi
};

/**
 * Clean and sanitize content for XSS protection
 */
const sanitizeContent = (content) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove HTML tags and potential XSS
  const cleaned = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
    STRIP_COMMENTS: true
  });

  // Additional cleaning
  return cleaned
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .trim();
};

/**
 * Check if content contains profanity
 */
const containsProfanity = (content) => {
  if (!content) return false;
  
  try {
    return filter.isProfane(content);
  } catch (error) {
    console.error('Error checking profanity:', error);
    return false;
  }
};

/**
 * Clean profanity from content
 */
const cleanProfanity = (content) => {
  if (!content) return '';
  
  try {
    return filter.clean(content);
  } catch (error) {
    console.error('Error cleaning profanity:', error);
    return content;
  }
};

/**
 * Calculate spam score for content
 */
const calculateSpamScore = (content, authorInfo = {}) => {
  if (!content) return 0;

  let score = 0;
  const text = content.toLowerCase();

  // Check each spam pattern
  Object.entries(spamPatterns).forEach(([patternName, pattern]) => {
    const matches = text.match(pattern);
    if (matches) {
      switch (patternName) {
        case 'urls':
          score += matches.length * 15; // URLs are high risk
          break;
        case 'emails':
          score += matches.length * 10;
          break;
        case 'phoneNumbers':
          score += matches.length * 8;
          break;
        case 'repeatedChars':
          score += matches.length * 5;
          break;
        case 'commercialKeywords':
          score += matches.length * 3;
          break;
        case 'urgencyKeywords':
          score += matches.length * 4;
          break;
        case 'excessiveCaps':
          score += 6;
          break;
        case 'repeatedPhrases':
          score += matches.length * 8;
          break;
        default:
          score += matches.length * 2;
      }
    }
  });

  // Check suspicious patterns (lower weight)
  Object.values(suspiciousPatterns).forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      score += matches.length * 2;
    }
  });

  // Content length factors
  if (content.length < 5) {
    score += 5; // Very short content might be spam
  } else if (content.length > 800) {
    score += 3; // Very long content might be spam
  }

  // Author factors (if provided)
  if (authorInfo.isNewUser) {
    score += 5; // New users get slight penalty
  }

  if (authorInfo.hasHistory && authorInfo.spamHistory) {
    score += 10; // Users with spam history
  }

  return Math.min(score, 100); // Cap at 100
};

/**
 * Detect if content is likely spam
 */
const isSpam = (content, authorInfo = {}, threshold = 15) => {
  const score = calculateSpamScore(content, authorInfo);
  return {
    isSpam: score >= threshold,
    score,
    threshold
  };
};

/**
 * Extract potentially problematic elements from content
 */
const extractProblematicElements = (content) => {
  if (!content) return {};

  const elements = {
    urls: [],
    emails: [],
    phoneNumbers: [],
    suspiciousKeywords: []
  };

  // Extract URLs
  const urlMatches = content.match(spamPatterns.urls);
  if (urlMatches) {
    elements.urls = [...new Set(urlMatches)]; // Remove duplicates
  }

  // Extract emails
  const emailMatches = content.match(spamPatterns.emails);
  if (emailMatches) {
    elements.emails = [...new Set(emailMatches)];
  }

  // Extract phone numbers
  const phoneMatches = content.match(spamPatterns.phoneNumbers);
  if (phoneMatches) {
    elements.phoneNumbers = [...new Set(phoneMatches)];
  }

  // Extract commercial keywords
  const commercialMatches = content.match(spamPatterns.commercialKeywords);
  if (commercialMatches) {
    elements.suspiciousKeywords = [...new Set(commercialMatches.map(m => m.toLowerCase()))];
  }

  return elements;
};

/**
 * Analyze content sentiment (basic implementation)
 */
const analyzeSentiment = (content) => {
  if (!content) return 'neutral';

  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
    'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'perfect', 'brilliant'
  ];

  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike', 'angry',
    'frustrated', 'disappointed', 'annoyed', 'disgusted', 'furious', 'outraged'
  ];

  const words = content.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

/**
 * Calculate content complexity metrics
 */
const analyzeComplexity = (content) => {
  if (!content) return { score: 0, metrics: {} };

  const words = content.split(/\s+/).filter(word => word.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length || 0;
  const avgSentenceLength = words.length / sentences.length || 0;
  const uniqueWords = new Set(words.map(word => word.toLowerCase())).size;
  const vocabularyRichness = uniqueWords / words.length || 0;

  const metrics = {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
    uniqueWordCount: uniqueWords
  };

  // Calculate overall complexity score (0-100)
  const complexityScore = Math.min(
    (avgWordLength * 10) + 
    (vocabularyRichness * 30) + 
    (Math.min(avgSentenceLength / 10, 1) * 20), 
    100
  );

  return {
    score: Math.round(complexityScore),
    metrics
  };
};

/**
 * Comprehensive content analysis
 */
const analyzeContent = (content, authorInfo = {}) => {
  const sanitized = sanitizeContent(content);
  const profanity = containsProfanity(sanitized);
  const spam = isSpam(sanitized, authorInfo);
  const elements = extractProblematicElements(sanitized);
  const sentiment = analyzeSentiment(sanitized);
  const complexity = analyzeComplexity(sanitized);

  return {
    sanitized,
    profanity: {
      detected: profanity,
      cleaned: profanity ? cleanProfanity(sanitized) : null
    },
    spam,
    elements,
    sentiment,
    complexity,
    flags: {
      hasProfanity: profanity,
      isSpam: spam.isSpam,
      containsUrls: elements.urls.length > 0,
      containsEmails: elements.emails.length > 0,
      containsPhones: elements.phoneNumbers.length > 0,
      hasRepeatedContent: /(.{10,})\s*\1/gi.test(content),
      isShort: sanitized.length < 10,
      isLong: sanitized.length > 800
    },
    meta: {
      originalLength: content?.length || 0,
      sanitizedLength: sanitized.length,
      processingTime: Date.now()
    }
  };
};

module.exports = {
  sanitizeContent,
  containsProfanity,
  cleanProfanity,
  calculateSpamScore,
  isSpam,
  extractProblematicElements,
  analyzeSentiment,
  analyzeComplexity,
  analyzeContent,
  
  // Export patterns for testing
  spamPatterns,
  suspiciousPatterns,
  
  // Export filter instance for customization
  filter
};