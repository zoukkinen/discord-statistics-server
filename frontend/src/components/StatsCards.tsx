import { Component } from 'solid-js';
import { statsStore } from '../stores/statsStore';

const StatsCards: Component = () => {
  const formatLastUpdated = () => {
    const lastUpdated = statsStore.lastUpdated;
    
    // If we don't have a valid timestamp but we have current stats, show that we're connected
    if (!lastUpdated || isNaN(lastUpdated.getTime())) {
      // If we have member data, we're getting updates but timestamp parsing failed
      if (statsStore.currentStats.memberStats) {
        return 'Live';
      }
      return 'Never';
    }
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div class="stats-grid">
      <div class="stat-card">
        <h3>👥 Online</h3>
        <div class="big-number">{statsStore.onlineMembers}</div>
        <div class="stat-secondary">Total: {statsStore.totalMembers}</div>
      </div>

      <div class="stat-card">
        <h3>🎮 Games</h3>
        <div class="big-number">{statsStore.totalGames}</div>
        <div class="stat-secondary">Total: {statsStore.totalGames}</div>
      </div>

      <div class="stat-card">
        <h3>🎯 Players</h3>
        <div class="big-number">{statsStore.totalActivePlayers}</div>
        <div class="stat-secondary">Total: {statsStore.totalActivePlayers}</div>
      </div>

      <div class={`stat-card ${statsStore.isUpdating ? 'updating' : ''}`}>
        <h3>🔄 Last Updated</h3>
        <div class="big-number">{formatLastUpdated()}</div>
        <div class="stat-secondary">
          {statsStore.isUpdating ? 'Updating...' : 'Live data'}
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
