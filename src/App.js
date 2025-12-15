import React, { useState } from "react";
import PostCreate from "./PostCreate";
import PostList from "./PostList";
import NFLScores from "./NFLScores";
import "./styles.css";

const App = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePostCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">📝 BlogSpace</h1>
        <p className="app-subtitle">Share your thoughts with the world</p>
      </header>
      
      <div className="section">
        <h2 className="section-title">✨ Create New Post</h2>
        <PostCreate onPostCreated={handlePostCreated} />
      </div>
      
      <div className="section">
        <h2 className="section-title">📚 Recent Posts</h2>
        <PostList key={refreshTrigger} />
      </div>
      
      <div className="section">
        <NFLScores />
      </div>
    </div>
  );
};
export default App;
