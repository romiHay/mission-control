import { Pool } from 'pg';

console.log('ENV CHECK:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

export const initDB = async () => {
    // 1. Enable PostGIS for geometry support (REQUIRED for your project)
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');

    // 2. Enable UUID support
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 3. Create schemas
    await pool.query('CREATE SCHEMA IF NOT EXISTS general');
    await pool.query('CREATE SCHEMA IF NOT EXISTS geometries');
    await pool.query('CREATE SCHEMA IF NOT EXISTS missions');

    // ... rest of your code
};