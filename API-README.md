# 🚀 Microservices Blog/Forum API Documentation

A comprehensive, scalable microservices architecture for modern blogging and forum platforms.

```
 ____  _             
|  _ \| | ___   __ _ 
| |_) | |/ _ \ / _` |
|  _ <| | (_) | (_| |
|_| \_\_|\___/ \__, |
              |___/ 
   __  __ _                                  _               
  |  \/  (_) ___ _ __ ___  ___  ___ _ ____   _(_) ___ ___  ___ 
  | |\/| | |/ __| '__/ _ \/ __|/ _ \ '__\ \ / / |/ __/ _ \/ __|
  | |  | | | (__| | | (_) \__ \  __/ |   \ V /| | (_|  __/\__ \
  |_|  |_|_|\___|_|  \___/|___/\___|_|    \_/ |_|\___\___||___/
```

## What This Does

This API ecosystem powers modern content platforms with three independent, scalable services:

- **📝 Posts Service** - Create, edit, and discover blog content with rich tagging and search
- **💬 Comments Service** - Threaded discussions with voting, moderation, and real-time updates  
- **🔐 Auth Service** - Secure authentication with JWT, OAuth, and comprehensive security features

Each service operates independently but works together seamlessly to create engaging content experiences.

## Quick Start

### 🏃‍♂️ Get Running in 2 Minutes

```bash
# Clone and enter the project
git clone <repository-url>
cd microservices-blog-api

# Start all services with Docker
docker-compose up -d

# Or start individual services
npm run start:posts     # Posts Service on :4000
npm run start:comments  # Comments Service on :4001  
npm run start:auth      # Auth Service on :4002
```

### 🎯 Test Drive the API

```bash
# Create a user account
curl -X POST http://localhost:4002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "username": "dev_user",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'

# Login and get your token
curl -X POST http://localhost:4002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "developer@example.com", 
    "password": "SecurePass123!"
  }'

# Create your first post (use token from login)
curl -X POST http://localhost:4000/posts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First API Post",
    "content": "This API is amazing! Here's what I learned...",
    "tags": ["api", "microservices", "learning"]
  }'
```

## 🏗️ Architecture Overview

Our microservices architecture prioritizes independence, scalability, and developer experience:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Posts Service │    │Comments Service │    │  Auth Service   │
│    Port 4000    │    │    Port 4001    │    │    Port 4002    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Create Posts  │    │ • Threaded Disc │    │ • JWT Auth      │
│ • Tag & Search  │    │ • Voting System │    │ • OAuth (G/GH/D)│
│ • Content Mgmt  │    │ • Moderation    │    │ • User Profiles │
│ • Permissions   │    │ • Real-time     │    │ • Security      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Client Apps     │
                    │ (React/Mobile)  │
                    └─────────────────┘
```

### 🎨 Design Principles

- **Service Independence**: Each service has its own database and can deploy separately
- **API-First**: Comprehensive OpenAPI specs with interactive documentation
- **Security by Default**: JWT authentication, rate limiting, input validation
- **Developer Experience**: Clear documentation, examples, and error messages
- **Production Ready**: Monitoring, logging, health checks, and graceful degradation

## 🔧 Service Details

### Posts Service (Port 4000)

Your content creation powerhouse:

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `GET /posts` | List all posts with filtering | Optional |
| `POST /posts` | Create new post | Yes |
| `GET /posts/{id}` | Get specific post | Optional |
| `PUT /posts/{id}` | Update post (own posts only) | Yes |
| `DELETE /posts/{id}` | Delete post (own posts only) | Yes |
| `GET /posts/search` | Full-text search | Optional |

**Key Features:**
- Rich tagging system (max 5 tags per post)
- Draft/Published/Archived status workflow
- Automatic excerpt generation
- Role-based permissions (user/moderator/admin)
- Comprehensive content validation

### Comments Service (Port 4001)

Engaging threaded discussions:

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `GET /posts/{postId}/comments` | Get all comments for post | Optional |
| `POST /posts/{postId}/comments` | Create comment or reply | Yes |
| `PUT /comments/{id}` | Edit comment (15min window) | Yes |
| `DELETE /comments/{id}` | Delete comment | Yes |
| `POST /comments/{id}/vote` | Upvote/downvote comment | Yes |

**Key Features:**
- Nested threading (up to 10 levels deep)
- Voting system with abuse protection
- Smart deletion (soft-delete parents with replies)
- Content moderation with automatic filtering
- Real-time updates via WebSocket

### Auth Service (Port 4002)

Enterprise-grade security:

| Endpoint | Purpose | Rate Limited |
|----------|---------|--------------|
| `POST /auth/register` | Create account | 3/hour |
| `POST /auth/login` | Authenticate user | 5/15min |
| `POST /auth/refresh` | Renew access token | 10/min |
| `POST /auth/logout` | Invalidate tokens | No |
| `GET /auth/oauth/{provider}` | OAuth login (Google/GitHub/Discord) | No |

**Key Features:**
- JWT with automatic refresh rotation
- OAuth 2.0 integration (Google, GitHub, Discord)
- Advanced password requirements and breach checking
- Account lockout and suspicious activity detection
- Session management across multiple devices

## 🛡️ Security Features

We take security seriously with multiple layers of protection:

### Authentication & Authorization
- **JWT Tokens**: RS256 signed, 15-minute expiry with automatic refresh
- **Role-Based Access**: User/Moderator/Admin with granular permissions
- **OAuth Integration**: Secure third-party authentication
- **Session Management**: Multi-device support with suspicious activity detection

### Input Protection
- **Comprehensive Validation**: Joi schemas with custom rules
- **SQL Injection Prevention**: Parameterized queries and ORM protection
- **XSS Protection**: Content sanitization and CSP headers
- **Rate Limiting**: Aggressive limits on auth endpoints, progressive delays

### Infrastructure Security
- **HTTPS Enforcement**: TLS 1.3 in production
- **Security Headers**: Helmet.js with CSP, HSTS, and XSS protection
- **CORS Configuration**: Strict origin validation
- **Error Handling**: No information leakage, detailed logging

## 📊 API Usage Examples

### Real-World Scenarios

**Building a Blog Dashboard:**
```javascript
// Get user's draft posts
const drafts = await api.get('/posts?status=draft&author=me');

// Get popular posts with comments
const popular = await api.get('/posts?sort=votes&order=desc&limit=10');

// Get recent activity (comments on user's posts)
const activity = await api.get('/comments/search?authorId=me&limit=20');
```

**Creating a Comment Widget:**
```javascript
// Load threaded comments
const comments = await api.get(`/posts/${postId}/comments?threaded=true&maxDepth=5`);

// Post a reply
const reply = await api.post(`/posts/${postId}/comments`, {
  content: "Great point! I hadn't thought of that.",
  parentId: "parent-comment-id"
});

// Subscribe to real-time updates
websocket.subscribe(`post:${postId}:comments`);
```

**Implementing Content Moderation:**
```javascript
// Get moderation queue
const queue = await api.get('/moderation/comments?status=flagged');

// Take moderation action
await api.post(`/moderation/comments/${commentId}/action`, {
  action: 'approve',
  reason: 'Content reviewed and approved'
});
```

## 🚀 Integration Patterns

### React/Next.js Applications
```javascript
// Custom hook for posts
const { posts, loading, createPost } = usePosts({
  page: 1,
  tags: ['react', 'tutorial']
});

// Real-time comment updates
const { comments } = useRealtimeComments(postId);
```

### Mobile Applications (React Native)
```javascript
// Secure token storage
const tokenManager = new SecureTokenManager();
await tokenManager.storeTokens(accessToken, refreshToken);

// Offline-capable API client
const apiClient = new OfflineApiClient(baseUrl, tokenManager);
```

### Server-Side Integration
```javascript
// API gateway pattern
app.use('/api/posts', createProxy(postsService));
app.use('/api/comments', createProxy(commentsService));
app.use('/api/auth', createProxy(authService));
```

## 📈 Performance & Scaling

### Built for Scale
- **Database Optimization**: Proper indexing, query optimization, connection pooling
- **Caching Strategy**: Redis for sessions, response caching with smart invalidation
- **Rate Limiting**: Distributed rate limiting with Redis backing
- **Pagination**: Cursor-based for large datasets, offset for smaller ones

### Monitoring & Health
- **Health Checks**: `/health` endpoints for all services
- **Metrics**: Prometheus-compatible metrics for requests, errors, performance
- **Logging**: Structured JSON logging with correlation IDs
- **Error Tracking**: Comprehensive error reporting and alerting

## 🔧 Configuration

### Environment Variables

**Posts Service:**
```bash
PORT=4000
DATABASE_URL=postgresql://localhost/posts_db
REDIS_URL=redis://localhost:6379
JWT_PUBLIC_KEY=path/to/public.key
LOG_LEVEL=info
```

**Comments Service:**
```bash
PORT=4001
DATABASE_URL=postgresql://localhost/comments_db
REDIS_URL=redis://localhost:6379
POSTS_SERVICE_URL=http://localhost:4000
WEBSOCKET_PORT=4003
```

**Auth Service:**
```bash
PORT=4002
DATABASE_URL=postgresql://localhost/auth_db
REDIS_URL=redis://localhost:6379
JWT_PRIVATE_KEY=path/to/private.key
JWT_PUBLIC_KEY=path/to/public.key
GOOGLE_CLIENT_ID=your_google_client_id
GITHUB_CLIENT_ID=your_github_client_id
```

### Docker Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  posts-service:
    build: ./posts-service
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/posts
      
  comments-service:
    build: ./comments-service  
    ports: ["4001:4001"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/comments
      
  auth-service:
    build: ./auth-service
    ports: ["4002:4002"]
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/auth
```

## 📚 Documentation Deep Dive

### For Developers
- **[API Overview](./api-overview.md)** - System architecture and design decisions
- **[Posts Service API](./posts-service-api.md)** - Complete LLM-optimized documentation
- **[Comments Service API](./comments-service-api.md)** - Threading, voting, and moderation
- **[Auth Service API](./auth-service-api.md)** - Security patterns and OAuth flows
- **[Integration Guide](./integration-guide.md)** - Client implementation patterns

### Interactive API Documentation
- **Posts Service**: [Swagger UI](http://localhost:4000/docs) | [OpenAPI Spec](./posts-service-openapi.yaml)
- **Comments Service**: [Swagger UI](http://localhost:4001/docs) | [OpenAPI Spec](./comments-service-openapi.yaml)
- **Auth Service**: [Swagger UI](http://localhost:4002/docs) | [OpenAPI Spec](./auth-service-openapi.yaml)

### Testing & Quality
```bash
# Run all tests
npm test

# Integration tests
npm run test:integration

# API contract tests
npm run test:contracts

# Load testing
npm run test:load
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
# Install dependencies
npm install

# Start development services
npm run dev

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### API Changes
1. Update OpenAPI specifications first
2. Implement changes with tests
3. Update LLM-optimized documentation
4. Add integration examples
5. Update this README if needed

### Security Issues
Please report security vulnerabilities privately to security@example.com

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: All endpoints documented with examples
- **Community**: Join our [Discord](https://discord.gg/example) for help
- **Issues**: Report bugs on [GitHub Issues](https://github.com/example/repo/issues)
- **Enterprise**: Contact sales@example.com for enterprise support

---

Built with ❤️ for developers who appreciate good APIs.