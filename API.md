# 微服务客户端 API 文档

本文档详细描述了微服务博客/论坛系统的React客户端应用程序中使用的所有API端点。

## 概述

该应用程序与两个独立的后端微服务通信：
- **Posts Service**: 默认运行在 `http://localhost:4000`
- **Comments Service**: 默认运行在 `http://localhost:4001`

服务URL可以通过环境变量配置：
- `REACT_APP_POSTS_SERVICE_URL` - Posts服务URL
- `REACT_APP_COMMENTS_SERVICE_URL` - Comments服务URL

## API 架构

### 服务配置 (`src/services/api.js`)

项目提供了统一的API服务配置：

```javascript
export const createApiService = (baseUrl) => {
  const instance = axios.create({
    baseURL: baseUrl,
    timeout: 10000,  // 10秒超时
  });

  return {
    get: (url) => instance.get(url),
    post: (url, data) => instance.post(url, data),
    put: (url, data) => instance.put(url, data),
    delete: (url) => instance.delete(url),
  };
};
```

### API Hooks (`src/hooks/useApi.js`)

提供了三个主要的React hooks来处理API调用：

1. **useApiConfig()** - 获取API配置
2. **useApiCall()** - 处理GET请求和数据获取
3. **useApiSubmit()** - 处理POST/PUT/DELETE等提交操作

## Posts Service API

**基础URL**: `process.env.REACT_APP_POSTS_SERVICE_URL` 或 `http://localhost:4000`

### 1. 获取所有帖子

- **端点**: `GET /posts`
- **用途**: 获取所有帖子列表
- **实现位置**: `src/services/api.js:18-19`, `src/PostList.js:10-13`
- **响应格式**: 
  ```json
  {
    "post_id": {
      "id": "post_id",
      "title": "帖子标题"
    }
  }
  ```
- **使用组件**: PostList
- **错误处理**: 显示错误信息和重试按钮

### 2. 创建新帖子

- **端点**: `POST /posts`
- **用途**: 创建新的帖子
- **实现位置**: `src/services/api.js:21-22`, `src/PostCreate.js:17-18`
- **请求体**:
  ```json
  {
    "title": "帖子标题"
  }
  ```
- **使用组件**: PostCreate
- **验证**: 标题不能为空
- **成功后操作**: 清空表单，触发帖子列表刷新

## Comments Service API

**基础URL**: `process.env.REACT_APP_COMMENTS_SERVICE_URL` 或 `http://localhost:4001`

### 1. 获取帖子评论

- **端点**: `GET /posts/{postId}/comments`
- **用途**: 获取指定帖子的所有评论
- **实现位置**: `src/services/api.js:26-27`, `src/CommentList.js:8-10`
- **路径参数**:
  - `postId`: 帖子ID
- **响应格式**:
  ```json
  [
    {
      "id": "comment_id",
      "content": "评论内容"
    }
  ]
  ```
- **使用组件**: CommentList
- **错误处理**: 显示错误信息

### 2. 创建评论

- **端点**: `POST /posts/{postId}/comments`
- **用途**: 为指定帖子添加新评论
- **实现位置**: `src/services/api.js:29-30`, `src/CommentCreate.js:18`
- **路径参数**:
  - `postId`: 帖子ID
- **请求体**:
  ```json
  {
    "content": "评论内容"
  }
  ```
- **使用组件**: CommentCreate
- **验证**: 评论内容不能为空
- **成功后操作**: 清空表单，触发评论列表和帖子列表刷新

## 错误处理

### 全局错误处理

所有API调用都通过 `useApiCall` 和 `useApiSubmit` hooks 进行统一的错误处理：

- **超时设置**: 10秒 (`src/services/api.js:6`)
- **错误记录**: 所有错误都会在控制台输出 (`src/hooks/useApi.js:24, 53`)
- **用户反馈**: 错误信息会显示在UI中
- **重试机制**: 部分操作提供重试功能

### 组件级错误处理

1. **PostList** (`src/PostList.js:27-48`):
   - 显示错误信息
   - 提供重试按钮
   - 加载状态指示

2. **PostCreate** (`src/PostCreate.js:40-44`):
   - 表单验证
   - 错误信息显示
   - 防止重复提交

3. **CommentList** (`src/CommentList.js:24-33`):
   - 错误信息显示
   - 加载状态处理

4. **CommentCreate** (`src/CommentCreate.js:40-44`):
   - 表单验证
   - 错误信息显示
   - 防止重复提交

## 状态管理

### 加载状态

所有API调用都包含加载状态管理：
- `loading`: 布尔值，表示请求是否正在进行
- 加载期间禁用表单提交
- 显示加载指示器（⏳）

### 数据刷新

- **手动刷新**: PostList 提供重试按钮
- **自动刷新**: 创建帖子或评论后自动刷新相关数据
- **依赖刷新**: 使用 `useCallback` 确保API调用在依赖变化时重新执行

## 性能优化

1. **请求缓存**: 使用 `useCallback` 避免不必要的重新渲染
2. **依赖数组**: 精确控制API调用的触发条件
3. **错误边界**: 组件级错误处理避免应用崩溃
4. **超时控制**: 10秒超时防止长时间等待

## 部署考虑

### 环境变量配置

生产环境需要在构建时设置正确的服务URL：

```bash
REACT_APP_POSTS_SERVICE_URL=https://api.example.com/posts \
REACT_APP_COMMENTS_SERVICE_URL=https://api.example.com/comments \
npm run build
```

### Docker 部署

```bash
docker run -p 8080:80 \
  -e REACT_APP_POSTS_SERVICE_URL=http://posts-service:4000 \
  -e REACT_APP_COMMENTS_SERVICE_URL=http://comments-service:4001 \
  client
```

## API 调用总结

| 服务 | 端点 | 方法 | 用途 | 实现文件 |
|------|------|------|------|----------|
| Posts | `/posts` | GET | 获取所有帖子 | PostList.js |
| Posts | `/posts` | POST | 创建新帖子 | PostCreate.js |
| Comments | `/posts/{id}/comments` | GET | 获取帖子评论 | CommentList.js |
| Comments | `/posts/{id}/comments` | POST | 创建新评论 | CommentCreate.js |

所有API调用都使用Axios HTTP客户端，通过统一的服务层和React hooks进行管理，确保了代码的可维护性和用户体验的一致性。