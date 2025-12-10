# BlogSpace Next.js Demo

This is a Next.js implementation of the BlogSpace application, showcasing the same microservices-based blog/forum system with modern Next.js patterns.

## Features

- 📝 Create and view blog posts
- 💬 Add and view comments on posts
- 🎨 Beautiful modern UI with gradients and animations
- 📱 Responsive design for mobile and desktop
- ⚡ Next.js 14 with TypeScript support
- 🔄 Real-time API integration with microservices

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: CSS Modules with modern design
- **State Management**: React hooks
- **API**: Axios for HTTP requests
- **UI**: Custom components with gradient styling

## Getting Started

### Prerequisites

Make sure you have Node.js 18+ installed and the backend services running:

- Posts Service on `http://localhost:4000`
- Comments Service on `http://localhost:4001`

### Installation

1. Navigate to the Next.js demo directory:
   ```bash
   cd nextjs-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional):
   ```bash
   cp .env.example .env.local
   # Edit .env.local to customize service URLs if needed
   ```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
nextjs-demo/
├── components/          # React components
│   ├── PostCreate.tsx   # Post creation form
│   ├── PostList.tsx     # Posts display grid
│   ├── CommentCreate.tsx# Comment creation form
│   └── CommentList.tsx  # Comments display
├── hooks/               # Custom React hooks
│   └── useApi.ts        # API state management hooks
├── lib/                 # Utility libraries
│   └── api.ts           # API service functions
├── pages/               # Next.js pages
│   ├── _app.tsx         # App configuration
│   └── index.tsx        # Main page
├── styles/              # CSS styles
│   └── globals.css      # Global styles
└── public/              # Static assets
```

## Environment Variables

- `POSTS_SERVICE_URL`: URL for the posts microservice (default: http://localhost:4000)
- `COMMENTS_SERVICE_URL`: URL for the comments microservice (default: http://localhost:4001)

## API Integration

The demo connects to two microservices:

### Posts Service (`/posts`)
- `GET /posts` - Fetch all posts
- `POST /posts` - Create a new post

### Comments Service (`/posts/:id/comments`)
- `GET /posts/:id/comments` - Fetch comments for a post
- `POST /posts/:id/comments` - Create a new comment

## Key Differences from React Version

1. **Next.js Structure**: Uses pages router and _app.tsx configuration
2. **TypeScript**: Full TypeScript implementation with proper typing
3. **Environment Variables**: Uses Next.js environment variable conventions
4. **Static Generation**: Optimized for Next.js performance patterns
5. **Modern Patterns**: Uses latest React 18 and Next.js 14 features

## Styling

The demo maintains the same beautiful UI as the original React app with:

- Modern gradient backgrounds
- Glassmorphism effects
- Smooth animations and transitions
- Responsive grid layout
- Interactive hover effects

## Troubleshooting

**Services not connecting?**
- Ensure backend services are running on the correct ports
- Check environment variables in `.env.local`
- Verify CORS is properly configured on backend services

**Build errors?**
- Run `npm install` to ensure dependencies are installed
- Check TypeScript compilation with `npm run build`

## Contributing

This demo showcases Next.js patterns for the BlogSpace application. Feel free to extend it with additional Next.js features like:

- Server-side rendering (SSR)
- Static site generation (SSG)
- API routes
- Image optimization
- Advanced routing