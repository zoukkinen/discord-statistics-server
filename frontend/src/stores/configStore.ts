import { createSignal } from 'solid-js';

export interface EventConfig {
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  description: string;
}

export interface ConfigResponse {
  event: EventConfig;
  isEventActive: boolean;
  hasEventStarted: boolean;
  activeEventId: number | null;
}

// Create reactive signals for configuration
const [config, setConfig] = createSignal<EventConfig>({
  name: 'Assembly Summer 2025',
  startDate: '2025-07-31T00:00:00+03:00',
  endDate: '2025-08-03T23:59:59+03:00',
  timezone: 'Europe/Helsinki',
  description: 'Finland\'s biggest computer festival and digital culture event'
});

const [eventStatus, setEventStatus] = createSignal({
  isEventActive: false,
  hasEventStarted: false,
  activeEventId: null as number | null
});

const [isLoading, setIsLoading] = createSignal(false);

// API Functions
const fetchConfig = async (): Promise<ConfigResponse> => {
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
      setConfig(data.event);
      setEventStatus({
        isEventActive: data.isEventActive,
        hasEventStarted: data.hasEventStarted,
        activeEventId: data.activeEventId
      });
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
    return new Date(config().startDate);
  },

  get endDate() {
    return new Date(config().endDate);
  },

  get timezone() {
    return config().timezone;
  },

  get isEventActive() {
    return eventStatus().isEventActive;
  },

  get hasEventStarted() {
    return eventStatus().hasEventStarted;
  },

  get activeEventId() {
    return eventStatus().activeEventId;
  },

  get isUpcoming() {
    return !eventStatus().hasEventStarted;
  },

  get eventState() {
    const status = eventStatus();
    if (status.isEventActive) return 'active';
    if (status.hasEventStarted) return 'completed';
    return 'upcoming';
  },

  get daysUntilStart() {
    const now = new Date();
    const start = new Date(config().startDate);
    if (now >= start) return 0;
    return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  },

  get daysRemaining() {
    const now = new Date();
    const end = new Date(config().endDate);
    if (now >= end) return 0;
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
};
