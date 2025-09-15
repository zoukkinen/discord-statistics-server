import { createSignal } from 'solid-js';

export interface MemberStats {
  timestamp: string;
  total_members: number;
  online_members: number;
}

export interface CurrentGame {
  game_name: string;
  player_count: number;
}

export interface TopGame {
  game_name: string;
  total_sessions: number;
  total_minutes: number;
  avg_minutes: number;
  unique_players: number;
}

export interface RecentActivity {
  user_id: string;
  game_name: string;
  action: 'started' | 'stopped';
  timestamp: string;
  session_duration?: number;
}

export interface CurrentStats {
  memberStats: MemberStats | null;
  currentGames: CurrentGame[];
}

// Create reactive signals for our data
const [currentStats, setCurrentStats] = createSignal<CurrentStats>({
  memberStats: null,
  currentGames: []
});

const [topGames, setTopGames] = createSignal<TopGame[]>([]);
const [recentActivity, setRecentActivity] = createSignal<RecentActivity[]>([]);
const [memberHistory, setMemberHistory] = createSignal<MemberStats[]>([]);
const [isUpdating, setIsUpdating] = createSignal(false);

// API Functions
const fetchCurrentStats = async (): Promise<CurrentStats> => {
  const response = await fetch('/api/current');
  if (!response.ok) throw new Error('Failed to fetch current stats');
  return response.json();
};

const fetchTopGames = async (): Promise<TopGame[]> => {
  const response = await fetch('/api/top-games?limit=10');
  if (!response.ok) throw new Error('Failed to fetch top games');
  return response.json();
};

const fetchRecentActivity = async (): Promise<RecentActivity[]> => {
  const response = await fetch('/api/recent-activity?limit=20');
  if (!response.ok) throw new Error('Failed to fetch recent activity');
  return response.json();
};

const fetchMemberHistory = async (): Promise<MemberStats[]> => {
  // Use event date range from config instead of last 24 hours
  const { configStore } = await import('./configStore');
  
  // Ensure config is loaded first
  if (configStore.isLoading) {
    console.log('fetchMemberHistory: Config is loading, waiting...');
    await new Promise(resolve => {
      const checkConfig = () => {
        if (!configStore.isLoading) {
          resolve(undefined);
        } else {
          setTimeout(checkConfig, 50);
        }
      };
      checkConfig();
    });
  }
  
  // If config is still empty, try loading it
  if (!configStore.config.startDate || configStore.config.startDate === '2025-07-31T00:00:00+03:00') {
    console.log('fetchMemberHistory: Config not loaded, loading now...');
    await configStore.loadConfig();
  }
  
  const config = configStore.config;
  console.log('fetchMemberHistory: configStore.config:', config);
  
  let startDate: Date;
  let endDate: Date;
  
  if (config?.startDate && config?.endDate) {
    startDate = new Date(config.startDate);
    endDate = new Date(config.endDate);
    console.log('fetchMemberHistory: Using config dates:', startDate.toISOString(), 'to', endDate.toISOString());
  } else {
    // Fallback to last 7 days if no config
    endDate = new Date();
    startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    console.log('fetchMemberHistory: Using fallback dates:', startDate.toISOString(), 'to', endDate.toISOString());
  }
  
  const params = new URLSearchParams({
    start: startDate.toISOString(),
    end: endDate.toISOString()
  });
  
  const url = `/api/member-history?${params}`;
  console.log('fetchMemberHistory: Fetching from URL:', url);
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch member history');
  const data = await response.json();
  console.log('fetchMemberHistory: Received', data.length, 'data points');
  return data;
};

// Store methods
export const statsStore = {
  // Getters
  get currentStats() { return currentStats(); },
  get topGames() { return topGames(); },
  get recentActivity() { return recentActivity(); },
  get memberHistory() { return memberHistory(); },
  get isUpdating() { return isUpdating(); },

  // Actions
  async fetchCurrentStats() {
    try {
      setIsUpdating(true);
      const data = await fetchCurrentStats();
      setCurrentStats(data);
    } catch (error) {
      console.error('Error fetching current stats:', error);
    } finally {
      setIsUpdating(false);
    }
  },

  async fetchTopGames() {
    try {
      const data = await fetchTopGames();
      setTopGames(data);
    } catch (error) {
      console.error('Error fetching top games:', error);
    }
  },

  async fetchRecentActivity() {
    try {
      const data = await fetchRecentActivity();
      setRecentActivity(data);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  },

  async fetchMemberHistory() {
    try {
      console.log('statsStore.fetchMemberHistory called');
      const data = await fetchMemberHistory();
      console.log('fetchMemberHistory API returned:', data.length, 'points');
      console.log('Sample data:', data.slice(0, 3));
      setMemberHistory(data);
      console.log('memberHistory signal updated, new length:', memberHistory().length);
    } catch (error) {
      console.error('Error fetching member history:', error);
    }
  },

  // Computed values
  get totalMembers() {
    return currentStats().memberStats?.total_members ?? 0;
  },

  get onlineMembers() {
    return currentStats().memberStats?.online_members ?? 0;
  },

  get totalGames() {
    return currentStats().currentGames.length;
  },

  get totalActivePlayers() {
    return currentStats().currentGames.reduce((sum, game) => sum + game.player_count, 0);
  },

  // Manual setters for event-specific data
  setTopGames(games: TopGame[]) {
    setTopGames(games);
  },

  setMemberHistory(history: MemberStats[]) {
    setMemberHistory(history);
  },

  setCurrentStats(stats: CurrentStats) {
    setCurrentStats(stats);
  },

  get lastUpdated() {
    const timestamp = currentStats().memberStats?.timestamp;
    if (!timestamp) return null;
    
    try {
      // Try parsing as ISO string first
      let date = new Date(timestamp);
      
      // If that fails, try adding UTC suffix for older format
      if (isNaN(date.getTime()) && !timestamp.includes('T') && !timestamp.includes('Z')) {
        date = new Date(timestamp + ' UTC');
      }
      
      // If still invalid, return null
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp format:', timestamp);
        return null;
      }
      
      return date;
    } catch (error) {
      console.warn('Error parsing timestamp:', timestamp, error);
      return null;
    }
  }
};
