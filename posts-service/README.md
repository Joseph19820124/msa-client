# Posts Service API

A production-ready Node.js/Express microservice for managing blog posts and categories with comprehensive features including pagination, search, statistics, and security.

## Features

### Core Functionality
- **Complete CRUD operations** for posts and categories
- **Advanced search** with full-text search capabilities
- **Pagination and filtering** for all list endpoints
- **Post statistics** including views, likes, and engagement metrics
- **Category management** with hierarchical organization
- **SEO optimization** with meta tags and structured data

### Security & Performance
- **Helmet** security headers
- **Rate limiting** with different tiers for read/write operations
- **Input validation** using Joi schemas
- **XSS protection** and sanitization
- **MongoDB injection prevention**
- **CORS configuration** with origin validation
- **Request compression** and optimization

### API Design
- **RESTful endpoints** following industry standards
- **Consistent response format** with proper HTTP status codes
- **Comprehensive error handling** with detailed error messages
- **Health check endpoint** for monitoring
- **Async/await** pattern throughout

## Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# Navigate to the posts-service directory
cd posts-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
nano .env

# Start MongoDB (if not already running)
mongod

# Start the service in development mode
npm run dev

# Or start in production mode
npm start
```

### Environment Variables

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/posts-service

# Security
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Endpoints

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | Get all posts with filtering, search, pagination |
| GET | `/posts/:id` | Get a specific post by ID |
| GET | `/posts/slug/:slug` | Get a post by slug |
| POST | `/posts` | Create a new post |
| PUT | `/posts/:id` | Update a post |
| DELETE | `/posts/:id` | Delete a post |
| GET | `/posts/featured` | Get featured posts |
| GET | `/posts/search` | Search posts |
| GET | `/posts/category/:categoryId` | Get posts by category |
| GET | `/posts/author/:author` | Get posts by author |
| GET | `/posts/tags/:tag` | Get posts by tag |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | Get all categories |
| GET | `/categories/active` | Get active categories only |
| GET | `/categories/:id` | Get category by ID |
| GET | `/categories/slug/:slug` | Get category by slug |
| POST | `/categories` | Create category (admin) |
| PUT | `/categories/:id` | Update category (admin) |
| DELETE | `/categories/:id` | Delete category (admin) |
| GET | `/categories/:id/stats` | Get category statistics |
| PATCH | `/categories/:id/toggle-status` | Toggle category status |

### Statistics & Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/overview` | Get overall blog statistics |
| GET | `/stats/trending` | Get trending posts |
| GET | `/stats/performance` | Get performance analytics |
| GET | `/stats/posts/:id` | Get post statistics |
| POST | `/stats/posts/:id/view` | Increment post views |
| POST | `/stats/posts/:id/like` | Like a post |
| DELETE | `/stats/posts/:id/like` | Unlike a post |

### Query Parameters

#### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

#### Filtering
- `status` - Filter by status (draft, published, archived)
- `category` - Filter by category ID
- `author` - Filter by author name
- `featured` - Filter featured posts (true/false)
- `tags` - Filter by tags
- `search` - Full-text search query

#### Sorting
- `sortBy` - Sort field (createdAt, title, views, likes)
- `sortOrder` - Sort direction (asc, desc)

#### Date Filtering
- `startDate` - Filter posts after date (ISO format)
- `endDate` - Filter posts before date (ISO format)

## Request/Response Examples

### Create a Post

```bash
POST /posts
Content-Type: application/json

{
  "title": "Getting Started with Node.js",
  "content": "Node.js is a powerful runtime for building server-side applications...",
  "author": "John Doe",
  "category": "507f1f77bcf86cd799439011",
  "tags": ["nodejs", "javascript", "backend"],
  "featured": true,
  "seo": {
    "metaTitle": "Learn Node.js - Complete Guide",
    "metaDescription": "Comprehensive guide to getting started with Node.js development",
    "keywords": ["nodejs", "tutorial", "javascript"]
  }
}
```

### Response Format

```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Getting Started with Node.js",
    "slug": "getting-started-with-nodejs",
    "content": "Node.js is a powerful runtime...",
    "excerpt": "Node.js is a powerful runtime for building...",
    "author": "John Doe",
    "category": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Development",
      "slug": "development",
      "color": "#007bff"
    },
    "tags": ["nodejs", "javascript", "backend"],
    "status": "published",
    "featured": true,
    "stats": {
      "views": 0,
      "likes": 0,
      "commentsCount": 0
    },
    "metadata": {
      "wordCount": 150,
      "readTime": 1
    },
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  }
}
```

### Get Posts with Pagination

```bash
GET /posts?page=1&limit=10&category=507f1f77bcf86cd799439012&sortBy=createdAt&sortOrder=desc
```

```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalCount": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

## Data Models

### Post Schema

```javascript
{
  title: String (required, 3-200 chars),
  content: String (required, 10-50000 chars),
  excerpt: String (max 500 chars),
  slug: String (unique, auto-generated),
  author: String (required, 2-100 chars),
  category: ObjectId (required, ref: Category),
  tags: [String] (max 10, each max 30 chars),
  status: String (draft|published|archived),
  featured: Boolean,
  featuredImage: {
    url: String,
    alt: String
  },
  stats: {
    views: Number,
    likes: Number,
    commentsCount: Number
  },
  metadata: {
    wordCount: Number,
    readTime: Number (minutes)
  },
  seo: {
    metaTitle: String (max 60 chars),
    metaDescription: String (max 160 chars),
    keywords: [String]
  },
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Category Schema

```javascript
{
  name: String (required, unique, 2-50 chars),
  slug: String (unique, auto-generated),
  description: String (max 500 chars),
  color: String (hex color, default: #007bff),
  isActive: Boolean (default: true),
  postCount: Number (auto-calculated),
  createdAt: Date,
  updatedAt: Date
}
```

## Development

### Scripts

```bash
npm start          # Start production server
npm run dev        # Start with nodemon for development
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

### Project Structure

```
posts-service/
├── config/           # Configuration files
│   ├── config.js     # Environment configuration
│   └── database.js   # Database connection
├── controllers/      # Business logic
│   ├── postsController.js
│   ├── categoriesController.js
│   └── statsController.js
├── middleware/       # Express middleware
│   ├── errorHandler.js
│   ├── security.js
│   └── validation.js
├── models/           # MongoDB schemas
│   ├── Post.js
│   └── Category.js
├── routes/           # API routes
│   ├── posts.js
│   ├── categories.js
│   └── stats.js
├── utils/            # Utility functions
│   ├── pagination.js
│   └── response.js
└── server.js         # Main application file
```

### Code Quality

- **ESLint** configuration for consistent code style
- **Joi** validation for all inputs
- **Comprehensive error handling** with proper logging
- **Security best practices** throughout
- **Performance optimizations** with database indexing
- **Clean architecture** with separation of concerns

## Security Features

- **Helmet** for security headers
- **Rate limiting** (100 requests per 15 minutes)
- **Input sanitization** against XSS attacks
- **MongoDB injection protection**
- **CORS policy** enforcement
- **Content length validation**
- **Request size limits**

## Production Deployment

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### Environment Considerations

1. **Set strong JWT secret** in production
2. **Configure MongoDB** with authentication
3. **Set up proper CORS** origins
4. **Enable HTTPS** with reverse proxy
5. **Configure logging** for production
6. **Set up monitoring** and health checks

## Monitoring & Health

- Health check endpoint at `/health`
- Comprehensive logging with Morgan
- Memory usage monitoring
- Database connection status
- Graceful shutdown handling

## License

MIT License - see LICENSE file for details