import 'dotenv/config';
import { Pool } from 'pg';

console.log('ENV CHECK:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

export const pool = new Pool({
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
    await pool.query('CREATE SCHEMA IF NOT EXISTS web_general');
    await pool.query('CREATE SCHEMA IF NOT EXISTS missions');

    // 4. Create tables - web general schema
    await pool.query(`
        CREATE TABLE IF NOT EXISTS web_general.missions_data (
        uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mission_name_english TEXT UNIQUE NOT NULL,
        mission_name_hebrew TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS web_general.geometries (
        uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        geometry_name TEXT UNIQUE NOT NULL,
        geometry geometry NOT NULL
        );

        CREATE TABLE IF NOT EXISTS web_general.users (
        uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        display_name TEXT NOT NULL,
        full_display_name TEXT NOT NULL,
        origin_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hierarchy TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS web_general.teams (
        uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        team_name TEXT UNIQUE NOT NULL,
        team TEXT NOT NULL,
        parent_uuid TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS web_general.geometry_to_team (
        geometry_uuid UUID NOT NULL,
        mission_uuid UUID NOT NULL,
        team_uuid UUID NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        PRIMARY KEY (geometry_uuid, mission_uuid, team_uuid)
        );

        CREATE TABLE IF NOT EXISTS web_general.user_to_team (
        team_uuid UUID NOT NULL,
        user_uuid UUID NOT NULL,
        user_role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        PRIMARY KEY (team_uuid, user_uuid)
        );
    `);

    // 5. Create tables - missions schema, all rule tables
    await pool.query(`
        CREATE TABLE IF NOT EXISTS missions.qa (
        uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        checks_amount INT NOT NULL,
        geometry_uuid UUID NOT NULL,
        frequency TEXT NOT NULL,
        code_name TEXT NOT NULL,
        code_type TEXT NOT NULL,
        check_precent INT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS missions.new_missions (
        uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        h_values TEXT NOT NULL,
        nm_values TEXT NOT NULL,
        nm_id TEXT NOT NULL,
        mpt_values TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        geometry_uuid UUID,
        from_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
        );
    `);
};