import { DatabaseAdapter } from './types';
import { PostgreSQLAdapter } from './PostgreSQLAdapter';

export class DatabaseFactory {
    public static createAdapter(guildId?: string): DatabaseAdapter {
        console.log('🔌 Using PostgreSQL database adapter');
        return new PostgreSQLAdapter(guildId);
    }
}

// Export the adapter types and factory
export { DatabaseAdapter } from './types';
export { PostgreSQLAdapter } from './PostgreSQLAdapter';
