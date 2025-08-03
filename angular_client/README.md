# Angular Client - BlogSpace

这是 BlogSpace 微服务应用的 Angular 客户端版本，由 React 客户端重构而来。

## 功能特性

- 📝 创建和显示博客帖子
- 💭 为帖子添加和查看评论
- 🎨 现代化的响应式界面设计
- 🚀 基于 Angular 17 构建
- 🔗 与独立的微服务后端通信

## 技术栈

- **Angular 17**: 前端框架
- **TypeScript**: 开发语言
- **RxJS**: 响应式编程库
- **Bootstrap 5**: UI 组件库
- **Angular HTTP Client**: API 通信

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器 (运行在 http://localhost:4200)
npm start

# 构建生产版本
npm run build

# 运行测试
npm test

# 代码检查
npm run lint
```

## 架构概览

这个 Angular 应用与两个独立的后端服务通信：

- **Posts Service**: `http://localhost:4000` - 处理帖子创建和检索
- **Comments Service**: `http://localhost:4001` - 管理帖子评论

### 组件结构

```
src/app/
├── components/
│   ├── post-create/          # 创建帖子组件
│   ├── post-list/           # 帖子列表组件
│   ├── comment-create/      # 创建评论组件
│   └── comment-list/        # 评论列表组件
├── services/
│   ├── post.service.ts      # 帖子 API 服务
│   ├── comment.service.ts   # 评论 API 服务
│   └── config.service.ts    # 配置服务
├── models/
│   ├── post.model.ts        # 帖子数据模型
│   └── comment.model.ts     # 评论数据模型
└── environments/
    ├── environment.ts       # 开发环境配置
    └── environment.prod.ts  # 生产环境配置
```

### 环境配置

服务 URL 可以通过环境文件配置：

**开发环境** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  postsServiceUrl: 'http://localhost:4000',
  commentsServiceUrl: 'http://localhost:4001'
};
```

**生产环境** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  postsServiceUrl: process.env['ANGULAR_APP_POSTS_SERVICE_URL'] || 'http://localhost:4000',
  commentsServiceUrl: process.env['ANGULAR_APP_COMMENTS_SERVICE_URL'] || 'http://localhost:4001'
};
```

### 关键特性

1. **服务层**: 使用 Angular 服务进行 HTTP 请求和错误处理
2. **响应式表单**: 使用 Angular Reactive Forms 进行表单管理
3. **TypeScript**: 完整的类型安全
4. **组件通信**: 使用 Input/Output 进行父子组件通信
5. **错误处理**: 统一的错误处理和用户友好的错误信息
6. **加载状态**: 优雅的加载和错误状态显示

### API 端点

应用程序期望这些端点可用：

- `GET /posts` - 获取所有帖子
- `POST /posts` - 创建新帖子
- `GET /posts/:id/comments` - 获取帖子的评论
- `POST /posts/:id/comments` - 为帖子添加评论

## 与 React 版本的差异

1. **状态管理**: 使用 Angular 服务和 RxJS 替代 React hooks
2. **表单处理**: 使用 Angular Reactive Forms 替代受控组件
3. **HTTP 客户端**: 使用 Angular HttpClient 替代 Axios
4. **组件架构**: 使用 Angular 组件和依赖注入
5. **类型系统**: 完整的 TypeScript 集成

## 样式

应用使用与 React 版本相同的现代化样式，包括：
- 渐变背景
- 玻璃效果卡片
- 平滑动画和过渡
- 响应式设计
- 现代化的表单和按钮样式