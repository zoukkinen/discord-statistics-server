import { createSignal } from 'solid-js';

export interface EventConfig {
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  description: string;
}

// Create reactive signals for configuration
const [config, setConfig] = createSignal<EventConfig>({
  name: 'Assembly Summer 2025',
  start_date: '2025-07-31T00:00:00+03:00',
  end_date: '2025-08-03T23:59:59+03:00',
  timezone: 'Europe/Helsinki',
  description: 'Finland\'s biggest computer festival and digital culture event'
});

const [isLoading, setIsLoading] = createSignal(false);

// API Functions
const fetchConfig = async (): Promise<EventConfig> => {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Failed to fetch configuration');
  return response.json();
};

// Store methods
export const configStore = {
  // Getters
  get config() { return config(); },
  get isLoading() { return isLoading(); },

  // Actions
  async loadConfig() {
    try {
      setIsLoading(true);
      const data = await fetchConfig();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
      // Keep default values if fetch fails
    } finally {
      setIsLoading(false);
    }
  },

  // Computed values
  get eventName() {
    return config().name;
  },

  get eventDescription() {
    return config().description;
  },

  get startDate() {
    return new Date(config().start_date);
  },

  get endDate() {
    return new Date(config().end_date);
  },

  get timezone() {
    return config().timezone;
  },

  get isEventActive() {
    const now = new Date();
    const start = new Date(config().start_date);
    const end = new Date(config().end_date);
    return now >= start && now <= end;
  },

  get daysUntilStart() {
    const now = new Date();
    const start = new Date(config().start_date);
    if (now >= start) return 0;
    return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  },

  get daysRemaining() {
    const now = new Date();
    const end = new Date(config().end_date);
    if (now >= end) return 0;
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
};
