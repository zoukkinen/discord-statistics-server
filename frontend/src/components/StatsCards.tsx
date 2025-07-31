import { Component } from 'solid-js';
import { statsStore } from '../stores/statsStore';

const StatsCards: Component = () => {
  const formatLastUpdated = () => {
    const lastUpdated = statsStore.lastUpdated;
    if (!lastUpdated) return 'Never';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div class="stats-grid">
      <div class={`stat-card members-card ${statsStore.isUpdating ? 'updating' : ''}`}>
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-label">Discord Members</div>
          <div class="stat-value">{statsStore.totalMembers}</div>
          <div class="stat-secondary">
            <span class="online-count">{statsStore.onlineMembers} online</span>
          </div>
        </div>
      </div>

      <div class={`stat-card games-card ${statsStore.isUpdating ? 'updating' : ''}`}>
        <div class="stat-icon">🎮</div>
        <div class="stat-content">
          <div class="stat-label">Active Games</div>
          <div class="stat-value">{statsStore.totalGames}</div>
          <div class="stat-secondary">
            <span class="games-count">Different titles</span>
          </div>
        </div>
      </div>

      <div class={`stat-card players-card ${statsStore.isUpdating ? 'updating' : ''}`}>
        <div class="stat-icon">🕹️</div>
        <div class="stat-content">
          <div class="stat-label">Active Players</div>
          <div class="stat-value">{statsStore.totalActivePlayers}</div>
          <div class="stat-secondary">
            <span class="players-count">Currently playing</span>
          </div>
        </div>
      </div>

      <div class={`stat-card update-card ${statsStore.isUpdating ? 'updating' : ''}`}>
        <div class="stat-icon">🔄</div>
        <div class="stat-content">
          <div class="stat-label">Last Updated</div>
          <div class="stat-value small">{formatLastUpdated()}</div>
          <div class="stat-secondary">
            <span class="update-status">
              {statsStore.isUpdating ? 'Updating...' : 'Live data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
