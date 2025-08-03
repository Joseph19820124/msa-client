import React, { useState } from "react";
import axios from "axios";

const CommentCreate = ({ postId }) => {
  const [content, setContent] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();

    const commentsUrl = process.env.REACT_APP_COMMENTS_SERVICE_URL || "http://localhost:4001";
    await axios.post(`${commentsUrl}/posts/${postId}/comments`, {
      content,
    });

    setContent("");
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
          />
        </div>
        <button className="btn btn-primary" type="submit">
          💭 Post Comment
        </button>
      </form>
    </div>
  );
};

export default CommentCreate;
