import React, { useCallback } from "react";
import { useApiConfig, useApiCall } from "./hooks/useApi";
import { commentsApi } from "./services/api";

const CommentList = ({ postId }) => {
  const { commentsUrl } = useApiConfig();
  
  const fetchComments = useCallback(() => 
    commentsApi.getComments(commentsUrl, postId).then(res => res.data), 
    [commentsUrl, postId]
  );

  const { data: comments, loading, error } = useApiCall(fetchComments, [commentsUrl, postId]);

  if (loading) {
    return (
      <div>
        <h4 className="comments-title">💬 Comments</h4>
        <div className="no-comments">⏳ Loading comments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h4 className="comments-title">💬 Comments</h4>
        <div className="no-comments" style={{ color: '#e53e3e' }}>
          ❌ Error loading comments: {error}
        </div>
      </div>
    );
  }

  const commentsArray = comments || [];
  const renderedComments = commentsArray.map((comment) => (
    <li key={comment.id} className="comment-item">
      {comment.content}
    </li>
  ));

  return (
    <div>
      <h4 className="comments-title">💬 Comments ({commentsArray.length})</h4>
      {commentsArray.length > 0 ? (
        <ul className="comments-list">{renderedComments}</ul>
      ) : (
        <div className="no-comments">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  );
};

export default CommentList;
