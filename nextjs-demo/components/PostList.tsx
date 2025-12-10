import { useCallback } from 'react';
import CommentCreate from './CommentCreate';
import CommentList from './CommentList';
import { useApiCall } from '@/hooks/useApi';
import { postsApi, Post } from '@/lib/api';

export default function PostList() {
  const fetchPosts = useCallback(() => postsApi.getPosts(), []);
  const { data: posts, loading, error, refetch } = useApiCall(fetchPosts, []);

  if (loading) {
    return (
      <div className="posts-grid">
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#a0aec0', padding: '40px' }}>
          <p style={{ fontSize: '1.2rem' }}>⏳ Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="posts-grid">
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#e53e3e', padding: '40px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>❌ Error loading posts</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={refetch}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#3182ce', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const postValues = posts ? Object.values(posts) : [];
  const renderedPosts = postValues.map((post: Post) => (
    <div className="post-card" key={post.id}>
      <h3 className="post-title">{post.title}</h3>
      <div className="comments-section">
        <CommentList postId={post.id} />
        <CommentCreate postId={post.id} onCommentAdded={refetch} />
      </div>
    </div>
  ));

  return (
    <div className="posts-grid">
      {renderedPosts.length > 0 ? renderedPosts : (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#a0aec0', padding: '40px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>📭 No posts yet</p>
          <p style={{ fontSize: '0.9rem' }}>Be the first to share something!</p>
        </div>
      )}
    </div>
  );
}