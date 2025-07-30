import { DatabaseAdapter } from './types';
import { SQLiteAdapter } from './SQLiteAdapter';
import { PostgreSQLAdapter } from './PostgreSQLAdapter';

export class DatabaseFactory {
    public static createAdapter(): DatabaseAdapter {
        const dbType = process.env.DATABASE_TYPE || this.detectDatabaseType();
        
        console.log(`🔌 Using database adapter: ${dbType}`);
        
        switch (dbType.toLowerCase()) {
            case 'postgresql':
            case 'postgres':
            case 'pg':
                return new PostgreSQLAdapter();
            case 'sqlite':
            case 'sqlite3':
                return new SQLiteAdapter();
            default:
                console.warn(`⚠️  Unknown database type: ${dbType}, falling back to SQLite`);
                return new SQLiteAdapter();
        }
    }

    private static detectDatabaseType(): string {
        // Auto-detect based on environment
        if (process.env.DATABASE_URL || process.env.DB_HOST) {
            return 'postgresql';
        }
        
        // Default to SQLite for local development
        return 'sqlite';
    }
}

// Export the adapter types and factory
export { DatabaseAdapter } from './types';
export { SQLiteAdapter } from './SQLiteAdapter';
export { PostgreSQLAdapter } from './PostgreSQLAdapter';
