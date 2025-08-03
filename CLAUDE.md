# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Run tests in watch mode
npm test

# Build for production
npm run build

# Serve production build locally (requires PORT env var)
PORT=3000 npm run start:prod
```

## Architecture Overview

This is a React 18 client application for a microservices-based blog/forum system. The app communicates with two separate backend services:

- **Posts Service**: `http://localhost:4000` - Handles post creation and retrieval
- **Comments Service**: `http://localhost:4001` - Manages comments for posts

### Environment Configuration

Service URLs can be configured via environment variables:
- `REACT_APP_POSTS_SERVICE_URL` - Posts service URL (defaults to http://localhost:4000)
- `REACT_APP_COMMENTS_SERVICE_URL` - Comments service URL (defaults to http://localhost:4001)

For production builds, these must be set at build time:
```bash
REACT_APP_POSTS_SERVICE_URL=https://api.example.com/posts \
REACT_APP_COMMENTS_SERVICE_URL=https://api.example.com/comments \
npm run build
```

### Component Structure

The application uses a simple, flat component structure in `/src`:

- `App.js` - Root component that renders PostCreate and PostList
- `PostCreate.js` - Form component for creating new posts
- `PostList.js` - Fetches and displays all posts, integrates comment functionality
- `CommentCreate.js` - Form for adding comments to a specific post
- `CommentList.js` - Displays comments for a given post

### Key Patterns

1. **State Management**: Uses local React state with hooks (useState, useEffect)
2. **API Communication**: Axios for HTTP requests to microservices
3. **Styling**: Bootstrap 4.3.1 (loaded via CDN in public/index.html)
4. **No Routing**: Single-page application without client-side routing
5. **Component Design**: Functional components only, no class components
6. **Data Flow**: Unidirectional with props, no global state management

### Service Integration

The app expects these endpoints to be available:

- `GET /posts` - Fetch all posts (returns array of {id, title} objects)
- `POST /posts` - Create a new post (expects {title} in body)
- `GET /posts/:id/comments` - Get comments for a post (returns array of {id, content} objects)
- `POST /posts/:id/comments` - Add comment to a post (expects {content} in body)

### Docker Deployment

The application includes Docker configuration for containerized deployment:

```bash
# Build Docker image
docker build -t client .

# Run with environment variables
docker run -p 8080:80 \
  -e REACT_APP_POSTS_SERVICE_URL=http://posts-service:4000 \
  -e REACT_APP_COMMENTS_SERVICE_URL=http://comments-service:4001 \
  client
```

The Dockerfile uses a multi-stage build with nginx for production serving.

### Testing

This is a Create React App project with Jest and React Testing Library pre-configured. Run tests with `npm test`.

Note: No custom tests currently exist in the codebase. The testing infrastructure is ready but unused.