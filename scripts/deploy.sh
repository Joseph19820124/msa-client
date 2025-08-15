#!/bin/bash

# Comprehensive Deployment Script for MSA Blog Platform
# This script automates the deployment process for both development and production

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize deployment log
init_log() {
    echo "=== MSA Blog Platform Deployment Log ===" > "$LOG_FILE"
    echo "Started: $(date)" >> "$LOG_FILE"
    echo "Environment: $ENVIRONMENT" >> "$LOG_FILE"
    echo "=========================================" >> "$LOG_FILE"
}

# Check if required tools are installed
check_dependencies() {
    print_step "Checking dependencies..."
    
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install missing tools and try again"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_info "All dependencies satisfied"
}

# Validate environment files
validate_environment() {
    print_step "Validating environment configuration..."
    
    local env_files=()
    
    if [ "$ENVIRONMENT" = "development" ]; then
        env_files=(
            ".env"
            "backend-services/auth-service/.env"
            "backend-services/posts-service/.env"
            "backend-services/comments-service/.env"
            "backend-services/api-gateway/.env"
        )
    else
        env_files=(
            "backend-services/auth-service/.env.prod"
            "backend-services/posts-service/.env.prod"
            "backend-services/comments-service/.env.prod"
            "backend-services/api-gateway/.env.prod"
        )
    fi
    
    local missing_files=()
    for env_file in "${env_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$env_file" ]; then
            missing_files+=("$env_file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        print_error "Missing environment files: ${missing_files[*]}"
        print_info "Copy from .env.example files and configure"
        exit 1
    fi
    
    print_info "Environment configuration validated"
}

# Setup secrets for production
setup_production_secrets() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_step "Setting up production secrets..."
        
        if [ ! -d "$PROJECT_ROOT/secrets" ] || [ ! "$(ls -A $PROJECT_ROOT/secrets)" ]; then
            print_info "Running secrets setup script..."
            cd "$PROJECT_ROOT"
            ./scripts/setup-secrets.sh
        else
            print_info "Secrets already exist, skipping generation"
        fi
        
        # Verify critical secrets exist
        local critical_secrets=(
            "jwt_secret.txt"
            "mongodb_root_password.txt"
            "redis_password.txt"
        )
        
        for secret in "${critical_secrets[@]}"; do
            if [ ! -f "$PROJECT_ROOT/secrets/$secret" ]; then
                print_error "Critical secret missing: $secret"
                exit 1
            fi
        done
        
        print_info "Production secrets configured"
    fi
}

# Generate SSL certificates
setup_ssl_certificates() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_step "Setting up SSL certificates..."
        
        if [ ! -f "$PROJECT_ROOT/ssl/certs/server.crt" ] || [ ! -f "$PROJECT_ROOT/ssl/certs/server.key" ]; then
            print_info "Generating SSL certificates..."
            cd "$PROJECT_ROOT"
            ./scripts/generate-ssl-certs.sh ${SSL_DOMAIN:+--domain "$SSL_DOMAIN"}
        else
            print_info "SSL certificates already exist"
        fi
        
        print_info "SSL certificates configured"
    fi
}

# Build Docker images
build_images() {
    print_step "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f docker-compose.dev.yml build --parallel
    else
        # Build production images with version tags
        local version=${VERSION:-latest}
        
        print_info "Building auth-service:$version..."
        docker build -t "msa-auth-service:$version" ./backend-services/auth-service
        
        print_info "Building posts-service:$version..."
        docker build -t "msa-posts-service:$version" ./backend-services/posts-service
        
        print_info "Building comments-service:$version..."
        docker build -t "msa-comments-service:$version" ./backend-services/comments-service
        
        print_info "Building api-gateway:$version..."
        docker build -t "msa-api-gateway:$version" ./backend-services/api-gateway
        
        print_info "Building client:$version..."
        docker build -t "msa-client:$version" .
    fi
    
    print_info "Docker images built successfully"
}

# Start services
start_services() {
    print_step "Starting services..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f docker-compose.dev.yml up -d
    else
        docker-compose -f docker-compose.prod.yml up -d
    fi
    
    print_info "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_step "Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=1
    
    local services=()
    if [ "$ENVIRONMENT" = "development" ]; then
        services=("mongodb" "redis" "auth-service" "posts-service" "comments-service" "api-gateway")
    else
        services=("mongodb" "redis" "auth-service" "posts-service" "comments-service" "api-gateway" "nginx")
    fi
    
    for service in "${services[@]}"; do
        print_info "Waiting for $service to be healthy..."
        attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if [ "$ENVIRONMENT" = "development" ]; then
                if docker-compose -f docker-compose.dev.yml ps | grep "$service" | grep "healthy\|Up" > /dev/null; then
                    break
                fi
            else
                if docker-compose -f docker-compose.prod.yml ps | grep "$service" | grep "healthy\|Up" > /dev/null; then
                    break
                fi
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                print_error "$service failed to become healthy within $(($max_attempts * 5)) seconds"
                show_service_logs "$service"
                exit 1
            fi
            
            sleep 5
            ((attempt++))
        done
        
        print_info "$service is healthy"
    done
    
    print_info "All services are healthy"
}

# Show service logs for debugging
show_service_logs() {
    local service=$1
    print_info "Showing logs for $service:"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f docker-compose.dev.yml logs --tail=20 "$service"
    else
        docker-compose -f docker-compose.prod.yml logs --tail=20 "$service"
    fi
}

# Test endpoints
test_endpoints() {
    print_step "Testing service endpoints..."
    
    local base_url
    if [ "$ENVIRONMENT" = "development" ]; then
        base_url="http://localhost"
    else
        base_url="https://${SSL_DOMAIN:-localhost}"
    fi
    
    local endpoints=(
        "$base_url:5000/health|API Gateway"
        "$base_url:4000/health|Posts Service"
        "$base_url:4001/health|Comments Service"
        "$base_url:4002/health|Auth Service"
    )
    
    if [ "$ENVIRONMENT" = "production" ]; then
        endpoints+=(
            "$base_url/health|Nginx Load Balancer"
            "$base_url/api/health|API via Nginx"
        )
    fi
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS='|' read -r endpoint name <<< "$endpoint_info"
        
        print_info "Testing $name: $endpoint"
        
        if curl -f -s -k "$endpoint" > /dev/null; then
            print_success "$name is responding"
        else
            print_warning "$name is not responding (this may be normal if service is still starting)"
        fi
    done
    
    print_info "Endpoint testing completed"
}

# Display deployment summary
show_deployment_summary() {
    print_step "Deployment Summary"
    
    echo ""
    echo "======================================"
    echo "  MSA Blog Platform Deployment"
    echo "======================================"
    echo "Environment: $ENVIRONMENT"
    echo "Started: $(date)"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        echo ""
        echo "Application URLs:"
        echo "  Frontend:        http://localhost:3000"
        echo "  API Gateway:     http://localhost:5000"
        echo "  Posts Service:   http://localhost:4000"
        echo "  Comments Service: http://localhost:4001"
        echo "  Auth Service:    http://localhost:4002"
        echo ""
        echo "Development Tools:"
        echo "  MongoDB Admin:   http://localhost:8081 (admin/admin123)"
        echo "  Redis Commander: http://localhost:8082"
    else
        echo ""
        echo "Application URLs:"
        echo "  Frontend:        https://${SSL_DOMAIN:-yourdomain.com}"
        echo "  API:            https://${SSL_DOMAIN:-yourdomain.com}/api"
        echo ""
        echo "Monitoring URLs:"
        echo "  Grafana:        http://localhost:3001"
        echo "  Prometheus:     http://localhost:9090"
        echo "  Kibana:         http://localhost:5601"
    fi
    
    echo ""
    echo "Commands:"
    echo "  View logs:      docker-compose -f docker-compose.$ENVIRONMENT.yml logs -f"
    echo "  Stop services:  docker-compose -f docker-compose.$ENVIRONMENT.yml down"
    echo "  Restart:        docker-compose -f docker-compose.$ENVIRONMENT.yml restart"
    echo ""
    echo "======================================"
}

# Cleanup on failure
cleanup_on_failure() {
    print_error "Deployment failed. Cleaning up..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker-compose -f docker-compose.prod.yml down
    fi
    
    print_info "Cleanup completed"
}

# Main deployment function
deploy() {
    print_info "Starting MSA Blog Platform deployment..."
    print_info "Environment: $ENVIRONMENT"
    
    # Set up error handling
    trap cleanup_on_failure ERR
    
    check_dependencies
    validate_environment
    setup_production_secrets
    setup_ssl_certificates
    build_images
    start_services
    wait_for_services
    test_endpoints
    show_deployment_summary
    
    print_success "Deployment completed successfully!"
}

# Parse command line arguments
ENVIRONMENT="development"
SSL_DOMAIN=""
VERSION="latest"
SKIP_BUILD="false"
FORCE="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --env|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --domain)
            SSL_DOMAIN="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --force)
            FORCE="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Deploy MSA Blog Platform microservices"
            echo ""
            echo "Options:"
            echo "  --env, --environment ENV    Deployment environment (development|production) [default: development]"
            echo "  --domain DOMAIN             SSL domain for production deployment"
            echo "  --version VERSION           Docker image version tag [default: latest]"
            echo "  --skip-build               Skip Docker image building"
            echo "  --force                    Force deployment without confirmation"
            echo "  --help, -h                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Development deployment"
            echo "  $0 --env production --domain app.com # Production deployment"
            echo "  $0 --env development --skip-build    # Skip building images"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate environment
if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_info "Valid environments: development, production"
    exit 1
fi

# Production deployment confirmation
if [ "$ENVIRONMENT" = "production" ] && [ "$FORCE" != "true" ]; then
    print_warning "You are about to deploy to PRODUCTION environment"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
fi

# Change to project root
cd "$PROJECT_ROOT"

# Initialize log and run deployment
init_log
deploy