import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { statsStore } from '../stores/statsStore';

interface StatsCardsProps {
  isHistorical?: boolean; // If true, show historical max values instead of current
}

const StatsCards: Component<StatsCardsProps> = (props) => {
  // Create a reactive signal that updates every minute for relative time
  const [currentTime, setCurrentTime] = createSignal(new Date());
  
  let timeInterval: NodeJS.Timeout;
  
  onMount(() => {
    // Update current time every 30 seconds for relative time calculations
    timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
  });
  
  onCleanup(() => {
    if (timeInterval) {
      clearInterval(timeInterval);
    }
  });
  const getOnlineStats = () => {
    if (props.isHistorical && statsStore.memberHistory.length > 0) {
      // For historical events, show max online during the event
      const maxOnline = Math.max(...statsStore.memberHistory.map(point => point.online_members));
      const maxTotal = Math.max(...statsStore.memberHistory.map(point => point.total_members));
      return {
        online: maxOnline,
        total: maxTotal,
        label: `peak of ${maxTotal} members`
      };
    } else {
      // For current events, show live stats
      return {
        online: statsStore.onlineMembers,
        total: statsStore.totalMembers,
        label: `of ${statsStore.totalMembers} members`
      };
    }
  };

  const getGamesStats = () => {
    if (props.isHistorical && statsStore.topGames.length > 0) {
      // For historical events, show total unique games played
      return {
        count: statsStore.topGames.length,
        label: 'Total games played'
      };
    } else {
      // For current events, show active games
      return {
        count: statsStore.totalGames,
        label: 'Active games'
      };
    }
  };

  const getPlayersStats = () => {
    if (props.isHistorical && statsStore.topGames.length > 0) {
      // For historical events, show total gaming sessions (more accurate than trying to count unique players)
      const totalSessions = statsStore.topGames.reduce((sum, game) => sum + game.total_sessions, 0);
      return {
        count: totalSessions,
        label: 'Gaming sessions'
      };
    } else {
      // For current events, show currently playing
      return {
        count: statsStore.totalActivePlayers,
        label: 'Currently playing'
      };
    }
  };
  const getEventDuration = () => {
    if (!props.isHistorical || statsStore.memberHistory.length === 0) {
      return '0h';
    }
    
    const firstPoint = new Date(statsStore.memberHistory[0].timestamp);
    const lastPoint = new Date(statsStore.memberHistory[statsStore.memberHistory.length - 1].timestamp);
    const durationMs = lastPoint.getTime() - firstPoint.getTime();
    const hours = Math.round(durationMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    } else {
      return `${hours}h`;
    }
  };

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
    
    // Use the reactive currentTime signal for live updates
    const now = currentTime();
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
        <div class="big-number">{getOnlineStats().online}</div>
        <div class="stat-secondary">{getOnlineStats().label}</div>
      </div>

      <div class="stat-card">
        <h3>🎮 Games</h3>
        <div class="big-number">{getGamesStats().count}</div>
        <div class="stat-secondary">{getGamesStats().label}</div>
      </div>

      <div class="stat-card">
        <h3>🎯 Players</h3>
        <div class="big-number">{getPlayersStats().count}</div>
        <div class="stat-secondary">{getPlayersStats().label}</div>
      </div>

      <div class={`stat-card ${!props.isHistorical && statsStore.isUpdating ? 'updating' : ''}`}>
        <h3>{props.isHistorical ? '📅 Event Period' : '🔄 Last Updated'}</h3>
        <div class="big-number">
          {props.isHistorical ? getEventDuration() : formatLastUpdated()}
        </div>
        <div class="stat-secondary">
          {props.isHistorical ? 
            'Duration tracked' :
            (statsStore.isUpdating ? 'Updating...' : 'Live data')
          }
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
