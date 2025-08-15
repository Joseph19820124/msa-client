# CLAUDE.md - Backend Services

本文件为 Claude Code (claude.ai/code) 在后端服务目录中工作时提供指导。

## 架构概览

这是一个基于微服务架构的博客/论坛系统的后端服务集合。系统采用容器化部署，每个服务都有独立的 Dockerfile 和健康检查机制。

## 服务列表

### 1. API Gateway (端口: 5000)
**位置**: `api-gateway/`
**用途**: 作为系统的入口点，路由请求到相应的微服务
**依赖**:
- Redis (缓存和会话管理)
- Posts Service (端口 4000)
- Comments Service (端口 4001) 
- Auth Service (端口 4002)

**健康检查**:
- HTTP 服务器状态
- Redis 连接
- 下游服务可用性 (Posts, Comments, Auth)

**环境变量**:
- `PORT` - 服务端口 (默认: 5000)
- `REDIS_URL` - Redis 连接地址 (默认: redis://localhost:6379)
- `POSTS_SERVICE_URL` - Posts 服务地址 (默认: http://localhost:4000)
- `COMMENTS_SERVICE_URL` - Comments 服务地址 (默认: http://localhost:4001)
- `AUTH_SERVICE_URL` - Auth 服务地址 (默认: http://localhost:4002)

### 2. Auth Service (端口: 4002)
**位置**: `auth-service/`
**用途**: 处理用户认证、授权和用户管理
**依赖**:
- MongoDB (auth_db 数据库)
- Redis (令牌缓存和会话管理)

**健康检查**:
- HTTP 服务器状态
- MongoDB 连接和 users 集合访问
- Redis 连接和基本操作

**环境变量**:
- `PORT` - 服务端口 (默认: 4002)
- `MONGODB_URI` - MongoDB 连接字符串 (默认: mongodb://localhost:27017/auth_db)
- `REDIS_URL` - Redis 连接地址 (默认: redis://localhost:6379)

### 3. Posts Service (端口: 4000)
**位置**: `posts-service/`
**用途**: 管理博客帖子的创建、检索、更新和删除
**依赖**:
- MongoDB (posts_db 数据库)
- Redis (缓存)

**特殊功能**:
- 支持文件上传 (uploads 目录)
- 帖子内容管理

**健康检查**:
- HTTP 服务器状态
- MongoDB 连接和 posts 集合访问
- Redis 连接和基本操作

**环境变量**:
- `PORT` - 服务端口 (默认: 4000)
- `MONGODB_URI` - MongoDB 连接字符串 (默认: mongodb://localhost:27017/posts_db)
- `REDIS_URL` - Redis 连接地址 (默认: redis://localhost:6379)

### 4. Comments Service (端口: 4001)
**位置**: `comments-service/`
**用途**: 管理帖子评论的创建、检索和管理
**依赖**:
- MongoDB (comments_db 数据库)
- Redis (缓存)

**健康检查**:
- HTTP 服务器状态
- MongoDB 连接和 comments 集合访问
- Redis 连接和基本操作

**环境变量**:
- `PORT` - 服务端口 (默认: 4001)
- `MONGODB_URI` - MongoDB 连接字符串 (默认: mongodb://localhost:27017/comments_db)
- `REDIS_URL` - Redis 连接地址 (默认: redis://localhost:6379)

## Docker 配置

### 通用 Docker 特性
所有服务共享以下 Docker 配置模式：

**多阶段构建**:
- `builder` 阶段: 安装依赖并优化
- `production` 阶段: 运行时环境

**安全配置**:
- 使用非 root 用户 (nodeuser:nodejs, UID/GID 1001)
- 最小化的 Alpine Linux 基础镜像
- 安全更新和 dumb-init 进程管理
- 适当的文件权限设置

**健康检查**:
- 30秒间隔检查
- 10秒超时
- 5秒启动延迟
- 3次重试机制
- 使用专用的 healthcheck.js 脚本

### 端口映射
- API Gateway: 5000
- Posts Service: 4000  
- Comments Service: 4001
- Auth Service: 4002

## 开发和部署

### 本地开发
每个服务都需要：
1. Node.js 18+ 环境
2. MongoDB 实例
3. Redis 实例
4. 相应的环境变量配置

### Docker 部署
```bash
# 构建单个服务
cd api-gateway
docker build -t api-gateway .

# 运行服务 (需要外部 MongoDB 和 Redis)
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://mongo:27017/api_db \
  -e REDIS_URL=redis://redis:6379 \
  api-gateway
```

### 服务间通信
- API Gateway 作为所有外部请求的入口点
- 内部服务通过 HTTP 协议相互通信
- Redis 用于跨服务的缓存和会话共享
- 每个服务使用独立的 MongoDB 数据库

## 监控和健康检查

### 健康检查端点
所有服务都提供 `/health` 端点用于健康状态检查。

### 依赖检查
每个服务的健康检查包括：
- HTTP 服务器响应性
- 数据库连接状态
- Redis 连接和基本操作
- (API Gateway) 下游服务可用性

### 故障排除
当健康检查失败时：
1. 检查服务日志
2. 验证环境变量配置
3. 确认外部依赖 (MongoDB, Redis) 可用性
4. 检查网络连接和端口可达性

## 注意事项

- 所有服务都使用相同的 Docker 基础配置，便于维护
- 健康检查脚本提供详细的诊断信息
- 使用 dumb-init 确保正确的信号处理
- 所有服务都配置为非 root 用户运行，增强安全性
- Posts Service 包含额外的 uploads 目录用于文件存储