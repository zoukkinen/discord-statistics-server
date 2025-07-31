import { createSignal, createResource } from 'solid-js';

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
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  const params = new URLSearchParams({
    start: startDate.toISOString(),
    end: endDate.toISOString()
  });
  
  const response = await fetch(`/api/member-history?${params}`);
  if (!response.ok) throw new Error('Failed to fetch member history');
  return response.json();
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
      const data = await fetchMemberHistory();
      setMemberHistory(data);
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

  get lastUpdated() {
    return currentStats().memberStats?.timestamp 
      ? new Date(currentStats().memberStats.timestamp)
      : null;
  }
};
