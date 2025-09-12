import React, { useState, useEffect } from 'react';
import StrandsAgent from './services/strandsAgent';

const StrandsAgentDemo = () => {
  const [agent, setAgent] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [demoResults, setDemoResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testInput, setTestInput] = useState('AI and machine learning are revolutionizing the tech industry');

  useEffect(() => {
    // Initialize the agent
    const newAgent = new StrandsAgent({
      agentName: 'Demo Strands Agent',
      autoReply: false // Disabled for demo safety
    });
    
    setAgent(newAgent);
    
    return () => {
      if (newAgent) {
        newAgent.stop();
      }
    };
  }, []);

  const initializeAgent = async () => {
    if (agent) {
      setIsLoading(true);
      try {
        const result = await agent.initialize();
        setAgentStatus(result);
        addDemoResult('Agent Initialized', result);
      } catch (error) {
        addDemoResult('Initialization Error', { error: error.message });
      }
      setIsLoading(false);
    }
  };

  const analyzeContent = () => {
    if (agent && testInput) {
      const analysis = agent.analyzeContent(testInput);
      addDemoResult('Content Analysis', { 
        input: testInput, 
        analysis 
      });
    }
  };

  const generateResponse = () => {
    if (agent && testInput) {
      const response = agent.generateResponse(testInput);
      addDemoResult('AI Response Generated', response);
    }
  };

  const fetchAnalyzedPosts = async () => {
    if (agent) {
      setIsLoading(true);
      try {
        const posts = await agent.getAnalyzedPosts();
        addDemoResult('Posts with AI Analysis', { 
          count: posts.length, 
          posts: posts.slice(0, 3) // Show first 3 for demo
        });
      } catch (error) {
        addDemoResult('Posts Fetch Error', { error: error.message });
      }
      setIsLoading(false);
    }
  };

  const createEnhancedPost = async () => {
    if (agent) {
      setIsLoading(true);
      try {
        const result = await agent.createEnhancedPost(
          'AI-Generated Demo Post', 
          { enhanceTitle: true }
        );
        addDemoResult('Enhanced Post Created', result);
      } catch (error) {
        addDemoResult('Post Creation Error', { error: error.message });
      }
      setIsLoading(false);
    }
  };

  const getAgentStatus = () => {
    if (agent) {
      const status = agent.getStatus();
      setAgentStatus(status);
      addDemoResult('Agent Status', status);
    }
  };

  const addDemoResult = (action, result) => {
    const newResult = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      action,
      result
    };
    setDemoResults(prev => [newResult, ...prev]);
  };

  const clearResults = () => {
    setDemoResults([]);
  };

  const stopAgent = () => {
    if (agent) {
      agent.stop();
      setAgentStatus(null);
      addDemoResult('Agent Stopped', { message: 'Agent has been deactivated' });
    }
  };

  return (
    <div className="strands-agent-demo">
      <div className="demo-header">
        <h2>🤖 Strands Agent SDK Demo</h2>
        <p>Intelligent AI agent for blog automation and content analysis</p>
        
        {agentStatus && (
          <div className={`agent-status ${agentStatus.active ? 'active' : 'inactive'}`}>
            <strong>Agent Status:</strong> {agentStatus.active ? '🟢 Active' : '🔴 Inactive'} 
            <span className="agent-name"> - {agentStatus.agent}</span>
          </div>
        )}
      </div>

      <div className="demo-controls">
        <div className="control-section">
          <h3>📡 Agent Operations</h3>
          <div className="button-group">
            <button 
              onClick={initializeAgent} 
              disabled={isLoading || (agentStatus && agentStatus.active)}
              className="btn btn-primary"
            >
              {isLoading ? '⏳ Initializing...' : '🚀 Initialize Agent'}
            </button>
            <button 
              onClick={getAgentStatus} 
              className="btn btn-info"
            >
              📊 Get Status
            </button>
            <button 
              onClick={stopAgent} 
              disabled={!agentStatus || !agentStatus.active}
              className="btn btn-danger"
            >
              🛑 Stop Agent
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>🧠 Content Analysis</h3>
          <div className="input-group">
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter content to analyze..."
              className="demo-input"
              rows="3"
            />
            <div className="button-group">
              <button 
                onClick={analyzeContent}
                disabled={!testInput || !agent}
                className="btn btn-secondary"
              >
                🔍 Analyze Content
              </button>
              <button 
                onClick={generateResponse}
                disabled={!testInput || !agent}
                className="btn btn-secondary"
              >
                💬 Generate Response
              </button>
            </div>
          </div>
        </div>

        <div className="control-section">
          <h3>📝 Blog Operations</h3>
          <div className="button-group">
            <button 
              onClick={fetchAnalyzedPosts}
              disabled={isLoading || !agent}
              className="btn btn-success"
            >
              {isLoading ? '⏳ Loading...' : '📚 Analyze Existing Posts'}
            </button>
            <button 
              onClick={createEnhancedPost}
              disabled={isLoading || !agent}
              className="btn btn-warning"
            >
              {isLoading ? '⏳ Creating...' : '✨ Create AI Post'}
            </button>
          </div>
        </div>
      </div>

      <div className="demo-results">
        <div className="results-header">
          <h3>📋 Demo Results</h3>
          <button 
            onClick={clearResults}
            className="btn btn-outline btn-sm"
          >
            🗑️ Clear
          </button>
        </div>
        
        <div className="results-container">
          {demoResults.length === 0 ? (
            <div className="no-results">
              <p>No results yet. Try running some agent operations above!</p>
            </div>
          ) : (
            demoResults.map(result => (
              <div key={result.id} className="result-item">
                <div className="result-header">
                  <span className="result-action">{result.action}</span>
                  <span className="result-time">{result.timestamp}</span>
                </div>
                <div className="result-content">
                  <pre>{JSON.stringify(result.result, null, 2)}</pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="demo-info">
        <h3>ℹ️ About Strands Agent SDK</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🎯 Capabilities</h4>
            <ul>
              <li>Content sentiment analysis</li>
              <li>Intelligent response generation</li>
              <li>Post enhancement and automation</li>
              <li>Real-time monitoring</li>
              <li>User engagement insights</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>🔌 Integration</h4>
            <ul>
              <li>Works with existing microservices</li>
              <li>Posts Service integration</li>
              <li>Comments Service integration</li>
              <li>Event-driven architecture</li>
              <li>Configurable behavior</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>🚀 Use Cases</h4>
            <ul>
              <li>Automated content moderation</li>
              <li>Smart comment generation</li>
              <li>Content quality analysis</li>
              <li>User engagement automation</li>
              <li>Trend detection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrandsAgentDemo;