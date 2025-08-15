#!/bin/bash

# Comprehensive Health Check Script for MSA Blog Platform
# This script monitors all services and provides detailed health status

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HEALTH_LOG="$PROJECT_ROOT/health-check.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check configuration
TIMEOUT=10
RETRIES=3
ENVIRONMENT="development"

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

print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "healthy")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "unhealthy")
            echo -e "${RED}✗${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        *)
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Make HTTP request with timeout and retries
make_request() {
    local url=$1
    local timeout=${2:-$TIMEOUT}
    local retries=${3:-$RETRIES}
    
    for i in $(seq 1 $retries); do
        if curl -f -s -k --max-time $timeout "$url" > /dev/null 2>&1; then
            return 0
        fi
        
        if [ $i -lt $retries ]; then
            sleep 2
        fi
    done
    
    return 1
}

# Check Docker service status
check_docker_service() {
    local service_name=$1
    local compose_file=$2
    
    if docker-compose -f "$compose_file" ps "$service_name" | grep -E "(Up|healthy)" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Get service response time
get_response_time() {
    local url=$1
    local response_time
    
    response_time=$(curl -o /dev/null -s -k -w "%{time_total}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "timeout")
    echo "$response_time"
}

# Check individual service health
check_service_health() {
    local service_name=$1
    local port=$2
    local path=${3:-"/health"}
    local protocol=${4:-"http"}
    
    local base_url
    if [ "$ENVIRONMENT" = "development" ]; then
        base_url="$protocol://localhost:$port"
    else
        base_url="$protocol://localhost:$port"
    fi
    
    local url="$base_url$path"
    local response_time
    
    print_info "Checking $service_name..."
    
    # Check if service is running in Docker
    local compose_file="docker-compose.$ENVIRONMENT.yml"
    if ! check_docker_service "$service_name" "$compose_file"; then
        print_status "unhealthy" "$service_name: Service not running in Docker"
        return 1
    fi
    
    # Check HTTP endpoint
    if make_request "$url"; then
        response_time=$(get_response_time "$url")
        if [ "$response_time" != "timeout" ]; then
            local response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "unknown")
            print_status "healthy" "$service_name: HTTP endpoint responding (${response_ms}ms)"
        else
            print_status "healthy" "$service_name: HTTP endpoint responding"
        fi
        return 0
    else
        print_status "unhealthy" "$service_name: HTTP endpoint not responding ($url)"
        return 1
    fi
}

# Check database connectivity
check_database_health() {
    print_info "Checking database services..."
    
    local mongodb_healthy=true
    local redis_healthy=true
    
    # Check MongoDB
    if docker exec msa-mongodb-$ENVIRONMENT mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_status "healthy" "MongoDB: Database responding"
    else
        print_status "unhealthy" "MongoDB: Database not responding"
        mongodb_healthy=false
    fi
    
    # Check Redis
    if docker exec msa-redis-$ENVIRONMENT redis-cli ping > /dev/null 2>&1; then
        print_status "healthy" "Redis: Cache responding"
    else
        print_status "unhealthy" "Redis: Cache not responding"
        redis_healthy=false
    fi
    
    # Check MongoDB collections
    if [ "$mongodb_healthy" = true ]; then
        local collections=("auth_db.users" "posts_db.posts" "comments_db.comments")
        for collection in "${collections[@]}"; do
            IFS='.' read -r db_name coll_name <<< "$collection"
            if docker exec msa-mongodb-$ENVIRONMENT mongosh "$db_name" --eval "db.$coll_name.findOne()" > /dev/null 2>&1; then
                print_status "healthy" "MongoDB: Collection $collection accessible"
            else
                print_status "warning" "MongoDB: Collection $collection may be empty or inaccessible"
            fi
        done
    fi
    
    return 0
}

# Check load balancer health (production only)
check_load_balancer() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Checking load balancer..."
        
        if check_service_health "nginx" "80" "/health" "http"; then
            print_status "healthy" "Nginx: Load balancer responding"
            
            # Check HTTPS redirect
            if make_request "https://localhost/health"; then
                print_status "healthy" "Nginx: HTTPS endpoint responding"
            else
                print_status "warning" "Nginx: HTTPS endpoint not responding"
            fi
        else
            print_status "unhealthy" "Nginx: Load balancer not responding"
            return 1
        fi
    fi
    
    return 0
}

# Check monitoring services
check_monitoring_services() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Checking monitoring services..."
        
        # Check Prometheus
        if make_request "http://localhost:9090/-/healthy"; then
            print_status "healthy" "Prometheus: Metrics collection active"
        else
            print_status "warning" "Prometheus: Not responding"
        fi
        
        # Check Grafana
        if make_request "http://localhost:3001/api/health"; then
            print_status "healthy" "Grafana: Dashboard service active"
        else
            print_status "warning" "Grafana: Not responding"
        fi
        
        # Check Elasticsearch
        if make_request "http://localhost:9200/_cluster/health"; then
            print_status "healthy" "Elasticsearch: Log storage active"
        else
            print_status "warning" "Elasticsearch: Not responding"
        fi
    fi
    
    return 0
}

# Check service dependencies
check_service_dependencies() {
    print_info "Checking service dependencies..."
    
    local services=("auth-service:4002" "posts-service:4000" "comments-service:4001")
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        
        # Check if service can connect to MongoDB
        local mongodb_check=$(docker exec "msa-$service-$ENVIRONMENT" sh -c "curl -f -s --max-time 5 http://mongodb:27017/ || echo 'failed'" 2>/dev/null)
        if [ "$mongodb_check" != "failed" ]; then
            print_status "healthy" "$service: MongoDB connectivity"
        else
            print_status "unhealthy" "$service: Cannot connect to MongoDB"
        fi
        
        # Check if service can connect to Redis
        if docker exec "msa-$service-$ENVIRONMENT" sh -c "nc -z redis 6379" > /dev/null 2>&1; then
            print_status "healthy" "$service: Redis connectivity"
        else
            print_status "unhealthy" "$service: Cannot connect to Redis"
        fi
    done
    
    return 0
}

# Check resource usage
check_resource_usage() {
    print_info "Checking resource usage..."
    
    # Get Docker stats
    local stats_output=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep "msa-")
    
    if [ -n "$stats_output" ]; then
        echo "Container Resource Usage:"
        echo "$stats_output" | while IFS=$'\t' read -r name cpu mem; do
            if [ "$name" != "NAME" ]; then
                # Extract CPU percentage
                local cpu_val=$(echo "$cpu" | sed 's/%//')
                if (( $(echo "$cpu_val > 80" | bc -l) )); then
                    print_status "warning" "$name: High CPU usage ($cpu)"
                else
                    print_status "healthy" "$name: CPU usage ($cpu)"
                fi
                
                print_status "info" "$name: Memory usage ($mem)"
            fi
        done
    fi
    
    return 0
}

# Generate health report
generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "=====================================" >> "$HEALTH_LOG"
    echo "Health Check Report - $timestamp" >> "$HEALTH_LOG"
    echo "Environment: $ENVIRONMENT" >> "$HEALTH_LOG"
    echo "=====================================" >> "$HEALTH_LOG"
    
    # Run all health checks and capture output
    {
        check_database_health
        check_service_health "auth-service" "4002"
        check_service_health "posts-service" "4000"
        check_service_health "comments-service" "4001"
        check_service_health "api-gateway" "5000"
        check_load_balancer
        check_monitoring_services
        check_service_dependencies
        check_resource_usage
    } >> "$HEALTH_LOG" 2>&1
    
    echo "=====================================" >> "$HEALTH_LOG"
    echo "" >> "$HEALTH_LOG"
}

# Main health check function
main_health_check() {
    local exit_code=0
    
    echo "======================================"
    echo "  MSA Blog Platform Health Check"
    echo "======================================"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo ""
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if services are deployed
    local compose_file="docker-compose.$ENVIRONMENT.yml"
    if [ ! -f "$PROJECT_ROOT/$compose_file" ]; then
        print_error "Compose file not found: $compose_file"
        exit 1
    fi
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run health checks
    check_database_health || exit_code=1
    check_service_health "auth-service" "4002" || exit_code=1
    check_service_health "posts-service" "4000" || exit_code=1
    check_service_health "comments-service" "4001" || exit_code=1
    check_service_health "api-gateway" "5000" || exit_code=1
    check_load_balancer || exit_code=1
    check_monitoring_services || exit_code=1
    check_service_dependencies || exit_code=1
    check_resource_usage || exit_code=1
    
    # Generate report if requested
    if [ "$GENERATE_REPORT" = "true" ]; then
        generate_health_report
        print_info "Health report saved to: $HEALTH_LOG"
    fi
    
    echo ""
    if [ $exit_code -eq 0 ]; then
        print_status "healthy" "All services are healthy"
    else
        print_status "unhealthy" "Some services have issues"
    fi
    
    echo "======================================"
    
    return $exit_code
}

# Parse command line arguments
GENERATE_REPORT="false"
WATCH_MODE="false"
WATCH_INTERVAL=30

while [[ $# -gt 0 ]]; do
    case $1 in
        --env|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --report)
            GENERATE_REPORT="true"
            shift
            ;;
        --watch)
            WATCH_MODE="true"
            WATCH_INTERVAL="${2:-30}"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Perform comprehensive health check of MSA Blog Platform"
            echo ""
            echo "Options:"
            echo "  --env, --environment ENV    Target environment (development|production) [default: development]"
            echo "  --timeout SECONDS          HTTP request timeout [default: 10]"
            echo "  --retries COUNT            Number of retries for failed requests [default: 3]"
            echo "  --report                   Generate detailed health report"
            echo "  --watch [INTERVAL]         Watch mode - repeat check every INTERVAL seconds [default: 30]"
            echo "  --help, -h                 Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Basic health check"
            echo "  $0 --env production --report          # Production health check with report"
            echo "  $0 --watch 60                        # Watch mode with 60s interval"
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

# Install bc for calculations if not present
if ! command -v bc &> /dev/null; then
    print_warning "bc not found, some features may be limited"
fi

# Run health check
if [ "$WATCH_MODE" = "true" ]; then
    print_info "Starting watch mode (interval: ${WATCH_INTERVAL}s, press Ctrl+C to stop)"
    while true; do
        clear
        main_health_check
        sleep "$WATCH_INTERVAL"
    done
else
    main_health_check
fi