import { Component, For } from 'solid-js';
import { statsStore } from '../stores/statsStore';

const CurrentlyPlaying: Component = () => {
  return (
    <div class="card currently-playing">
      <div class="card-title">
        🎮 Currently Playing
        <span class="live-indicator">LIVE</span>
      </div>
      
      <div class="card-content">
        {statsStore.currentStats.currentGames.length === 0 ? (
          <div class="empty-state">
            <div class="empty-icon">😴</div>
            <div class="empty-text">No one is playing games right now</div>
            <div class="empty-subtext">Come back later to see the action!</div>
          </div>
        ) : (
          <div class="games-list">
            <For each={statsStore.currentStats.currentGames}>
              {(game) => (
                <div class="game-item">
                  <div class="game-info">
                    <div class="game-name">{game.game_name}</div>
                    <div class="player-count">
                      {game.player_count} player{game.player_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div class="game-indicator">
                    <div class="player-dots">
                      {Array.from({ length: Math.min(game.player_count, 5) }, (_, i) => (
                        <div class="player-dot" style={{ 'animation-delay': `${i * 0.2}s` }}></div>
                      ))}
                      {game.player_count > 5 && (
                        <div class="player-count-overflow">+{game.player_count - 5}</div>
                      )}
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

export default CurrentlyPlaying;
