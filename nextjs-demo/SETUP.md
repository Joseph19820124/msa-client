# Next.js Demo Setup Instructions

## Quick Start

1. **Navigate to the demo directory**:
   ```bash
   cd nextjs-demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: [http://localhost:3000](http://localhost:3000)

## Prerequisites

- Node.js 18+ installed
- Backend services running:
  - Posts Service: `http://localhost:4000`
  - Comments Service: `http://localhost:4001`

## Environment Setup

Create `.env.local` file (optional):
```bash
POSTS_SERVICE_URL=http://localhost:4000
COMMENTS_SERVICE_URL=http://localhost:4001
```

## Docker Setup

### Using Docker Compose (Recommended)
```bash
docker-compose up --build
```

### Using Docker directly
```bash
# Build image
docker build -t nextjs-demo .

# Run container
docker run -p 3000:3000 \
  -e POSTS_SERVICE_URL=http://host.docker.internal:4000 \
  -e COMMENTS_SERVICE_URL=http://host.docker.internal:4001 \
  nextjs-demo
```

## Production Build

```bash
npm run build
npm start
```

## Features Included

- ✨ Modern Next.js 14 with TypeScript
- 🎨 Beautiful UI matching original React app
- 📱 Responsive design
- 🔄 Real-time API integration
- 🐳 Docker support
- ⚡ Optimized production builds

## Troubleshooting

**Port 3000 already in use?**
- Change port: `PORT=3001 npm run dev`

**API connection errors?**
- Verify backend services are running
- Check environment variables
- Ensure CORS is configured on backend