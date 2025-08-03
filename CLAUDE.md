# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器 (运行在 http://localhost:3000)
npm start

# 以监视模式运行测试
npm test

# 构建生产版本
npm run build

# 本地运行生产构建 (需要 PORT 环境变量)
PORT=3000 npm run start:prod
```

## 架构概览

这是一个基于微服务的博客/论坛系统的 React 18 客户端应用程序。该应用与两个独立的后端服务通信：

- **Posts Service**: `http://localhost:4000` - 处理帖子创建和检索
- **Comments Service**: `http://localhost:4001` - 管理帖子评论

### 环境配置

服务 URL 可以通过环境变量配置：
- `REACT_APP_POSTS_SERVICE_URL` - Posts 服务 URL (默认为 http://localhost:4000)
- `REACT_APP_COMMENTS_SERVICE_URL` - Comments 服务 URL (默认为 http://localhost:4001)

对于生产构建，这些必须在构建时设置：
```bash
REACT_APP_POSTS_SERVICE_URL=https://api.example.com/posts \
REACT_APP_COMMENTS_SERVICE_URL=https://api.example.com/comments \
npm run build
```

### 组件结构

应用程序在 `/src` 中使用简单、扁平的组件结构：

- `App.js` - 渲染 PostCreate 和 PostList 的根组件
- `PostCreate.js` - 用于创建新帖子的表单组件
- `PostList.js` - 获取并显示所有帖子，集成评论功能
- `CommentCreate.js` - 为特定帖子添加评论的表单
- `CommentList.js` - 显示给定帖子的评论

### 关键模式

1. **状态管理**: 使用 React hooks 的本地状态 (useState, useEffect)
2. **API 通信**: 使用 Axios 进行微服务的 HTTP 请求
3. **样式**: Bootstrap 4.3.1 (通过 public/index.html 中的 CDN 加载)
4. **无路由**: 无客户端路由的单页应用程序
5. **组件设计**: 仅使用函数组件，不使用类组件
6. **数据流**: 使用 props 的单向数据流，无全局状态管理

### 服务集成

应用程序期望这些端点可用：

- `GET /posts` - 获取所有帖子 (返回 {id, title} 对象数组)
- `POST /posts` - 创建新帖子 (在请求体中期望 {title})
- `GET /posts/:id/comments` - 获取帖子的评论 (返回 {id, content} 对象数组)
- `POST /posts/:id/comments` - 为帖子添加评论 (在请求体中期望 {content})

### Docker 部署

应用程序包含用于容器化部署的 Docker 配置：

```bash
# 构建 Docker 镜像
docker build -t client .

# 使用环境变量运行
docker run -p 8080:80 \
  -e REACT_APP_POSTS_SERVICE_URL=http://posts-service:4000 \
  -e REACT_APP_COMMENTS_SERVICE_URL=http://comments-service:4001 \
  client
```

Dockerfile 使用多阶段构建和 nginx 进行生产服务。

### 测试

这是一个预配置了 Jest 和 React Testing Library 的 Create React App 项目。使用 `npm test` 运行测试。

注意：代码库中目前不存在自定义测试。测试基础设施已准备就绪但未使用。