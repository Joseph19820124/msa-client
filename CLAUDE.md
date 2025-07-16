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
```

## Architecture Overview

This is a React 18 client application for a microservices-based blog/forum system. The app communicates with two separate backend services:

- **Posts Service**: `http://localhost:4000` - Handles post creation and retrieval
- **Comments Service**: `http://localhost:4001` - Manages comments for posts

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

### Service Integration

The app expects these endpoints to be available:

- `GET /posts` - Fetch all posts
- `POST /posts` - Create a new post
- `GET /posts/:id/comments` - Get comments for a post
- `POST /posts/:id/comments` - Add comment to a post

### Testing

This is a Create React App project with Jest and React Testing Library pre-configured. Run tests with `npm test`.