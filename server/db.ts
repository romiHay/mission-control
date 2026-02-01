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

// Initialize schemas and main registry
export const initDB = async () => {
  // 1. ENABLE UUID EXTENSION (Required for uuid_generate_v4)
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); 

  // Create schemas
  await pool.query('CREATE SCHEMA IF NOT EXISTS general');
  await pool.query('CREATE SCHEMA IF NOT EXISTS geometries');
  await pool.query('CREATE SCHEMA IF NOT EXISTS missions');

  // Create missions_order table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS general.missions_order (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mission_name_english TEXT NOT NULL,
      mission_name_hebrew TEXT NOT NULL,
      geometries_table_name TEXT NOT NULL,
      rules_table_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const getMissions = async () => {
  const res = await pool.query('SELECT * FROM general.missions_order');
  return res.rows.map(m => ({
    id: m.id,
    name: m.mission_name_english,
    nameHebrew: m.mission_name_hebrew,
    geometries_table: m.geometries_table_name,
    rules_table: m.rules_table_name
  }));
};

// 2. FIXED FUNCTION
export const createMissionTables = async (missionId: string, nameEnglish: string, nameHebrew: string = '') => {
  // We keep 'm1' here to name the tables nicely (e.g. missions.rules_m1)
  const safeId = missionId.replace(/-/g, '_').toLowerCase();
  const rulesTable = `missions.rules_${safeId}`;
  const geometriesTable = `geometries.geo_${safeId}`;

  // Register the mission
  // REMOVED 'id' from the INSERT. Postgres will now auto-generate a real UUID.
  await pool.query(
    `INSERT INTO general.missions_order (mission_name_english, mission_name_hebrew, geometries_table_name, rules_table_name) 
     VALUES ($1, $2, $3, $4)`,
    [nameEnglish, nameHebrew, geometriesTable, rulesTable]
  );

  // Create the rules table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${rulesTable} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      value TEXT,
      geometry_uuid UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create the geometries table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${geometriesTable} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      geometry_wkb BYTEA,
      geometry_json JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return { rulesTable, geometriesTable };
};

export const getRules = async (tableName: string) => {
  const res = await pool.query(`SELECT * FROM ${tableName}`);
  return res.rows.map(r => ({ ...r, geometryId: r.geometry_uuid }));
};

export const getGeometries = async (tableName: string) => {
  const res = await pool.query(`SELECT * FROM ${tableName}`);
  return res.rows.map(g => ({
    id: g.id,
    coordinates: g.geometry_json 
  }));
};

export const addRule = async (tableName: string, rule: any) => {
  // REMOVED explicit ID insert here too, unless 'rule.id' is definitely a UUID
  const query = `
    INSERT INTO ${tableName} (name, description, value, geometry_uuid)
    VALUES ($1, $2, $3, $4)
  `;
  return pool.query(query, [rule.name, rule.description, rule.value, rule.geometryId || null]);
};

export const addGeometry = async (tableName: string, geo: any) => {
   // REMOVED explicit ID insert here too
  const query = `
    INSERT INTO ${tableName} (geometry_json)
    VALUES ($1)
  `;
  return pool.query(query, [JSON.stringify(geo.coordinates)]);
};

export default pool;
