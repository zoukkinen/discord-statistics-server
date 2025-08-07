#!/usr/bin/env python3
import sys
import re
import os

def convert_postgres_to_sqlite(input_file, output_file):
    """Convert PostgreSQL dump to SQLite compatible format"""
    
    print(f"Converting {input_file} to {output_file}")
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    # Basic PostgreSQL to SQLite conversions
    conversions = [
        # Remove PostgreSQL specific statements
        (r'--.*\n', ''),  # Remove comments
        (r'SET .*?;', ''),  # Remove SET statements
        (r'SELECT pg_catalog\..*?;', ''),  # Remove pg_catalog calls
        (r'CREATE EXTENSION.*?;', ''),  # Remove extensions
        (r'COMMENT ON.*?;', ''),  # Remove comments
        
        # Data type conversions
        (r'SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT'),
        (r'SERIAL', 'INTEGER'),
        (r'BIGSERIAL', 'INTEGER'),
        (r'TEXT', 'TEXT'),
        (r'VARCHAR\(\d+\)', 'TEXT'),
        (r'TIMESTAMP WITH TIME ZONE', 'TEXT'),
        (r'TIMESTAMP WITHOUT TIME ZONE', 'TEXT'),
        (r'TIMESTAMP', 'TEXT'),
        (r'BOOLEAN', 'INTEGER'),
        (r'TRUE', '1'),
        (r'FALSE', '0'),
        
        # Remove PostgreSQL specific syntax
        (r'ONLY ', ''),
        (r'public\.', ''),
        (r'CONSTRAINT.*?CHECK.*?\),?', ''),
        
        # Fix INSERT statements
        (r'INSERT INTO (.*?) VALUES', r'INSERT INTO \1 VALUES'),
    ]
    
    for pattern, replacement in conversions:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE | re.MULTILINE)
    
    # Extract table creation and data insertion
    lines = content.split('\n')
    sqlite_lines = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('--'):
            continue
            
        # Keep CREATE TABLE, INSERT INTO, and basic statements
        if any(line.upper().startswith(cmd) for cmd in ['CREATE TABLE', 'INSERT INTO', 'CREATE INDEX']):
            sqlite_lines.append(line)
    
    with open(output_file, 'w') as f:
        f.write('\n'.join(sqlite_lines))
    
    print(f"✅ Conversion complete: {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 postgres_to_sqlite.py <input.sql> <output.sql>")
        sys.exit(1)
    
    convert_postgres_to_sqlite(sys.argv[1], sys.argv[2])
