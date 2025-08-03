import React, { useState } from "react";
import axios from "axios";

const PostCreate = () => {
  const [title, setTitle] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();

    const postsUrl = process.env.REACT_APP_POSTS_SERVICE_URL || "http://localhost:4000";
    await axios.post(`${postsUrl}/posts`, {
      title,
    });

    setTitle("");
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
          />
        </div>
        <button className="btn btn-primary" type="submit">
          🚀 Publish Post
        </button>
      </form>
    </div>
  );
};

export default PostCreate;
