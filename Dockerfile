# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a startup script to handle PORT variable
RUN echo '#!/bin/sh\n\
if [ -n "$PORT" ]; then\n\
  sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/conf.d/default.conf\n\
fi\n\
nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Railway uses PORT environment variable
EXPOSE ${PORT:-80}

# Start nginx with dynamic port
CMD ["/start.sh"]