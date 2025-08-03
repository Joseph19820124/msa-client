import React, { useState } from "react";
import { useApiConfig, useApiSubmit } from "./hooks/useApi";
import { commentsApi } from "./services/api";

const CommentCreate = ({ postId, onCommentAdded }) => {
  const [content, setContent] = useState("");
  const { commentsUrl } = useApiConfig();
  const { submit, loading, error } = useApiSubmit();

  const onSubmit = async (event) => {
    event.preventDefault();
    
    if (!content.trim()) {
      return;
    }

    await submit(
      () => commentsApi.createComment(commentsUrl, postId, { content: content.trim() }),
      () => {
        setContent("");
        if (onCommentAdded) onCommentAdded();
      }
    );
  };

  return (
    <div className="comment-form">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">✍️ Add a comment</label>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-control"
            placeholder="Share your thoughts..."
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
          disabled={loading || !content.trim()}
        >
          {loading ? "⏳ Posting..." : "💭 Post Comment"}
        </button>
      </form>
    </div>
  );
};

export default CommentCreate;
