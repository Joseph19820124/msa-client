import React, { useState } from "react";
import { useApiConfig, useApiSubmit } from "./hooks/useApi";
import { postsApi } from "./services/api";

const PostCreate = ({ onPostCreated }) => {
  const [title, setTitle] = useState("");
  const { postsUrl } = useApiConfig();
  const { submit, loading, error } = useApiSubmit();

  const onSubmit = async (event) => {
    event.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    await submit(
      () => postsApi.createPost(postsUrl, { title: title.trim() }),
      () => {
        setTitle("");
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
          {loading ? "⏳ Publishing..." : "🚀 Publish Post"}
        </button>
      </form>
    </div>
  );
};

export default PostCreate;
