import { Component, For } from 'solid-js';
import { statsStore } from '../stores/statsStore';

const CurrentlyPlaying: Component = () => {
  return (
    <div class="chart-container">
      <h3>🎮 Currently Playing</h3>
      
      {statsStore.currentStats.currentGames.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">😴</div>
          <div class="empty-text">No one is playing games right now</div>
          <div class="empty-subtext">Come back later to see the action!</div>
        </div>
      ) : (
        <div class="game-list">
          <For each={statsStore.currentStats.currentGames}>
            {(game) => (
              <div class="game-item">
                <div class="game-name">{game.game_name}</div>
                <div class="game-stats">
                  {game.player_count} player{game.player_count !== 1 ? 's' : ''} playing
                </div>
              </div>
            )}
          </For>
        </div>
      )}
    </div>
  );
};

export default CurrentlyPlaying;
