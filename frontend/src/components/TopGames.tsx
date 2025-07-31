import { Component, For } from 'solid-js';
import { statsStore } from '../stores/statsStore';

const TopGames: Component = () => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getPositionIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div class="card top-games">
      <div class="card-title">
        🏆 Top Games by Playtime
      </div>
      
      <div class="card-content">
        {statsStore.topGames.length === 0 ? (
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-text">No game data yet</div>
            <div class="empty-subtext">Start playing to see statistics!</div>
          </div>
        ) : (
          <div class="top-games-list">
            <For each={statsStore.topGames}>
              {(game, index) => (
                <div class={`top-game-item ${index() < 3 ? 'podium' : ''}`}>
                  <div class="game-position">
                    {getPositionIcon(index())}
                  </div>
                  
                  <div class="game-details">
                    <div class="game-name">{game.game_name}</div>
                    <div class="game-stats">
                      <span class="total-time">{formatTime(game.total_minutes)}</span>
                      <span class="sessions">{game.total_sessions} sessions</span>
                      <span class="players">{game.unique_players} players</span>
                    </div>
                  </div>
                  
                  <div class="game-progress">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill"
                        style={{ 
                          width: `${Math.min(100, (game.total_minutes / (statsStore.topGames[0]?.total_minutes || 1)) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div class="avg-time">
                      avg {formatTime(game.avg_minutes)}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopGames;
