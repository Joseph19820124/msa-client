import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NFLScores = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchNFLScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ESPN API endpoint for NFL scores
      const response = await axios.get(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
      );
      
      const events = response.data.events || [];
      const gameData = events.map(event => ({
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: new Date(event.date),
        status: event.status.type.description,
        period: event.status.period,
        clock: event.status.displayClock,
        completed: event.status.type.completed,
        homeTeam: {
          name: event.competitions[0].competitors[0].team.displayName,
          shortName: event.competitions[0].competitors[0].team.abbreviation,
          logo: event.competitions[0].competitors[0].team.logo,
          score: event.competitions[0].competitors[0].score,
          record: event.competitions[0].competitors[0].records?.[0]?.summary || ''
        },
        awayTeam: {
          name: event.competitions[0].competitors[1].team.displayName,
          shortName: event.competitions[0].competitors[1].team.abbreviation,
          logo: event.competitions[0].competitors[1].team.logo,
          score: event.competitions[0].competitors[1].score,
          record: event.competitions[0].competitors[1].records?.[0]?.summary || ''
        }
      }));
      
      setGames(gameData);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch NFL scores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNFLScores();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNFLScores, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN');
  };

  const getStatusColor = (status, completed) => {
    if (completed) return 'text-success';
    if (status.includes('Final')) return 'text-success';
    if (status.includes('In Progress') || status.includes('Halftime')) return 'text-warning';
    return 'text-info';
  };

  if (loading && games.length === 0) {
    return (
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2">正在加载NFL比赛数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h5>加载错误</h5>
        <p>{error}</p>
        <button className="btn btn-danger btn-sm" onClick={fetchNFLScores}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="nfl-scores">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>🏈 NFL 比赛结果</h3>
        <div className="d-flex align-items-center">
          {loading && <div className="spinner-border spinner-border-sm text-primary mr-2"></div>}
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={fetchNFLScores}
            disabled={loading}
          >
            刷新
          </button>
        </div>
      </div>
      
      {lastUpdated && (
        <div className="text-muted small mb-3">
          最后更新: {formatTime(lastUpdated)}
        </div>
      )}
      
      {games.length === 0 ? (
        <div className="alert alert-info">
          <h5>暂无比赛</h5>
          <p>当前没有进行中的NFL比赛</p>
        </div>
      ) : (
        <div className="games-container">
          {games.map(game => (
            <div key={game.id} className="card mb-3">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <div className="team-info d-flex align-items-center mb-2">
                      <img 
                        src={game.awayTeam.logo} 
                        alt={game.awayTeam.name}
                        width="24"
                        height="24"
                        className="mr-2"
                      />
                      <div>
                        <strong>{game.awayTeam.shortName}</strong>
                        <div className="small text-muted">{game.awayTeam.record}</div>
                      </div>
                      <div className="ml-auto">
                        <span className="badge badge-light font-weight-bold">
                          {game.awayTeam.score}
                        </span>
                      </div>
                    </div>
                    
                    <div className="team-info d-flex align-items-center">
                      <img 
                        src={game.homeTeam.logo} 
                        alt={game.homeTeam.name}
                        width="24"
                        height="24"
                        className="mr-2"
                      />
                      <div>
                        <strong>{game.homeTeam.shortName}</strong>
                        <div className="small text-muted">{game.homeTeam.record}</div>
                      </div>
                      <div className="ml-auto">
                        <span className="badge badge-light font-weight-bold">
                          {game.homeTeam.score}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-4 text-center">
                    <div className={`font-weight-bold ${getStatusColor(game.status, game.completed)}`}>
                      {game.status}
                    </div>
                    {game.clock && game.period && !game.completed && (
                      <div className="small text-muted">
                        第{game.period}节 {game.clock}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-md-4">
                    <div className="small text-muted">
                      {formatTime(game.date)}
                    </div>
                    <div className="small">
                      {game.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="text-center mt-3">
        <small className="text-muted">
          数据来源: ESPN API | 每30秒自动更新
        </small>
      </div>
    </div>
  );
};

export default NFLScores;