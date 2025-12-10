import { useState } from 'react';
import PostCreate from '@/components/PostCreate';
import PostList from '@/components/PostList';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePostCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">📝 BlogSpace</h1>
        <p className="app-subtitle">Share your thoughts with the world</p>
        <div className="tech-badge">
          <span className="badge">Next.js Demo</span>
        </div>
      </header>
      
      <div className="section">
        <h2 className="section-title">✨ Create New Post</h2>
        <PostCreate onPostCreated={handlePostCreated} />
      </div>
      
      <div className="section">
        <h2 className="section-title">📚 Recent Posts</h2>
        <PostList key={refreshTrigger} />
      </div>
    </div>
  );
}