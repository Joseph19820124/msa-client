import React, { useState, useEffect } from "react";
import axios from "axios";
import CommentCreate from "./CommentCreate";
import CommentList from "./CommentList";

const PostList = () => {
  const [posts, setPosts] = useState({});

  const fetchPosts = async () => {
    const postsUrl = process.env.REACT_APP_POSTS_SERVICE_URL || "http://localhost:4000";
    const res = await axios.get(`${postsUrl}/posts`);

    setPosts(res.data);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderedPosts = Object.values(posts).map((post) => {
    return (
      <div className="post-card" key={post.id}>
        <h3 className="post-title">{post.title}</h3>
        <div className="comments-section">
          <CommentList postId={post.id} />
          <CommentCreate postId={post.id} />
        </div>
      </div>
    );
  });

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
};

export default PostList;
