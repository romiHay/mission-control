import pkg from 'pg';
const { Pool } = pkg;

console.log('ENV CHECK:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
}); // check if the connection info is correct

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
}); // connect to the my data base

// Initialize schemas and main registry
export const initDB = async () => {
    // Create schemas
    await pool.query('CREATE SCHEMA IF NOT EXISTS general');
    await pool.query('CREATE SCHEMA IF NOT EXISTS geometries');
    await pool.query('CREATE SCHEMA IF NOT EXISTS missions');

    // Create missions_order table in general schema
    await pool.query(`
    CREATE TABLE IF NOT EXISTS general.missions_order (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

export const createMissionTables = async (missionId: string, nameEnglish: string, nameHebrew: string = '') => {
    const safeId = missionId.replace(/-/g, '_').toLowerCase();
    const rulesTable = `missions.rules_${safeId}`;
    const geometriesTable = `geometries.geo_${safeId}`;

    // Register the mission in general.missions_order
    await pool.query(
        `INSERT INTO general.missions_order (id, mission_name_english, mission_name_hebrew, geometries_table_name, rules_table_name) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (id) DO UPDATE SET 
          mission_name_english = EXCLUDED.mission_name_english, 
          mission_name_hebrew = EXCLUDED.mission_name_hebrew`,
        [missionId, nameEnglish, nameHebrew, geometriesTable, rulesTable]
    );

    // Create the rules table for this mission in the missions schema
    await pool.query(`
    CREATE TABLE IF NOT EXISTS ${rulesTable} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      value TEXT,
      geometry_uuid UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create the geometries table for this mission in the geometries schema
    await pool.query(`
    CREATE TABLE IF NOT EXISTS ${geometriesTable} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        coordinates: g.geometry_json // Assuming coordinates are stored here for the frontend
    }));
};

export const addRule = async (tableName: string, rule: any) => {
    const query = `
    INSERT INTO ${tableName} (id, name, description, value, geometry_uuid)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO NOTHING
  `;
    return pool.query(query, [rule.id, rule.name, rule.description, rule.value, rule.geometryId || null]);
};

export const addGeometry = async (tableName: string, geo: any) => {
    const query = `
    INSERT INTO ${tableName} (id, geometry_json)
    VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING
  `;
    return pool.query(query, [geo.id, JSON.stringify(geo.coordinates)]);
};

export default pool;
