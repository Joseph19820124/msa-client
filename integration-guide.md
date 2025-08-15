<metadata>
purpose: Integration guide for microservices blog/forum API clients
type: guide
language: JavaScript/Multiple
dependencies: Axios, JWT, React, Node.js
last-updated: 2025-08-15
</metadata>

<overview>
This integration guide provides comprehensive instructions for connecting client applications to the microservices blog/forum API system. Covers authentication flows, API consumption patterns, error handling, real-time features, and platform-specific implementations for web, mobile, and server-side applications.
</overview>

<authentication-integration>
<jwt-token-management>
  <token-storage>
    <web-browser>
      <method>localStorage (access token) + httpOnly cookies (refresh token)</method>
      <security>XSS protection via httpOnly, CSRF protection via SameSite</security>
      <implementation>
```javascript
// Token Storage Utility
class TokenManager {
  constructor() {
    this.accessTokenKey = 'access_token';
    this.tokenExpiryKey = 'token_expiry';
  }

  setAccessToken(token, expiresIn) {
    localStorage.setItem(this.accessTokenKey, token);
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
  }

  getAccessToken() {
    const token = localStorage.getItem(this.accessTokenKey);
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    
    if (!token || !expiry) return null;
    
    if (Date.now() > parseInt(expiry)) {
      this.clearTokens();
      return null;
    }
    
    return token;
  }

  clearTokens() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.tokenExpiryKey);
  }

  isTokenExpiringSoon(thresholdMinutes = 5) {
    const expiry = localStorage.getItem(this.tokenExpiryKey);
    if (!expiry) return true;
    
    const threshold = thresholdMinutes * 60 * 1000;
    return Date.now() > (parseInt(expiry) - threshold);
  }
}
```
      </implementation>
    </web-browser>
    
    <mobile-native>
      <method>Secure keychain/keystore storage</method>
      <security>Hardware-backed encryption, biometric protection</security>
      <implementation>
```javascript
// React Native with Keychain
import * as Keychain from 'react-native-keychain';

class MobileTokenManager {
  async setTokens(accessToken, refreshToken, expiresIn) {
    const credentials = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000)
    };
    
    await Keychain.setInternetCredentials(
      'blog_api_tokens',
      'user',
      JSON.stringify(credentials),
      {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
      }
    );
  }

  async getTokens() {
    try {
      const credentials = await Keychain.getInternetCredentials('blog_api_tokens');
      if (credentials) {
        const parsed = JSON.parse(credentials.password);
        if (Date.now() < parsed.expiresAt) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Token retrieval failed:', error);
    }
    return null;
  }
}
```
      </implementation>
    </mobile-native>
  </token-storage>

  <automatic-refresh>
    <description>Implement automatic token refresh before expiration</description>
    <implementation>
```javascript
// Axios Interceptor for Automatic Token Refresh
class ApiClient {
  constructor(baseURL, tokenManager) {
    this.tokenManager = tokenManager;
    this.isRefreshing = false;
    this.failedQueue = [];
    
    this.api = axios.create({
      baseURL,
      timeout: 10000
    });
    
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor - add auth header
    this.api.interceptors.request.use(async (config) => {
      const token = this.tokenManager.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
          if (this.isRefreshing) {
            // Queue request while refresh is in progress
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              original.headers.Authorization = `Bearer ${token}`;
              return this.api(original);
            });
          }

          original._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.processQueue(null, newToken);
            original.headers.Authorization = `Bearer ${newToken}`;
            return this.api(original);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.tokenManager.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async refreshToken() {
    const response = await axios.post('/auth/refresh', {}, {
      withCredentials: true // Include refresh token cookie
    });
    
    const { accessToken, expiresIn } = response.data;
    this.tokenManager.setAccessToken(accessToken, expiresIn);
    return accessToken;
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      error ? reject(error) : resolve(token);
    });
    this.failedQueue = [];
  }
}
```
    </implementation>
  </automatic-refresh>
</jwt-token-management>

<oauth-integration>
  <web-implementation>
    <description>OAuth flow for web applications</description>
    <implementation>
```javascript
// OAuth Integration for Web
class OAuthManager {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
  }

  initiateOAuth(provider, redirectUrl = window.location.origin + '/auth/callback') {
    const state = this.generateState();
    localStorage.setItem('oauth_state', state);
    
    const params = new URLSearchParams({
      redirect: redirectUrl,
      state: state
    });
    
    window.location.href = `${this.apiBaseUrl}/auth/oauth/${provider}?${params}`;
  }

  async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }
    
    const storedState = localStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }
    
    localStorage.removeItem('oauth_state');
    
    // Extract token from URL fragment (if provided)
    const token = urlParams.get('token');
    if (token) {
      // Decode JWT to get expiry
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      
      const tokenManager = new TokenManager();
      tokenManager.setAccessToken(token, expiresIn);
      
      return { success: true, token };
    }
    
    throw new Error('No token received from OAuth callback');
  }

  generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Usage Example
const oauthManager = new OAuthManager('http://localhost:4002');

// Initiate Google OAuth
document.getElementById('google-login').addEventListener('click', () => {
  oauthManager.initiateOAuth('google');
});

// Handle callback (on callback page)
if (window.location.pathname === '/auth/callback') {
  oauthManager.handleCallback()
    .then(result => {
      console.log('OAuth success:', result);
      window.location.href = '/dashboard';
    })
    .catch(error => {
      console.error('OAuth failed:', error);
      window.location.href = '/login?error=' + encodeURIComponent(error.message));
    });
}
```
    </implementation>
  </web-implementation>
</oauth-integration>
</authentication-integration>

<api-consumption-patterns>
<posts-integration>
  <description>Integration patterns for Posts Service</description>
  <implementation>
```javascript
// Posts Service Client
class PostsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async getPosts(options = {}) {
    const {
      page = 1,
      limit = 20,
      tags = [],
      author = null,
      status = null,
      sort = 'created',
      order = 'desc'
    } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
      order
    });

    if (tags.length > 0) {
      params.append('tags', tags.join(','));
    }
    if (author) params.append('author', author);
    if (status) params.append('status', status);

    const response = await this.api.get(`/posts?${params}`);
    return response.data;
  }

  async getPost(id, includeComments = false) {
    const params = includeComments ? '?includeComments=true' : '';
    const response = await this.api.get(`/posts/${id}${params}`);
    return response.data;
  }

  async createPost(postData) {
    const response = await this.api.post('/posts', postData);
    return response.data;
  }

  async updatePost(id, updates) {
    const response = await this.api.put(`/posts/${id}`, updates);
    return response.data;
  }

  async deletePost(id) {
    await this.api.delete(`/posts/${id}`);
    return { success: true };
  }

  // Advanced: Search posts with full-text search
  async searchPosts(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      page: options.page || 1,
      limit: options.limit || 20
    });

    const response = await this.api.get(`/posts/search?${params}`);
    return response.data;
  }
}

// Usage Example with React Hook
function usePosts(options = {}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const postsService = useMemo(() => new PostsService(apiClient), []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await postsService.getPosts(options);
      setPosts(result.posts);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postsService, options]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(async (postData) => {
    const newPost = await postsService.createPost(postData);
    setPosts(prev => [newPost, ...prev]);
    return newPost;
  }, [postsService]);

  return {
    posts,
    loading,
    error,
    pagination,
    refetch: fetchPosts,
    createPost
  };
}
```
  </implementation>
</posts-integration>

<comments-integration>
  <description>Integration patterns for Comments Service with threading support</description>
  <implementation>
```javascript
// Comments Service Client
class CommentsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async getComments(postId, options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = 'created',
      order = 'asc',
      threaded = true,
      maxDepth = 5
    } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
      order,
      threaded: threaded.toString(),
      maxDepth: maxDepth.toString()
    });

    const response = await this.api.get(`/posts/${postId}/comments?${params}`);
    return response.data;
  }

  async createComment(postId, commentData) {
    const response = await this.api.post(`/posts/${postId}/comments`, commentData);
    return response.data;
  }

  async updateComment(commentId, updates) {
    const response = await this.api.put(`/comments/${commentId}`, updates);
    return response.data;
  }

  async deleteComment(commentId) {
    const response = await this.api.delete(`/comments/${commentId}`);
    return response.data;
  }

  async voteComment(commentId, vote) {
    const response = await this.api.post(`/comments/${commentId}/vote`, { vote });
    return response.data;
  }

  // Helper method to flatten threaded comments for display
  flattenComments(comments, depth = 0) {
    const flattened = [];
    
    for (const comment of comments) {
      flattened.push({ ...comment, depth });
      
      if (comment.replies && comment.replies.length > 0) {
        flattened.push(...this.flattenComments(comment.replies, depth + 1));
      }
    }
    
    return flattened;
  }

  // Helper method to build comment tree from flat list
  buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentNode = commentMap.get(comment.id);
      
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  }
}

// React Component Example
function CommentTree({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const commentsService = useMemo(() => new CommentsService(apiClient), []);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const result = await commentsService.getComments(postId);
      setComments(result.comments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content, parentId = null) => {
    try {
      const newComment = await commentsService.createComment(postId, {
        content,
        parentId
      });
      
      // Add comment to tree
      if (parentId) {
        // Find parent and add reply
        updateCommentTree(comments, parentId, newComment);
      } else {
        // Add as root comment
        setComments(prev => [...prev, newComment]);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const updateCommentTree = (commentList, parentId, newComment) => {
    for (const comment of commentList) {
      if (comment.id === parentId) {
        comment.replies = comment.replies || [];
        comment.replies.push(newComment);
        setComments([...comments]);
        return true;
      }
      if (comment.replies && updateCommentTree(comment.replies, parentId, newComment)) {
        return true;
      }
    }
    return false;
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="comment-tree">
      {comments.map(comment => (
        <CommentNode
          key={comment.id}
          comment={comment}
          onReply={handleAddComment}
          depth={0}
        />
      ))}
    </div>
  );
}
```
  </implementation>
</comments-integration>
</api-consumption-patterns>

<error-handling>
<comprehensive-error-handling>
  <description>Robust error handling for all API interactions</description>
  <implementation>
```javascript
// Error Handling Utility
class ApiError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static fromResponse(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new ApiError(
        data.error || 'API Error',
        status,
        data.code || 'UNKNOWN_ERROR',
        data.details || null
      );
    } else if (error.request) {
      return new ApiError(
        'Network Error: No response from server',
        0,
        'NETWORK_ERROR'
      );
    } else {
      return new ApiError(
        error.message,
        0,
        'REQUEST_ERROR'
      );
    }
  }

  isRetryable() {
    return this.status >= 500 || this.status === 0;
  }

  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  isValidationError() {
    return this.status === 400 && this.details;
  }

  isRateLimited() {
    return this.status === 429;
  }
}

// Enhanced API Client with Error Handling
class EnhancedApiClient {
  constructor(baseURL, tokenManager) {
    this.tokenManager = tokenManager;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000
    };

    this.api = axios.create({
      baseURL,
      timeout: 10000
    });

    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const apiError = ApiError.fromResponse(error);
        
        // Handle specific error types
        if (apiError.isAuthError()) {
          await this.handleAuthError(apiError);
        } else if (apiError.isRateLimited()) {
          await this.handleRateLimit(error.response);
        } else if (apiError.isRetryable()) {
          return this.retryRequest(error.config, apiError);
        }

        throw apiError;
      }
    );
  }

  async retryRequest(config, error, retryCount = 0) {
    if (retryCount >= this.retryConfig.maxRetries) {
      throw error;
    }

    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, retryCount),
      this.retryConfig.maxDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await this.api(config);
    } catch (retryError) {
      return this.retryRequest(config, ApiError.fromResponse(retryError), retryCount + 1);
    }
  }

  async handleRateLimit(response) {
    const retryAfter = response.headers['retry-after'] || response.data.retryAfter || 60;
    console.warn(`Rate limited. Waiting ${retryAfter} seconds before retry.`);
    
    // Emit event for UI feedback
    this.emit('rateLimited', { retryAfter });
  }

  async handleAuthError(error) {
    console.warn('Authentication error:', error.message);
    this.tokenManager.clearTokens();
    
    // Emit event for UI to redirect to login
    this.emit('authError', error);
  }

  // Event emitter functionality
  on(event, callback) {
    this.listeners = this.listeners || {};
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners && this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// Error Boundary for React
class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo);
    
    // Log to error monitoring service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { errorInfo }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      
      if (error instanceof ApiError) {
        if (error.isValidationError()) {
          return <ValidationErrorDisplay error={error} />;
        } else if (error.isRateLimited()) {
          return <RateLimitErrorDisplay error={error} />;
        } else if (error.status >= 500) {
          return <ServerErrorDisplay error={error} />;
        }
      }

      return <GenericErrorDisplay error={error} />;
    }

    return this.props.children;
  }
}
```
  </implementation>
</comprehensive-error-handling>

<validation-error-display>
  <description>User-friendly validation error presentation</description>
  <implementation>
```javascript
// Validation Error Handler
function ValidationErrorDisplay({ error }) {
  const formatFieldError = (detail) => {
    const fieldName = detail.field.charAt(0).toUpperCase() + 
                     detail.field.slice(1).replace(/([A-Z])/g, ' $1');
    return `${fieldName}: ${detail.message}`;
  };

  return (
    <div className="validation-errors">
      <h4>Please correct the following errors:</h4>
      <ul>
        {error.details.map((detail, index) => (
          <li key={index} className="error-item">
            {formatFieldError(detail)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Form Integration with Validation
function useFormValidation(validationSchema) {
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(true);

  const validate = (data) => {
    try {
      validationSchema.validateSync(data, { abortEarly: false });
      setErrors({});
      setIsValid(true);
      return true;
    } catch (error) {
      const fieldErrors = {};
      error.inner.forEach(err => {
        fieldErrors[err.path] = err.message;
      });
      setErrors(fieldErrors);
      setIsValid(false);
      return false;
    }
  };

  const handleApiError = (apiError) => {
    if (apiError.isValidationError()) {
      const fieldErrors = {};
      apiError.details.forEach(detail => {
        fieldErrors[detail.field] = detail.message;
      });
      setErrors(fieldErrors);
      setIsValid(false);
    }
  };

  return { errors, isValid, validate, handleApiError, setErrors };
}
```
  </implementation>
</validation-error-display>
</error-handling>

<real-time-features>
<websocket-integration>
  <description>Real-time updates for comments and posts</description>
  <implementation>
```javascript
// WebSocket Manager for Real-time Updates
class RealtimeManager {
  constructor(wsUrl, tokenManager) {
    this.wsUrl = wsUrl;
    this.tokenManager = tokenManager;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    const token = this.tokenManager.getAccessToken();
    if (!token) {
      console.warn('No access token available for WebSocket connection');
      return;
    }

    this.ws = new WebSocket(`${this.wsUrl}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'comment-created':
        this.emit('commentCreated', payload);
        break;
      case 'comment-updated':
        this.emit('commentUpdated', payload);
        break;
      case 'comment-deleted':
        this.emit('commentDeleted', payload);
        break;
      case 'vote-changed':
        this.emit('voteChanged', payload);
        break;
      case 'post-updated':
        this.emit('postUpdated', payload);
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  subscribeToPost(postId) {
    this.send({
      type: 'subscribe',
      payload: { postId }
    });
  }

  unsubscribeFromPost(postId) {
    this.send({
      type: 'unsubscribe',
      payload: { postId }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  scheduleReconnect() {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Scheduling WebSocket reconnect in ${delay}ms`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }
}

// React Hook for Real-time Comments
function useRealtimeComments(postId) {
  const [comments, setComments] = useState([]);
  const realtimeManager = useMemo(() => 
    new RealtimeManager('ws://localhost:4003', tokenManager), []
  );

  useEffect(() => {
    const handleCommentCreated = (comment) => {
      if (comment.postId === postId) {
        setComments(prev => [...prev, comment]);
      }
    };

    const handleCommentUpdated = (comment) => {
      if (comment.postId === postId) {
        setComments(prev => 
          prev.map(c => c.id === comment.id ? comment : c)
        );
      }
    };

    const handleCommentDeleted = (comment) => {
      if (comment.postId === postId) {
        setComments(prev => 
          prev.filter(c => c.id !== comment.id)
        );
      }
    };

    realtimeManager.on('commentCreated', handleCommentCreated);
    realtimeManager.on('commentUpdated', handleCommentUpdated);
    realtimeManager.on('commentDeleted', handleCommentDeleted);

    realtimeManager.connect();
    realtimeManager.subscribeToPost(postId);

    return () => {
      realtimeManager.off('commentCreated', handleCommentCreated);
      realtimeManager.off('commentUpdated', handleCommentUpdated);
      realtimeManager.off('commentDeleted', handleCommentDeleted);
      realtimeManager.unsubscribeFromPost(postId);
      realtimeManager.disconnect();
    };
  }, [postId, realtimeManager]);

  return { comments, setComments };
}
```
  </implementation>
</websocket-integration>
</real-time-features>

<platform-specific-implementations>
<react-web-app>
  <description>Complete React web application integration</description>
  <implementation>
```javascript
// Main App Component with Full Integration
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const tokenManager = useMemo(() => new TokenManager(), []);
  const apiClient = useMemo(() => new EnhancedApiClient('http://localhost:4002', tokenManager), []);

  useEffect(() => {
    // Check for existing session on app start
    const initializeAuth = async () => {
      const token = tokenManager.getAccessToken();
      if (token) {
        try {
          const response = await apiClient.get('/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to get user profile:', error);
          tokenManager.clearTokens();
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Handle auth errors globally
    apiClient.on('authError', () => {
      setUser(null);
      window.location.href = '/login';
    });

    // Handle rate limiting globally
    apiClient.on('rateLimited', ({ retryAfter }) => {
      // Show rate limit notification
      showNotification(`Rate limited. Please wait ${retryAfter} seconds.`, 'warning');
    });
  }, [apiClient, tokenManager]);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Header user={user} onLogout={() => setUser(null)} />
        <ApiErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={setUser} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<OAuthCallback onLogin={setUser} />} />
            <Route path="/" element={
              <ProtectedRoute user={user}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/posts/:id" element={
              <ProtectedRoute user={user}>
                <PostDetail />
              </ProtectedRoute>
            } />
          </Routes>
        </ApiErrorBoundary>
      </div>
    </Router>
  );
}

// Context Provider for API Services
const ApiContext = createContext();

export function ApiProvider({ children }) {
  const tokenManager = useMemo(() => new TokenManager(), []);
  const apiClient = useMemo(() => new EnhancedApiClient('http://localhost:4002', tokenManager), []);
  
  const services = useMemo(() => ({
    posts: new PostsService(apiClient),
    comments: new CommentsService(apiClient),
    auth: new AuthService(apiClient)
  }), [apiClient]);

  return (
    <ApiContext.Provider value={{ services, apiClient, tokenManager }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
```
  </implementation>
</react-web-app>

<react-native-app>
  <description>React Native mobile application integration</description>
  <implementation>
```javascript
// React Native Integration
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

// Mobile-specific Token Manager
class MobileTokenManager {
  constructor() {
    this.accessTokenKey = '@blog_app:access_token';
    this.tokenExpiryKey = '@blog_app:token_expiry';
  }

  async setAccessToken(token, expiresIn) {
    try {
      await AsyncStorage.setItem(this.accessTokenKey, token);
      const expiryTime = Date.now() + (expiresIn * 1000);
      await AsyncStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
    } catch (error) {
      console.error('Failed to store access token:', error);
    }
  }

  async getAccessToken() {
    try {
      const token = await AsyncStorage.getItem(this.accessTokenKey);
      const expiry = await AsyncStorage.getItem(this.tokenExpiryKey);
      
      if (!token || !expiry) return null;
      
      if (Date.now() > parseInt(expiry)) {
        await this.clearTokens();
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('Failed to retrieve access token:', error);
      return null;
    }
  }

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([this.accessTokenKey, this.tokenExpiryKey]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
}

// Mobile API Client with Network Awareness
class MobileApiClient extends EnhancedApiClient {
  constructor(baseURL, tokenManager) {
    super(baseURL, tokenManager);
    this.setupNetworkHandling();
  }

  setupNetworkHandling() {
    NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        this.handleOffline();
      } else {
        this.handleOnline();
      }
    });
  }

  handleOffline() {
    Alert.alert(
      'Connection Lost',
      'You appear to be offline. Some features may not work properly.',
      [{ text: 'OK' }]
    );
  }

  handleOnline() {
    console.log('Connection restored');
    // Retry any failed requests
    this.retryFailedRequests();
  }

  async retryFailedRequests() {
    // Implementation for retrying failed requests
    // This could involve queuing requests when offline
  }
}

// React Native App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const tokenManager = useMemo(() => new MobileTokenManager(), []);
  const apiClient = useMemo(() => 
    new MobileApiClient('http://localhost:4002', tokenManager), []
  );

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const token = await tokenManager.getAccessToken();
        if (token) {
          const response = await apiClient.get('/auth/profile');
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <ApiProvider apiClient={apiClient} tokenManager={tokenManager}>
        <Stack.Navigator>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </ApiProvider>
    </NavigationContainer>
  );
}
```
  </implementation>
</react-native-app>

<nodejs-server>
  <description>Node.js server-side integration</description>
  <implementation>
```javascript
// Node.js Server Integration
const express = require('express');
const axios = require('axios');

class ServerApiClient {
  constructor(baseURL, serviceToken) {
    this.baseURL = baseURL;
    this.serviceToken = serviceToken;
    
    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'X-Service-Token': serviceToken,
        'User-Agent': 'BlogApp-Server/1.0'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.api.interceptors.request.use(config => {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
      return config;
    });

    this.api.interceptors.response.use(
      response => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        console.error(`API Error: ${error.response?.status} ${error.config?.url}`, 
                     error.response?.data);
        return Promise.reject(error);
      }
    );
  }
}

// Express Middleware for API Proxy
function createApiProxy(apiClient) {
  return async (req, res, next) => {
    try {
      // Extract user token from request
      const userToken = req.headers.authorization;
      
      // Forward request to microservice
      const response = await apiClient.api({
        method: req.method,
        url: req.originalUrl.replace('/api', ''),
        data: req.body,
        headers: {
          ...(userToken && { Authorization: userToken }),
          'Content-Type': req.headers['content-type']
        }
      });

      res.status(response.status).json(response.data);
    } catch (error) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}

// Server Setup
const app = express();

app.use(express.json());

// Create API clients for each service
const postsApiClient = new ServerApiClient(
  'http://localhost:4000',
  process.env.POSTS_SERVICE_TOKEN
);

const commentsApiClient = new ServerApiClient(
  'http://localhost:4001',
  process.env.COMMENTS_SERVICE_TOKEN
);

const authApiClient = new ServerApiClient(
  'http://localhost:4002',
  process.env.AUTH_SERVICE_TOKEN
);

// Setup API proxies
app.use('/api/posts', createApiProxy(postsApiClient));
app.use('/api/comments', createApiProxy(commentsApiClient));
app.use('/api/auth', createApiProxy(authApiClient));

// Health check endpoint
app.get('/health', async (req, res) => {
  const services = [
    { name: 'posts', client: postsApiClient },
    { name: 'comments', client: commentsApiClient },
    { name: 'auth', client: authApiClient }
  ];

  const healthChecks = await Promise.allSettled(
    services.map(async (service) => {
      try {
        await service.client.api.get('/health');
        return { service: service.name, status: 'healthy' };
      } catch (error) {
        return { service: service.name, status: 'unhealthy', error: error.message };
      }
    })
  );

  const results = healthChecks.map(result => result.value || result.reason);
  const allHealthy = results.every(result => result.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: results,
    timestamp: new Date().toISOString()
  });
});

app.listen(3001, () => {
  console.log('API Gateway running on port 3001');
});
```
  </implementation>
</nodejs-server>
</platform-specific-implementations>

<testing-integration>
<api-testing>
  <description>Testing patterns for API integration</description>
  <implementation>
```javascript
// Jest Tests for API Integration
import { ApiClient } from '../src/services/ApiClient';
import { PostsService } from '../src/services/PostsService';

// Mock API Client for Testing
class MockApiClient {
  constructor() {
    this.requests = [];
    this.responses = new Map();
  }

  mockResponse(endpoint, response) {
    this.responses.set(endpoint, response);
  }

  async get(url) {
    this.requests.push({ method: 'GET', url });
    const response = this.responses.get(url);
    if (response) {
      return { data: response };
    }
    throw new Error(`No mock response for GET ${url}`);
  }

  async post(url, data) {
    this.requests.push({ method: 'POST', url, data });
    const response = this.responses.get(url);
    if (response) {
      return { data: response };
    }
    throw new Error(`No mock response for POST ${url}`);
  }

  getRequests() {
    return this.requests;
  }

  clearRequests() {
    this.requests = [];
  }
}

describe('PostsService', () => {
  let mockApiClient;
  let postsService;

  beforeEach(() => {
    mockApiClient = new MockApiClient();
    postsService = new PostsService(mockApiClient);
  });

  describe('getPosts', () => {
    it('should fetch posts with default parameters', async () => {
      const mockPosts = [
        { id: '1', title: 'Test Post', content: 'Test content' }
      ];
      
      mockApiClient.mockResponse('/posts?page=1&limit=20&sort=created&order=desc', {
        posts: mockPosts,
        pagination: { page: 1, totalPages: 1, totalPosts: 1 }
      });

      const result = await postsService.getPosts();

      expect(result.posts).toEqual(mockPosts);
      expect(mockApiClient.getRequests()).toHaveLength(1);
      expect(mockApiClient.getRequests()[0].url).toBe('/posts?page=1&limit=20&sort=created&order=desc');
    });

    it('should handle custom parameters', async () => {
      mockApiClient.mockResponse('/posts?page=2&limit=10&sort=updated&order=asc&tags=javascript%2Creact', {
        posts: [],
        pagination: { page: 2, totalPages: 5, totalPosts: 50 }
      });

      await postsService.getPosts({
        page: 2,
        limit: 10,
        tags: ['javascript', 'react'],
        sort: 'updated',
        order: 'asc'
      });

      const request = mockApiClient.getRequests()[0];
      expect(request.url).toBe('/posts?page=2&limit=10&sort=updated&order=asc&tags=javascript%2Creact');
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'New Post',
        content: 'Post content',
        tags: ['test']
      };

      const mockResponse = {
        id: '123',
        ...postData,
        authorId: 'user123',
        createdAt: '2025-08-15T12:00:00Z'
      };

      mockApiClient.mockResponse('/posts', mockResponse);

      const result = await postsService.createPost(postData);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.getRequests()).toHaveLength(1);
      expect(mockApiClient.getRequests()[0].data).toEqual(postData);
    });
  });
});

// Integration Tests with Real API
describe('API Integration Tests', () => {
  let apiClient;
  let authToken;

  beforeAll(async () => {
    // Setup test environment
    apiClient = new ApiClient('http://localhost:4002');
    
    // Login with test credentials
    const loginResponse = await apiClient.post('/auth/login', {
      login: 'test@example.com',
      password: 'TestPassword123!'
    });
    
    authToken = loginResponse.data.accessToken;
    apiClient.setAuthToken(authToken);
  });

  afterAll(async () => {
    // Cleanup test data
    await apiClient.post('/auth/logout');
  });

  it('should create and retrieve a post', async () => {
    const postsService = new PostsService(apiClient);
    
    // Create a test post
    const postData = {
      title: 'Integration Test Post',
      content: 'This is a test post created during integration testing.',
      tags: ['test', 'integration']
    };
    
    const createdPost = await postsService.createPost(postData);
    expect(createdPost.id).toBeDefined();
    expect(createdPost.title).toBe(postData.title);
    
    // Retrieve the post
    const retrievedPost = await postsService.getPost(createdPost.id);
    expect(retrievedPost.id).toBe(createdPost.id);
    expect(retrievedPost.title).toBe(postData.title);
    
    // Cleanup
    await postsService.deletePost(createdPost.id);
  });
});

// React Testing Library Integration
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../src/contexts/ApiContext';

// Test Component Wrapper
function TestWrapper({ children }) {
  const mockApiClient = new MockApiClient();
  const mockTokenManager = new MockTokenManager();
  
  return (
    <ApiProvider apiClient={mockApiClient} tokenManager={mockTokenManager}>
      {children}
    </ApiProvider>
  );
}

describe('PostList Component', () => {
  it('should display posts when loaded', async () => {
    const mockPosts = [
      { id: '1', title: 'Test Post 1', content: 'Content 1' },
      { id: '2', title: 'Test Post 2', content: 'Content 2' }
    ];

    render(
      <TestWrapper>
        <PostList />
      </TestWrapper>
    );

    // Wait for posts to load
    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      expect(screen.getByText('Test Post 2')).toBeInTheDocument();
    });
  });

  it('should handle post creation', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <PostCreate />
      </TestWrapper>
    );

    // Fill out the form
    await user.type(screen.getByLabelText(/title/i), 'New Test Post');
    await user.type(screen.getByLabelText(/content/i), 'This is test content');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create post/i }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/post created successfully/i)).toBeInTheDocument();
    });
  });
});
```
  </implementation>
</api-testing>
</testing-integration>

<performance-optimization>
<caching-strategies>
  <description>Client-side caching for improved performance</description>
  <implementation>
```javascript
// Simple Cache Implementation
class ApiCache {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, data, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { data, expiresAt });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(pattern) {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern);
    } else if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

// Enhanced API Client with Caching
class CachedApiClient extends EnhancedApiClient {
  constructor(baseURL, tokenManager) {
    super(baseURL, tokenManager);
    this.cache = new ApiCache();
  }

  async get(url, options = {}) {
    const cacheKey = `GET:${url}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && !options.skipCache) {
      return { data: cached };
    }

    const response = await super.get(url);
    
    if (options.cacheTTL !== false) {
      const ttl = options.cacheTTL || this.cache.defaultTTL;
      this.cache.set(cacheKey, response.data, ttl);
    }

    return response;
  }

  async post(url, data, options = {}) {
    const response = await super.post(url, data);
    
    // Invalidate related cache entries
    if (options.invalidateCache) {
      this.cache.invalidate(options.invalidateCache);
    }

    return response;
  }

  async put(url, data, options = {}) {
    const response = await super.put(url, data);
    
    // Invalidate related cache entries
    if (options.invalidateCache) {
      this.cache.invalidate(options.invalidateCache);
    }

    return response;
  }

  async delete(url, options = {}) {
    const response = await super.delete(url);
    
    // Invalidate related cache entries
    if (options.invalidateCache) {
      this.cache.invalidate(options.invalidateCache);
    }

    return response;
  }
}

// React Query Integration
import { useQuery, useMutation, useQueryClient } from 'react-query';

function usePostsQuery(options = {}) {
  return useQuery(
    ['posts', options],
    () => postsService.getPosts(options),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  );
}

function useCreatePostMutation() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (postData) => postsService.createPost(postData),
    {
      onSuccess: (newPost) => {
        // Invalidate and refetch posts
        queryClient.invalidateQueries(['posts']);
        
        // Optimistically update cache
        queryClient.setQueryData(['posts'], (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              posts: [newPost, ...oldData.posts]
            };
          }
          return oldData;
        });
      }
    }
  );
}
```
  </implementation>
</caching-strategies>

<request-optimization>
  <description>Request batching and optimization techniques</description>
  <implementation>
```javascript
// Request Batching Utility
class RequestBatcher {
  constructor(apiClient, batchWindow = 100) {
    this.apiClient = apiClient;
    this.batchWindow = batchWindow;
    this.pendingRequests = new Map();
    this.batchTimeout = null;
  }

  async batchGet(url) {
    return new Promise((resolve, reject) => {
      if (!this.pendingRequests.has(url)) {
        this.pendingRequests.set(url, []);
      }
      
      this.pendingRequests.get(url).push({ resolve, reject });
      
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchWindow);
      }
    });
  }

  async processBatch() {
    const requests = Array.from(this.pendingRequests.entries());
    this.pendingRequests.clear();
    this.batchTimeout = null;

    // Process requests in parallel
    const results = await Promise.allSettled(
      requests.map(([url]) => this.apiClient.get(url))
    );

    // Resolve/reject pending promises
    results.forEach((result, index) => {
      const [url, pendingPromises] = requests[index];
      
      pendingPromises.forEach(({ resolve, reject }) => {
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    });
  }
}

// Infinite Scroll Implementation
function useInfiniteScroll(fetchFunction, dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const result = await fetchFunction(page);
      
      setData(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, loading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    reset();
    loadMore();
  }, dependencies);

  return { data, loading, hasMore, loadMore, reset };
}

// Virtual Scrolling for Large Lists
import { FixedSizeList } from 'react-window';

function VirtualizedPostList({ posts }) {
  const Row = ({ index, style }) => {
    const post = posts[index];
    
    return (
      <div style={style}>
        <PostCard post={post} />
      </div>
    );
  };

  return (
    <FixedSizeList
      height={600}
      itemCount={posts.length}
      itemSize={200}
      overscanCount={5}
    >
      {Row}
    </FixedSizeList>
  );
}
```
  </implementation>
</request-optimization>
</performance-optimization>

<best-practices>
<security-guidelines>
  <rule>Always validate server responses before using data</rule>
  <rule>Implement proper token storage based on platform security capabilities</rule>
  <rule>Use HTTPS in production environments</rule>
  <rule>Implement request signing for sensitive operations</rule>
  <rule>Sanitize user inputs before sending to API</rule>
  <rule>Implement proper logout that clears all stored credentials</rule>
</security-guidelines>

<performance-guidelines>
  <rule>Implement request caching with appropriate TTL</rule>
  <rule>Use pagination for large datasets</rule>
  <rule>Implement optimistic updates for better UX</rule>
  <rule>Batch similar requests when possible</rule>
  <rule>Use virtual scrolling for very large lists</rule>
  <rule>Implement proper loading states and error boundaries</rule>
</performance-guidelines>

<maintainability-guidelines>
  <rule>Create reusable API service classes</rule>
  <rule>Implement consistent error handling across all API calls</rule>
  <rule>Use TypeScript for better type safety</rule>
  <rule>Write comprehensive tests for API integrations</rule>
  <rule>Document API changes and migration guides</rule>
  <rule>Use environment variables for API endpoints</rule>
</maintainability-guidelines>
</best-practices>