import { DatabaseAdapter } from './types';
import { PostgreSQLAdapter } from './PostgreSQLAdapter';

export class DatabaseFactory {
    public static createAdapter(): DatabaseAdapter {
        const dbType = process.env.DATABASE_TYPE || 'postgresql';
        
        console.log(`🔌 Using database adapter: ${dbType}`);
        
        switch (dbType.toLowerCase()) {
            case 'postgresql':
            case 'postgres':
            case 'pg':
                return new PostgreSQLAdapter();
            default:
                console.warn(`⚠️  Unknown database type: ${dbType}, using PostgreSQL`);
                return new PostgreSQLAdapter();
        }
    }
}

// Export the adapter types and factory
export { DatabaseAdapter } from './types';
export { PostgreSQLAdapter } from './PostgreSQLAdapter';
