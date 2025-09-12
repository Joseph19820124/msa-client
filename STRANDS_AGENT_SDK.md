# Strands Agent SDK

An intelligent AI-powered agent system for blog automation and content analysis, integrated with the microservices blog platform.

## Overview

The Strands Agent SDK provides a powerful AI agent that can intelligently interact with blog posts and comments, offering automation, analysis, and enhancement capabilities for your blog platform.

## Features

### 🎯 Core Capabilities

- **Content Sentiment Analysis**: Automatically analyze the sentiment and extract key topics from posts and comments
- **Intelligent Response Generation**: Generate contextually appropriate responses based on content analysis
- **Post Enhancement**: Create AI-enhanced posts with intelligent titles and metadata
- **Real-time Monitoring**: Monitor for new content and trigger automated actions
- **User Engagement Analytics**: Track and analyze user engagement patterns

### 🔌 Microservices Integration

- **Posts Service Integration**: Full compatibility with the existing posts microservice
- **Comments Service Integration**: Seamless integration with the comments microservice
- **Event-driven Architecture**: Supports real-time event monitoring and response
- **Configurable Behavior**: Highly customizable agent behavior and settings

## Installation

The SDK is already integrated into the React client. To use it:

1. Import the StrandsAgent class:
```javascript
import StrandsAgent from './services/strandsAgent';
```

2. Or use pre-configured instances:
```javascript
import { blogAssistantAgent, moderatorAgent } from './services/strandsAgent';
```

## Quick Start

### Basic Agent Setup

```javascript
import StrandsAgent from './services/strandsAgent';

// Create a new agent instance
const agent = new StrandsAgent({
  agentName: 'My Blog Assistant',
  autoReply: false, // Set to true for automatic commenting
  postsServiceUrl: 'http://localhost:4000',
  commentsServiceUrl: 'http://localhost:4001'
});

// Initialize the agent
await agent.initialize();
```

### Content Analysis

```javascript
// Analyze content sentiment and extract topics
const analysis = agent.analyzeContent('This is an amazing blog post about AI!');
console.log(analysis);
// Output:
// {
//   sentiment: 'positive',
//   confidence: 0.125,
//   keyTopics: ['amazing', 'about'],
//   wordCount: 8
// }
```

### Intelligent Response Generation

```javascript
// Generate AI response based on content
const response = agent.generateResponse(
  'AI and Machine Learning Trends',
  'This post discusses the latest trends in AI...'
);

console.log(response.content);
// Output: "Great post! This really resonates with current trends. The topics around trends are particularly relevant right now."
```

### Automated Post Creation

```javascript
// Create an AI-enhanced post
const post = await agent.createEnhancedPost(
  'The Future of AI in Web Development',
  { enhanceTitle: true }
);
```

### Post Analysis

```javascript
// Get all posts with AI analysis
const analyzedPosts = await agent.getAnalyzedPosts();
analyzedPosts.forEach(post => {
  console.log(`Post: ${post.title}`);
  console.log(`Sentiment: ${post.analysis.sentiment}`);
  console.log(`Recommendation: ${post.agentRecommendation}`);
});
```

## Configuration Options

### Agent Configuration

```javascript
const config = {
  // Agent identity
  agentName: 'Custom Agent Name',
  
  // Service URLs
  postsServiceUrl: 'http://localhost:4000',
  commentsServiceUrl: 'http://localhost:4001',
  
  // Automation settings
  autoReply: false, // Enable/disable automatic commenting
  
  // Additional custom settings
  customOption: 'value'
};

const agent = new StrandsAgent(config);
```

### Pre-configured Agents

The SDK includes several pre-configured agent instances:

```javascript
import { blogAssistantAgent, moderatorAgent } from './services/strandsAgent';

// Blog Assistant - Helpful responses and engagement
await blogAssistantAgent.initialize();

// Content Moderator - Content quality analysis
await moderatorAgent.initialize();
```

## API Reference

### StrandsAgent Class

#### Constructor
```javascript
new StrandsAgent(config = {})
```

#### Methods

##### `initialize()`
Initialize the agent and start monitoring.
```javascript
await agent.initialize();
```

##### `analyzeContent(content)`
Analyze content sentiment and extract key topics.
```javascript
const analysis = agent.analyzeContent('Content to analyze');
```

##### `generateResponse(title, content, context)`
Generate intelligent response based on content.
```javascript
const response = agent.generateResponse('Post Title', 'Post content');
```

##### `autoCommentOnPost(postId, postTitle, postContent)`
Automatically comment on a post (requires autoReply: true).
```javascript
const comment = await agent.autoCommentOnPost(1, 'Title', 'Content');
```

##### `getAnalyzedPosts()`
Get all posts with AI analysis.
```javascript
const posts = await agent.getAnalyzedPosts();
```

##### `createEnhancedPost(title, options)`
Create an AI-enhanced post.
```javascript
const post = await agent.createEnhancedPost('Title', { enhanceTitle: true });
```

##### `getStatus()`
Get agent status and configuration.
```javascript
const status = agent.getStatus();
```

##### `stop()`
Stop the agent.
```javascript
agent.stop();
```

##### Event Management
```javascript
// Add event listener
agent.addEventListener('post_created', (data) => {
  console.log('New post created:', data);
});

// Emit event
agent.emit('custom_event', { data: 'value' });
```

## Demo Component

The SDK includes a comprehensive demo component (`StrandsAgentDemo`) that showcases all features:

- Agent initialization and status monitoring
- Real-time content analysis
- Response generation testing
- Blog operations demonstration
- Results visualization

To access the demo, visit the main application and scroll to the "🤖 Strands Agent SDK" section.

## Use Cases

### 1. Automated Content Moderation
```javascript
const moderator = new StrandsAgent({
  agentName: 'Content Moderator',
  autoReply: false
});

// Analyze posts for inappropriate content
const posts = await moderator.getAnalyzedPosts();
posts.forEach(post => {
  if (post.analysis.sentiment === 'negative') {
    console.log(`Post ${post.id} may need moderation`);
  }
});
```

### 2. Smart Comment Generation
```javascript
const assistant = new StrandsAgent({
  agentName: 'Blog Assistant',
  autoReply: true // Enable automatic commenting
});

// Agent will automatically comment on new posts
await assistant.initialize();
```

### 3. Content Quality Analysis
```javascript
const analyzer = new StrandsAgent({
  agentName: 'Quality Analyzer'
});

const analysis = analyzer.analyzeContent(postContent);
if (analysis.confidence > 0.7) {
  console.log('High-quality content detected');
}
```

### 4. User Engagement Enhancement
```javascript
const engager = new StrandsAgent({
  agentName: 'Engagement Enhancer'
});

// Generate engaging responses to boost interaction
const response = engager.generateResponse(title, content, {
  engagementFocus: true
});
```

## Architecture

The Strands Agent SDK is built with:

- **Modular Design**: Easily extensible with new capabilities
- **Event-driven Architecture**: Supports real-time monitoring and responses
- **Microservices Integration**: Seamlessly works with existing services
- **Configuration-driven**: Highly customizable behavior
- **React Integration**: Native React component support

## Best Practices

1. **Always initialize agents** before using their methods
2. **Use autoReply carefully** in production to avoid spam
3. **Monitor agent status** regularly for optimal performance
4. **Customize configurations** based on your specific use case
5. **Handle errors gracefully** in async operations

## Troubleshooting

### Common Issues

#### Agent not initializing
- Ensure microservices are running on correct ports
- Check network connectivity
- Verify configuration parameters

#### Content analysis returning unexpected results
- Check input content format
- Ensure content is not empty
- Review agent configuration

#### API calls failing
- Verify service URLs are correct
- Check if services are accessible
- Review error logs

## Contributing

To extend the Strands Agent SDK:

1. Add new capabilities to the `capabilities` array
2. Implement new methods in the `StrandsAgent` class
3. Update the demo component to showcase new features
4. Add comprehensive documentation

## License

This SDK is part of the microservices blog platform and follows the same licensing terms as the main project.

---

*Generated with ❤️ by the Strands Agent SDK*