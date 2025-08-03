import React from "react";
import PostCreate from "./PostCreate";
import PostList from "./PostList";
import "./styles.css";

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">📝 BlogSpace</h1>
        <p className="app-subtitle">Share your thoughts with the world</p>
      </header>
      
      <div className="section">
        <h2 className="section-title">✨ Create New Post</h2>
        <PostCreate />
      </div>
      
      <div className="section">
        <h2 className="section-title">📚 Recent Posts</h2>
        <PostList />
      </div>
    </div>
  );
};
export default App;
