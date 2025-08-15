# Comments Service

A production-ready Node.js/Express microservice for handling comments in a blog platform. This service provides comprehensive comment management with threading, moderation, anti-spam measures, and security features.

## Features

### Core Comment Operations
- ✅ **CRUD Operations**: Create, read, update, delete comments
- ✅ **Threaded Comments**: Support for nested replies up to 3 levels deep
- ✅ **Comment Statistics**: Engagement metrics and analytics
- ✅ **Edit Window**: 24-hour edit window for comment modifications

### Moderation System
- ✅ **Auto-Moderation**: Automatic content filtering and approval
- ✅ **Manual Review**: Admin dashboard for comment moderation
- ✅ **Bulk Operations**: Moderate multiple comments simultaneously
- ✅ **Report System**: User reporting with priority classification

### Security & Anti-Spam
- ✅ **Content Sanitization**: XSS protection and HTML sanitization
- ✅ **Profanity Filtering**: Automatic profanity detection and filtering
- ✅ **Spam Detection**: Pattern-based spam identification
- ✅ **Rate Limiting**: Adaptive rate limiting per user and action type
- ✅ **IP Tracking**: Track user behavior for spam prevention

### Additional Features
- ✅ **Like System**: Comment engagement tracking
- ✅ **Input Validation**: Comprehensive Joi-based validation
- ✅ **Health Monitoring**: Service health checks and diagnostics
- ✅ **Environment Configuration**: Flexible configuration management

## Installation

1. **Clone and navigate to the service directory:**
   ```bash
   cd comments-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB:**
   ```bash
   # Install MongoDB if not already installed
   brew install mongodb-community
   brew services start mongodb-community
   ```

5. **Run the service:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Comments Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/posts/:post_id/comments` | Get all comments for a post | No |
| `POST` | `/api/v1/posts/:post_id/comments` | Create a new comment | No |
| `GET` | `/api/v1/posts/:post_id/comments/stats` | Get comment statistics | No |
| `PUT` | `/api/v1/comments/:id` | Update a comment | No |
| `DELETE` | `/api/v1/comments/:id` | Delete a comment | No |
| `POST` | `/api/v1/comments/:id/like` | Like a comment | No |
| `POST` | `/api/v1/comments/:id/report` | Report a comment | No |

### Moderation (Admin Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/admin/comments` | Get moderation queue | Moderator |
| `PATCH` | `/api/v1/admin/comments/:id` | Moderate a comment | Moderator |
| `PATCH` | `/api/v1/admin/comments/bulk` | Bulk moderate comments | Moderator |
| `GET` | `/api/v1/admin/reports` | Get reports queue | Moderator |
| `PATCH` | `/api/v1/admin/reports/:id` | Review a report | Moderator |
| `GET` | `/api/v1/admin/stats` | Get detailed statistics | Admin |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/` | Service information |

## Request/Response Examples

### Create Comment
```bash
POST /api/v1/posts/123/comments
Content-Type: application/json

{
  "content": "This is a great blog post!",
  "author": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "parentId": "optional-parent-comment-id"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "_id": "647a1b5c8f9e2d001a1b2c3d",
    "postId": "123",
    "content": "This is a great blog post!",
    "author": {
      "name": "John Doe",
      "email": "john@example.com",
      "ip": "192.168.1.1"
    },
    "status": "approved",
    "likes": 0,
    "reports": 0,
    "depth": 0,
    "createdAt": "2023-06-02T10:00:00.000Z",
    "canEdit": true
  },
  "meta": {
    "requiresModeration": false,
    "autoModerated": true
  }
}
```

### Get Comments (Threaded)
```bash
GET /api/v1/posts/123/comments?page=1&limit=20&sort=createdAt&order=desc
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "647a1b5c8f9e2d001a1b2c3d",
      "content": "This is a parent comment",
      "author": { "name": "John Doe" },
      "likes": 5,
      "createdAt": "2023-06-02T10:00:00.000Z",
      "replies": [
        {
          "_id": "647a1b5c8f9e2d001a1b2c3e",
          "content": "This is a reply",
          "author": { "name": "Jane Smith" },
          "parentId": "647a1b5c8f9e2d001a1b2c3d",
          "depth": 1,
          "createdAt": "2023-06-02T10:05:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4001` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/comments_service` | MongoDB connection string |
| `JWT_SECRET` | `demo-secret` | JWT signing secret |
| `POSTS_SERVICE_URL` | `http://localhost:4000` | Posts service URL |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `MAX_COMMENT_LENGTH` | `1000` | Maximum comment length |
| `MAX_COMMENT_DEPTH` | `3` | Maximum nesting depth |
| `EDIT_WINDOW_HOURS` | `24` | Comment edit window in hours |

### Rate Limiting

| Action | Window | Max Requests |
|--------|--------|--------------|
| General | 15 minutes | 1000 |
| Comments | 5 minutes | 10 |
| Reports | 10 minutes | 5 |
| Likes | 1 minute | 30 |
| Admin | 1 minute | 100 |

## Security Features

### Content Protection
- **XSS Prevention**: HTML sanitization using DOMPurify
- **SQL Injection**: MongoDB sanitization middleware
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Per-IP and per-action rate limiting

### Anti-Spam Measures
- **Pattern Detection**: URL, email, phone number detection
- **Profanity Filtering**: Bad words filtering with custom lists
- **Behavioral Analysis**: Suspicious activity tracking
- **Duplicate Prevention**: Duplicate content detection

### Moderation Features
- **Auto-Flagging**: Automatic content flagging based on rules
- **Risk Scoring**: Content risk assessment algorithm
- **Report Classification**: Priority-based report handling
- **Bulk Operations**: Efficient moderation workflows

## Database Schema

### Comment Model
```javascript
{
  postId: String,           // Associated post ID
  content: String,          // Comment text (max 1000 chars)
  author: {
    name: String,           // Author name
    email: String,          // Author email
    ip: String             // Author IP address
  },
  parentId: ObjectId,       // Parent comment for threading
  depth: Number,            // Nesting level (0-3)
  status: String,           // pending|approved|rejected|flagged
  likes: Number,            // Like count
  reports: Number,          // Report count
  flags: {
    hasProfanity: Boolean,
    isSpam: Boolean,
    containsLinks: Boolean
  },
  isEdited: Boolean,
  editWindow: Date,         // Edit deadline
  createdAt: Date,
  updatedAt: Date
}
```

### Report Model
```javascript
{
  commentId: ObjectId,      // Reported comment
  postId: String,           // Associated post
  reason: String,           // Report reason
  description: String,      // Additional details
  reporter: {
    ip: String,
    userAgent: String,
    fingerprint: String
  },
  status: String,           // pending|reviewed|resolved|dismissed
  priority: String,         // low|medium|high|critical
  reviewedBy: String,       // Moderator ID
  actionTaken: String,      // Action performed
  createdAt: Date
}
```

## Testing

### Run API Tests
```bash
node test-api.js
```

### Test Coverage
- ✅ Health checks
- ✅ CRUD operations
- ✅ Validation errors
- ✅ Rate limiting
- ✅ Authentication
- ✅ Error handling

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4001
CMD ["npm", "start"]
```

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
MONGODB_URI=mongodb://mongo-cluster/comments_service
JWT_SECRET=your-super-secure-secret
CORS_ORIGINS=https://yourdomain.com
TRUST_PROXY=true
```

## Monitoring

### Health Check
```bash
curl http://localhost:4001/health
```

### Metrics Available
- Database connectivity
- Response times
- Error rates
- Moderation queue size
- Memory usage
- Uptime statistics

## Integration

### With Posts Service
The Comments Service validates post existence by calling the Posts Service API:
```javascript
const response = await axios.get(`${POSTS_SERVICE_URL}/posts/${postId}`);
```

### With Client Application
The React client can integrate using the provided API endpoints:
```javascript
// Get comments
const comments = await fetch(`/api/v1/posts/${postId}/comments`);

// Create comment
const newComment = await fetch(`/api/v1/posts/${postId}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(commentData)
});
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure security best practices

## License

ISC License - See package.json for details