export interface EventConfig {
    name: string;
    startDate: string;
    endDate: string;
    timezone: string;
    description: string;
}

export class Config {
    public static getEventConfig(): EventConfig {
        return {
            name: process.env.EVENT_NAME || 'Assembly Summer 2025',
            startDate: process.env.EVENT_START_DATE || '2025-07-31T07:00:00Z',
            endDate: process.env.EVENT_END_DATE || '2025-08-03T13:00:00Z',
            timezone: process.env.EVENT_TIMEZONE || 'Europe/Helsinki',
            description: process.env.EVENT_DESCRIPTION || 'Discord activity tracking for Assembly Summer 2025'
        };
    }

    public static getEventName(): string {
        return this.getEventConfig().name;
    }

    public static getEventDateRange(): { start: string; end: string } {
        const config = this.getEventConfig();
        return {
            start: config.startDate,
            end: config.endDate
        };
    }

    public static getEventTimezone(): string {
        return this.getEventConfig().timezone;
    }

    public static getEventDescription(): string {
        return this.getEventConfig().description;
    }

    public static isEventActive(): boolean {
        const { start, end } = this.getEventDateRange();
        const now = new Date();
        const eventStart = new Date(start);
        const eventEnd = new Date(end);
        
        return now >= eventStart && now <= eventEnd;
    }

    public static hasEventStarted(): boolean {
        const { start } = this.getEventDateRange();
        const now = new Date();
        const eventStart = new Date(start);
        
        return now >= eventStart;
    }

    public static getAdminPassword(): string {
        return process.env.ADMIN_PASSWORD || 'admin123';
    }
}
