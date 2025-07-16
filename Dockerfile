# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Accept build arguments for API URLs
ARG REACT_APP_POSTS_SERVICE_URL
ARG REACT_APP_COMMENTS_SERVICE_URL

# Set environment variables from build args
ENV REACT_APP_POSTS_SERVICE_URL=${REACT_APP_POSTS_SERVICE_URL}
ENV REACT_APP_COMMENTS_SERVICE_URL=${REACT_APP_COMMENTS_SERVICE_URL}

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

# Copy simple nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.original

# Create start script to handle PORT
RUN printf '#!/bin/sh\n\
if [ -n "$PORT" ]; then\n\
  sed -i "s/listen 8080;/listen ${PORT};/g" /etc/nginx/conf.d/default.conf\n\
  sed -i "s/listen \\[::\\]:8080;/listen \\[::\\]:${PORT};/g" /etc/nginx/conf.d/default.conf\n\
fi\n\
exec nginx -g "daemon off;"\n' > /start.sh && chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]