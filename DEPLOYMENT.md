# Microservices Deployment Guide

This guide provides comprehensive instructions for deploying the MSA Blog Platform microservices system in both development and production environments.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Development Deployment](#development-deployment)
4. [Production Deployment](#production-deployment)
5. [Security Configuration](#security-configuration)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

## 🏗️ Architecture Overview

The MSA Blog Platform consists of the following services:

### Core Services
- **Client (React)**: Frontend application (Port 3000)
- **API Gateway**: Request routing and load balancing (Port 5000)
- **Auth Service**: Authentication and authorization (Port 4002)
- **Posts Service**: Blog post management (Port 4000)
- **Comments Service**: Comment management (Port 4001)

### Infrastructure Services
- **MongoDB**: Primary database (Port 27017)
- **Redis**: Caching and session storage (Port 6379)
- **Nginx**: Load balancer and reverse proxy (Ports 80/443)

### Monitoring Stack
- **Prometheus**: Metrics collection (Port 9090)
- **Grafana**: Dashboards and visualization (Port 3001)
- **Elasticsearch**: Log storage (Port 9200)
- **Logstash**: Log processing (Port 5044)
- **Kibana**: Log visualization (Port 5601)

## 🔧 Prerequisites

### Development Environment
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- Git
- 8GB+ RAM recommended

### Production Environment
- Docker Engine 20.10+
- Docker Compose 2.0+ or Docker Swarm
- SSL certificates (Let's Encrypt recommended)
- Domain name with DNS configuration
- 16GB+ RAM recommended
- 100GB+ storage

### Required Tools
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## 🚀 Development Deployment

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd msa-client
   ```

2. **Set up environment files**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp backend-services/auth-service/.env.example backend-services/auth-service/.env
   cp backend-services/posts-service/.env.example backend-services/posts-service/.env
   cp backend-services/comments-service/.env.example backend-services/comments-service/.env
   cp backend-services/api-gateway/.env.example backend-services/api-gateway/.env
   ```

3. **Start development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Verify deployment**
   ```bash
   # Check all services are running
   docker-compose -f docker-compose.dev.yml ps
   
   # Check service health
   curl http://localhost:5000/health  # API Gateway
   curl http://localhost:4000/health  # Posts Service
   curl http://localhost:4001/health  # Comments Service
   curl http://localhost:4002/health  # Auth Service
   ```

5. **Access applications**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:5000
   - MongoDB Admin: http://localhost:8081 (admin/admin123)
   - Redis Commander: http://localhost:8082

### Development Services Management

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start specific service
docker-compose -f docker-compose.dev.yml up -d posts-service

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f auth-service

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Rebuild services
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Database Initialization

The development environment automatically:
- Creates databases for each service
- Sets up indexes and collections
- Inserts seed data for testing

Access MongoDB directly:
```bash
docker exec -it msa-mongodb-dev mongosh -u root -p rootpassword
```

## 🏭 Production Deployment

### Step 1: Server Preparation

1. **Update system and install dependencies**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   ```

2. **Configure firewall**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

### Step 2: SSL Certificate Setup

1. **Generate development certificates (for testing)**
   ```bash
   chmod +x scripts/generate-ssl-certs.sh
   ./scripts/generate-ssl-certs.sh --domain yourdomain.com
   ```

2. **For production, use Let's Encrypt**
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Copy certificates to project directory
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/certs/server.crt
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/certs/server.key
   sudo chown $USER:$USER ssl/certs/*
   ```

### Step 3: Secrets Management

1. **Generate production secrets**
   ```bash
   chmod +x scripts/setup-secrets.sh
   ./scripts/setup-secrets.sh
   ```

2. **Update OAuth and SMTP secrets**
   ```bash
   # Edit secrets with real values
   echo "your-actual-google-client-id" > secrets/google_client_id.txt
   echo "your-actual-google-client-secret" > secrets/google_client_secret.txt
   echo "your-smtp-username" > secrets/smtp_username.txt
   echo "your-smtp-password" > secrets/smtp_password.txt
   ```

### Step 4: Production Configuration

1. **Update environment variables**
   ```bash
   # Edit production environment files
   nano backend-services/auth-service/.env.prod
   nano backend-services/posts-service/.env.prod
   nano backend-services/comments-service/.env.prod
   nano backend-services/api-gateway/.env.prod
   ```

2. **Update Nginx configuration**
   ```bash
   # Edit nginx.conf to match your domain
   sed -i 's/yourdomain\.com/your-actual-domain.com/g' config/nginx/nginx.conf
   ```

3. **Build production images**
   ```bash
   # Build all service images
   docker build -t msa-auth-service:latest ./backend-services/auth-service
   docker build -t msa-posts-service:latest ./backend-services/posts-service
   docker build -t msa-comments-service:latest ./backend-services/comments-service
   docker build -t msa-api-gateway:latest ./backend-services/api-gateway
   docker build -t msa-client:latest .
   ```

### Step 5: Deploy Production Stack

1. **Start production services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Verify deployment**
   ```bash
   # Check all services are healthy
   docker-compose -f docker-compose.prod.yml ps
   
   # Test endpoints
   curl -k https://yourdomain.com/health
   curl -k https://yourdomain.com/api/health
   ```

3. **Access monitoring dashboards**
   - Grafana: http://localhost:3001 (admin/[generated-password])
   - Prometheus: http://localhost:9090
   - Kibana: http://localhost:5601

## 🔒 Security Configuration

### Environment Security

1. **Secure file permissions**
   ```bash
   chmod 700 secrets/
   chmod 600 secrets/*.txt
   chmod 600 backend-services/*/.env.prod
   ```

2. **Configure firewalls**
   ```bash
   # Only allow necessary ports
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw deny 27017     # Block direct MongoDB access
   sudo ufw deny 6379      # Block direct Redis access
   ```

### Application Security

1. **JWT Token Security**
   - Tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Secure HTTP-only cookies for refresh tokens

2. **Rate Limiting**
   - Global: 1000 requests/15min
   - API endpoints: 100 requests/15min
   - Auth endpoints: 5 requests/15min

3. **CORS Configuration**
   ```javascript
   // Update in production
   CORS_ORIGIN=https://yourdomain.com
   ```

### Database Security

1. **MongoDB Security**
   - Authentication enabled
   - Role-based access control
   - Network encryption
   - Regular backups

2. **Redis Security**
   - Password authentication
   - Disable dangerous commands
   - Memory encryption

## 📊 Monitoring & Logging

### Metrics Collection

Prometheus collects metrics from:
- Application services (custom metrics)
- System metrics (node-exporter)
- Container metrics (cAdvisor)
- Database metrics (MongoDB/Redis exporters)

### Logging Strategy

1. **Structured Logging**
   - JSON format for all services
   - Centralized via Logstash
   - Stored in Elasticsearch

2. **Log Levels**
   - Production: `info` and above
   - Development: `debug` and above

3. **Log Retention**
   - Application logs: 30 days
   - Error logs: 90 days
   - Audit logs: 1 year

### Alerting Rules

Key alerts configured:
- Service downtime
- High error rates (>5%)
- High latency (>1s for 95th percentile)
- Resource usage (CPU >80%, Memory >85%)
- Security events (failed logins, suspicious activity)

## 🔧 Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check service logs
   docker-compose logs [service-name]
   
   # Check service dependencies
   docker-compose ps
   
   # Restart specific service
   docker-compose restart [service-name]
   ```

2. **Database connection issues**
   ```bash
   # Test MongoDB connection
   docker exec -it mongodb mongosh -u root -p [password]
   
   # Test Redis connection
   docker exec -it redis redis-cli -a [password] ping
   ```

3. **SSL certificate issues**
   ```bash
   # Verify certificate
   openssl x509 -in ssl/certs/server.crt -text -noout
   
   # Test SSL connection
   openssl s_client -connect yourdomain.com:443
   ```

4. **High memory usage**
   ```bash
   # Check container resource usage
   docker stats
   
   # Restart services if needed
   docker-compose restart
   ```

### Performance Optimization

1. **Database Optimization**
   ```bash
   # MongoDB indexes
   docker exec mongodb mongosh --eval "db.posts.getIndexes()"
   
   # Redis memory usage
   docker exec redis redis-cli info memory
   ```

2. **Container Resource Limits**
   ```yaml
   # In docker-compose.prod.yml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

### Health Checks

All services include health check endpoints:
- `/health` - Basic service health
- `/ready` - Service readiness (includes dependencies)
- `/metrics` - Prometheus metrics

## 🔄 Maintenance

### Regular Tasks

1. **Daily**
   - Monitor service health
   - Check error logs
   - Verify backup completion

2. **Weekly**
   - Review performance metrics
   - Check disk usage
   - Update security patches

3. **Monthly**
   - Rotate secrets
   - Clean old logs
   - Review and update documentation

### Backup Procedures

1. **Database Backups**
   ```bash
   # MongoDB backup
   docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)
   
   # Redis backup
   docker exec redis redis-cli BGSAVE
   ```

2. **Configuration Backups**
   ```bash
   # Backup configurations
   tar -czf config-backup-$(date +%Y%m%d).tar.gz \
     secrets/ config/ backend-services/*/\.env.prod
   ```

### Updates and Scaling

1. **Service Updates**
   ```bash
   # Build new image
   docker build -t service:new-version .
   
   # Rolling update
   docker service update --image service:new-version service-name
   ```

2. **Horizontal Scaling**
   ```bash
   # Scale API Gateway
   docker-compose up -d --scale api-gateway=3
   ```

### Disaster Recovery

1. **Service Recovery**
   ```bash
   # Stop all services
   docker-compose down
   
   # Restore from backup
   tar -xzf backup.tar.gz
   
   # Restart services
   docker-compose up -d
   ```

2. **Database Recovery**
   ```bash
   # Restore MongoDB
   docker exec mongodb mongorestore /backup/latest/
   
   # Restore Redis
   docker exec redis redis-cli FLUSHALL
   docker exec redis redis-cli --rdb /backup/dump.rdb
   ```

## 📞 Support

### Monitoring URLs
- **Health Status**: https://yourdomain.com/health
- **API Documentation**: https://yourdomain.com/api/docs
- **Grafana Dashboards**: http://monitoring.yourdomain.com:3001
- **Log Analysis**: http://logs.yourdomain.com:5601

### Emergency Contacts
- System Administrator: admin@yourdomain.com
- DevOps Team: devops@yourdomain.com
- Security Team: security@yourdomain.com

### Documentation Links
- [API Documentation](./API.md)
- [Security Guidelines](./SECURITY.md)
- [Development Guide](./DEVELOPMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Environment**: Production Ready