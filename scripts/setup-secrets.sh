#!/bin/bash

# Docker Secrets Setup Script for Production Deployment
# This script generates secure secrets for all microservices

set -e

# Configuration
SECRETS_DIR="./secrets"
BACKUP_DIR="./secrets/backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    local missing_tools=()
    
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi
    
    if ! command -v pwgen &> /dev/null && ! command -v head &> /dev/null; then
        print_warning "Neither pwgen nor head found, using openssl for password generation"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install missing tools and try again"
        exit 1
    fi
    
    print_info "All dependencies satisfied"
}

# Generate secure random password
generate_password() {
    local length=${1:-32}
    
    if command -v pwgen &> /dev/null; then
        pwgen -s $length 1
    elif command -v openssl &> /dev/null; then
        openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
    else
        # Fallback using /dev/urandom
        LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c $length
    fi
}

# Generate JWT secret
generate_jwt_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Create secrets directory
create_secrets_directory() {
    print_step "Creating secrets directory structure..."
    
    mkdir -p "$SECRETS_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Set restrictive permissions
    chmod 700 "$SECRETS_DIR"
    chmod 700 "$BACKUP_DIR"
    
    print_info "Secrets directory created with secure permissions"
}

# Backup existing secrets
backup_existing_secrets() {
    if [ -d "$SECRETS_DIR" ] && [ "$(ls -A $SECRETS_DIR)" ]; then
        print_step "Backing up existing secrets..."
        
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        local backup_file="$BACKUP_DIR/secrets_backup_$timestamp.tar.gz"
        
        tar -czf "$backup_file" -C "$SECRETS_DIR" --exclude="backup" .
        chmod 600 "$backup_file"
        
        print_info "Existing secrets backed up to: $backup_file"
    fi
}

# Generate MongoDB secrets
generate_mongodb_secrets() {
    print_step "Generating MongoDB secrets..."
    
    # MongoDB root credentials
    echo "root" > "$SECRETS_DIR/mongodb_root_username.txt"
    generate_password 32 > "$SECRETS_DIR/mongodb_root_password.txt"
    
    # MongoDB URI with credentials
    local mongodb_password=$(cat "$SECRETS_DIR/mongodb_root_password.txt")
    echo "mongodb://root:${mongodb_password}@mongodb:27017/admin?authSource=admin" > "$SECRETS_DIR/mongodb_uri.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR"/mongodb_*.txt
    
    print_info "MongoDB secrets generated"
}

# Generate Redis secrets
generate_redis_secrets() {
    print_step "Generating Redis secrets..."
    
    # Redis password
    generate_password 32 > "$SECRETS_DIR/redis_password.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR/redis_password.txt"
    
    print_info "Redis secrets generated"
}

# Generate JWT secrets
generate_jwt_secrets() {
    print_step "Generating JWT secrets..."
    
    # JWT signing secret
    generate_jwt_secret 64 > "$SECRETS_DIR/jwt_secret.txt"
    
    # Refresh token secret
    generate_jwt_secret 64 > "$SECRETS_DIR/refresh_token_secret.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR"/jwt_*.txt
    chmod 600 "$SECRETS_DIR"/refresh_*.txt
    
    print_info "JWT secrets generated"
}

# Generate application secrets
generate_app_secrets() {
    print_step "Generating application secrets..."
    
    # Session secret
    generate_password 64 > "$SECRETS_DIR/session_secret.txt"
    
    # Encryption key for sensitive data
    generate_password 32 > "$SECRETS_DIR/encryption_key.txt"
    
    # API keys for external services
    generate_password 32 > "$SECRETS_DIR/api_key_posts.txt"
    generate_password 32 > "$SECRETS_DIR/api_key_comments.txt"
    generate_password 32 > "$SECRETS_DIR/api_key_auth.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR"/session_*.txt
    chmod 600 "$SECRETS_DIR"/encryption_*.txt
    chmod 600 "$SECRETS_DIR"/api_key_*.txt
    
    print_info "Application secrets generated"
}

# Generate monitoring secrets
generate_monitoring_secrets() {
    print_step "Generating monitoring secrets..."
    
    # Grafana admin password
    generate_password 24 > "$SECRETS_DIR/grafana_admin_password.txt"
    
    # Prometheus basic auth (if needed)
    echo "admin" > "$SECRETS_DIR/prometheus_username.txt"
    generate_password 24 > "$SECRETS_DIR/prometheus_password.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR"/grafana_*.txt
    chmod 600 "$SECRETS_DIR"/prometheus_*.txt
    
    print_info "Monitoring secrets generated"
}

# Generate OAuth secrets (placeholder)
generate_oauth_secrets() {
    print_step "Generating OAuth placeholders..."
    
    # Google OAuth
    echo "your-google-client-id" > "$SECRETS_DIR/google_client_id.txt"
    echo "your-google-client-secret" > "$SECRETS_DIR/google_client_secret.txt"
    
    # GitHub OAuth
    echo "your-github-client-id" > "$SECRETS_DIR/github_client_id.txt"
    echo "your-github-client-secret" > "$SECRETS_DIR/github_client_secret.txt"
    
    # Facebook OAuth
    echo "your-facebook-app-id" > "$SECRETS_DIR/facebook_app_id.txt"
    echo "your-facebook-app-secret" > "$SECRETS_DIR/facebook_app_secret.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR"/*_client_*.txt
    chmod 600 "$SECRETS_DIR"/*_app_*.txt
    
    print_warning "OAuth secrets are placeholders - update with real values"
}

# Generate email service secrets
generate_email_secrets() {
    print_step "Generating email service secrets..."
    
    # SMTP credentials (placeholders)
    echo "your-smtp-username" > "$SECRETS_DIR/smtp_username.txt"
    echo "your-smtp-password" > "$SECRETS_DIR/smtp_password.txt"
    
    # Email encryption key
    generate_password 32 > "$SECRETS_DIR/email_encryption_key.txt"
    
    # Set permissions
    chmod 600 "$SECRETS_DIR"/smtp_*.txt
    chmod 600 "$SECRETS_DIR"/email_*.txt
    
    print_warning "SMTP secrets are placeholders - update with real values"
}

# Create environment files with secrets
create_env_files() {
    print_step "Creating production environment files..."
    
    # Create .env.prod files for each service
    
    # Auth Service
    cat > "./backend-services/auth-service/.env.prod" <<EOF
# Production Environment - Auth Service
NODE_ENV=production
PORT=4002
HOST=0.0.0.0

# Database
MONGODB_URI_FILE=/run/secrets/mongodb_uri
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# JWT
JWT_SECRET_FILE=/run/secrets/jwt_secret
REFRESH_TOKEN_SECRET_FILE=/run/secrets/refresh_token_secret

# Security
ENCRYPTION_KEY_FILE=/run/secrets/encryption_key
SESSION_SECRET_FILE=/run/secrets/session_secret

# OAuth (update with real values)
GOOGLE_CLIENT_ID_FILE=/run/secrets/google_client_id
GOOGLE_CLIENT_SECRET_FILE=/run/secrets/google_client_secret
GITHUB_CLIENT_ID_FILE=/run/secrets/github_client_id
GITHUB_CLIENT_SECRET_FILE=/run/secrets/github_client_secret

# Email
SMTP_USERNAME_FILE=/run/secrets/smtp_username
SMTP_PASSWORD_FILE=/run/secrets/smtp_password

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/auth-service.log
EOF

    # Posts Service
    cat > "./backend-services/posts-service/.env.prod" <<EOF
# Production Environment - Posts Service
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
MONGODB_URI_FILE=/run/secrets/mongodb_uri
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# JWT
JWT_SECRET_FILE=/run/secrets/jwt_secret

# Security
ENCRYPTION_KEY_FILE=/run/secrets/encryption_key

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/posts-service.log
EOF

    # Comments Service
    cat > "./backend-services/comments-service/.env.prod" <<EOF
# Production Environment - Comments Service
NODE_ENV=production
PORT=4001
HOST=0.0.0.0

# Database
MONGODB_URI_FILE=/run/secrets/mongodb_uri
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# JWT
JWT_SECRET_FILE=/run/secrets/jwt_secret

# Security
ENCRYPTION_KEY_FILE=/run/secrets/encryption_key

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/comments-service.log
EOF

    # API Gateway
    cat > "./backend-services/api-gateway/.env.prod" <<EOF
# Production Environment - API Gateway
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Redis
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# JWT
JWT_SECRET_FILE=/run/secrets/jwt_secret

# Services
POSTS_SERVICE_URL=http://posts-service:4000
COMMENTS_SERVICE_URL=http://comments-service:4001
AUTH_SERVICE_URL=http://auth-service:4002

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
GLOBAL_RATE_LIMIT_MAX_REQUESTS=1000
API_RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs/api-gateway.log
EOF

    # Set permissions for env files
    chmod 600 ./backend-services/*/.env.prod
    
    print_info "Production environment files created"
}

# Create secrets summary
create_secrets_summary() {
    print_step "Creating secrets summary..."
    
    cat > "$SECRETS_DIR/README.md" <<EOF
# Secrets Management

This directory contains sensitive secrets for the microservices deployment.

## Security Notice
- All files in this directory should have restrictive permissions (600)
- Never commit these files to version control
- Regularly rotate passwords and secrets
- Use environment-specific secrets for different deployments

## Files Overview

### Database Secrets
- \`mongodb_root_username.txt\` - MongoDB root username
- \`mongodb_root_password.txt\` - MongoDB root password
- \`mongodb_uri.txt\` - Complete MongoDB connection string
- \`redis_password.txt\` - Redis authentication password

### Application Secrets
- \`jwt_secret.txt\` - JWT signing secret
- \`refresh_token_secret.txt\` - Refresh token signing secret
- \`session_secret.txt\` - Session encryption secret
- \`encryption_key.txt\` - Application data encryption key

### Service API Keys
- \`api_key_posts.txt\` - Posts service API key
- \`api_key_comments.txt\` - Comments service API key
- \`api_key_auth.txt\` - Auth service API key

### OAuth Secrets (Update Required)
- \`google_client_id.txt\` - Google OAuth client ID
- \`google_client_secret.txt\` - Google OAuth client secret
- \`github_client_id.txt\` - GitHub OAuth client ID
- \`github_client_secret.txt\` - GitHub OAuth client secret
- \`facebook_app_id.txt\` - Facebook app ID
- \`facebook_app_secret.txt\` - Facebook app secret

### Email Service (Update Required)
- \`smtp_username.txt\` - SMTP username
- \`smtp_password.txt\` - SMTP password
- \`email_encryption_key.txt\` - Email encryption key

### Monitoring Secrets
- \`grafana_admin_password.txt\` - Grafana admin password
- \`prometheus_username.txt\` - Prometheus basic auth username
- \`prometheus_password.txt\` - Prometheus basic auth password

## Usage with Docker Secrets

These files are used as Docker secrets in production:

\`\`\`yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  mongodb_uri:
    file: ./secrets/mongodb_uri.txt
\`\`\`

## Backup and Rotation

- Backups are stored in the \`backup/\` subdirectory
- Rotate secrets regularly (every 90 days recommended)
- Update all dependent services when rotating secrets
- Test secret rotation in staging environment first

## Production Setup

1. Update OAuth secrets with real values from providers
2. Configure SMTP credentials for email functionality
3. Set up proper monitoring access credentials
4. Ensure all secrets are backed up securely
5. Document secret rotation procedures

Generated on: $(date)
EOF

    chmod 600 "$SECRETS_DIR/README.md"
    
    print_info "Secrets summary created"
}

# Display summary
display_summary() {
    print_info "Secrets generation completed!"
    echo ""
    echo "Generated secrets:"
    echo "=================="
    ls -la "$SECRETS_DIR"/*.txt | awk '{print $9, $5}' | sort
    echo ""
    print_warning "IMPORTANT NEXT STEPS:"
    echo "1. Update OAuth secrets with real values from providers"
    echo "2. Configure SMTP credentials for email functionality"
    echo "3. Secure backup of all secrets"
    echo "4. Never commit secrets to version control"
    echo "5. Set up secret rotation schedule"
    echo ""
    print_info "Secrets are ready for production deployment"
}

# Main execution
main() {
    print_info "Starting secrets generation for production deployment..."
    echo ""
    
    check_dependencies
    create_secrets_directory
    backup_existing_secrets
    generate_mongodb_secrets
    generate_redis_secrets
    generate_jwt_secrets
    generate_app_secrets
    generate_monitoring_secrets
    generate_oauth_secrets
    generate_email_secrets
    create_env_files
    create_secrets_summary
    display_summary
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Generate secure secrets for microservices deployment"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --backup-only  Only backup existing secrets"
        echo "  --rotate       Rotate existing secrets (creates backup first)"
        echo ""
        exit 0
        ;;
    --backup-only)
        create_secrets_directory
        backup_existing_secrets
        exit 0
        ;;
    --rotate)
        print_warning "This will rotate all secrets and may break existing deployments"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        main
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac