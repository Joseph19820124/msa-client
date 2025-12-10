import { useState } from 'react';
import { useApiSubmit } from '@/hooks/useApi';
import { postsApi } from '@/lib/api';

interface PostCreateProps {
  onPostCreated?: () => void;
}

export default function PostCreate({ onPostCreated }: PostCreateProps) {
  const [title, setTitle] = useState('');
  const { submit, loading, error } = useApiSubmit();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    await submit(
      () => postsApi.createPost({ title: title.trim() }),
      () => {
        setTitle('');
        if (onPostCreated) onPostCreated();
      }
    );
  };

  return (
    <div className="enhanced-form">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">📝 Post Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-control"
            placeholder="What's on your mind?"
            disabled={loading}
            required
          />
        </div>
        {error && (
          <div style={{ color: '#e53e3e', marginBottom: '10px', fontSize: '0.9rem' }}>
            ❌ Error: {error}
          </div>
        )}
        <button 
          className="btn btn-primary" 
          type="submit"
          disabled={loading || !title.trim()}
        >
          {loading ? '⏳ Publishing...' : '🚀 Publish Post'}
        </button>
      </form>
    </div>
  );
}