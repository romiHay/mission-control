import express from 'express';
import cors from 'cors';
import { pool } from './db';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- MISSIONS ---
app.get('/api/missions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                uuid as id, 
                mission_name_english as name, 
                mission_name_hebrew as "nameHebrew",
                '' as description -- Default description if not in DB
            FROM web_general.missions_data
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch missions' });
    }
});

// --- GEOMETRIES ---
app.get('/api/geometries', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                g.uuid as id,
                g.geometry_name as name,
                ST_AsGeoJSON(g.geometry)::json as geojson,
                gt.mission_uuid as "missionId",
                COALESCE(
                    (SELECT uuid FROM missions.qa WHERE geometry_uuid = g.uuid LIMIT 1),
                    (SELECT uuid FROM missions.new_missions WHERE geometry_uuid = g.uuid LIMIT 1)
                ) as "ruleId"
            FROM web_general.geometries g
            LEFT JOIN web_general.geometry_to_team gt ON g.uuid = gt.geometry_uuid
        `);

        const formatted = result.rows.map(row => {
            const geo = row.geojson;
            let coords = geo.coordinates;

            // GeoJSON is [lng, lat], Leaflet is [lat, lng]
            if (geo.type === 'Point') {
                coords = [coords[1], coords[0]];
            } else if (geo.type === 'Polygon') {
                // GeoJSON polygons are nested [[[lng, lat], ...]]
                // Leaflet wants [[lat, lng], ...]
                coords = coords[0].map((c: any) => [c[1], c[0]]);
            }

            return {
                id: row.id,
                name: row.name,
                missionId: row.missionId,
                type: geo.type,
                coordinates: coords,
                ruleId: row.ruleId
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch geometries' });
    }
});

// --- RULES ---
// Mapping QA and New Missions to "Rules" for the frontend
app.get('/api/rules', async (req, res) => {
    try {
        // Fetch QA rules
        const qaResult = await pool.query(`
            SELECT 
                uuid as id,
                code_name as name,
                'QA Check: ' || frequency as description,
                'Checks: ' || checks_amount || ', Percent: ' || check_precent || '%' as value,
                geometry_uuid as "geometryId",
                json_build_object(
                    'code_name', code_name,
                    'frequency', frequency,
                    'code_type', code_type,
                    'checks_amount', checks_amount,
                    'check_precent', check_precent
                ) as parameters
            FROM missions.qa
        `);

        // Fetch New Mission rules
        const nmResult = await pool.query(`
            SELECT 
                uuid as id,
                nm_values as name,
                'Status: ' || status || ' | Type: ' || type as description,
                'MPT: ' || mpt_values as value,
                geometry_uuid as "geometryId",
                json_build_object(
                    'nm_values', nm_values,
                    'status', status,
                    'type', type,
                    'mpt_values', mpt_values,
                    'h_values', h_values,
                    'nm_id', nm_id
                ) as parameters
            FROM missions.new_missions
        `);

        // We need the missionId for these rules. 
        // In this schema, we can get it via the geometry -> geometry_to_team link.
        const allRules = [...qaResult.rows, ...nmResult.rows];

        // Enrich rules with missionId
        const enrichedRules = await Promise.all(allRules.map(async (rule) => {
            if (rule.geometryId) {
                const missionRes = await pool.query(
                    'SELECT mission_uuid FROM web_general.geometry_to_team WHERE geometry_uuid = $1 LIMIT 1',
                    [rule.geometryId]
                );
                return {
                    ...rule,
                    missionId: missionRes.rows[0]?.mission_uuid || null
                };
            }
            return { ...rule, missionId: null };
        }));

        res.json(enrichedRules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});

app.post('/api/rules', async (req, res) => {
    const { rule, newGeo } = req.body;
    const { missionId, name, description, value, geometryId } = rule;

    try {
        // 1. Determine which table to use based on mission name
        const missionResult = await pool.query(
            'SELECT mission_name_english FROM web_general.missions_data WHERE uuid = $1',
            [missionId]
        );

        if (missionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        const missionName = missionResult.rows[0].mission_name_english;
        let finalGeoId = geometryId;

        // 2. If new geometry provided, save it first
        if (newGeo) {
            const geoRes = await pool.query(`
                INSERT INTO web_general.geometries (geometry_name, geometry)
                VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))
                RETURNING uuid
            `, [newGeo.name, JSON.stringify({
                type: newGeo.type,
                coordinates: newGeo.type === 'Point'
                    ? [newGeo.coordinates[1], newGeo.coordinates[0]] // [lng, lat]
                    : [newGeo.coordinates.map((c: any) => [c[1], c[0]])] // [[[lng, lat], ...]]
            })]);

            finalGeoId = geoRes.rows[0].uuid;

            // Link geometry to mission and a default team (if needed)
            // Using a dummy team uuid for now or looking up one
            await pool.query(`
                INSERT INTO web_general.geometry_to_team (geometry_uuid, mission_uuid, team_uuid)
                VALUES ($1, $2, (SELECT uuid FROM web_general.teams LIMIT 1))
                ON CONFLICT DO NOTHING
            `, [finalGeoId, missionId]);
        }

        // 3. Insert into correct mission table
        const { parameters = {} } = rule;

        if (missionName === 'qa') {
            await pool.query(`
                INSERT INTO missions.qa (code_name, frequency, code_type, geometry_uuid, checks_amount, check_precent)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                parameters.code_name || name,
                parameters.frequency || description,
                parameters.code_type || value,
                finalGeoId,
                parameters.checks_amount || 1,
                parameters.check_precent || 100
            ]);
        } else if (missionName === 'new_missions') {
            await pool.query(`
                INSERT INTO missions.new_missions (nm_values, status, type, geometry_uuid, h_values, nm_id, mpt_values)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                parameters.nm_values || name,
                parameters.status || description,
                parameters.type || value,
                finalGeoId,
                parameters.h_values || 'default',
                parameters.nm_id || 'default',
                parameters.mpt_values || 'default'
            ]);
        } else {
            return res.status(400).json({ error: `Unknown mission type: ${missionName}` });
        }

        res.status(201).json({ message: 'Rule saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save rule' });
    }
});

app.put('/api/rules/:id', async (req, res) => {
    const { id } = req.params;
    const { rule, newGeo } = req.body;
    const { missionId, name, description, value, geometryId, parameters = {} } = rule;

    try {
        // 1. Determine which table to use
        const missionResult = await pool.query(
            'SELECT mission_name_english FROM web_general.missions_data WHERE uuid = $1',
            [missionId]
        );

        if (missionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        const missionName = missionResult.rows[0].mission_name_english;
        let finalGeoId = geometryId;

        // 2. Insert new geometry if provided (same as POST)
        if (newGeo) {
            const geoRes = await pool.query(`
                INSERT INTO web_general.geometries (geometry_name, geometry)
                VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))
                RETURNING uuid
            `, [newGeo.name, JSON.stringify({
                type: newGeo.type,
                coordinates: newGeo.type === 'Point'
                    ? [newGeo.coordinates[1], newGeo.coordinates[0]]
                    : [newGeo.coordinates.map((c: any) => [c[1], c[0]])]
            })]);
            finalGeoId = geoRes.rows[0].uuid;

            await pool.query(`
                INSERT INTO web_general.geometry_to_team (geometry_uuid, mission_uuid, team_uuid)
                VALUES ($1, $2, (SELECT uuid FROM web_general.teams LIMIT 1))
                ON CONFLICT DO NOTHING
            `, [finalGeoId, missionId]);
        }

        // 3. Update correct mission table
        if (missionName === 'qa') {
            await pool.query(`
                UPDATE missions.qa 
                SET code_name = $1, frequency = $2, code_type = $3, geometry_uuid = $4, checks_amount = $5, check_precent = $6
                WHERE uuid = $7
            `, [
                parameters.code_name || name,
                parameters.frequency || description,
                parameters.code_type || value,
                finalGeoId,
                parameters.checks_amount || 1,
                parameters.check_precent || 100,
                id
            ]);
        } else if (missionName === 'new_missions') {
            await pool.query(`
                UPDATE missions.new_missions 
                SET nm_values = $1, status = $2, type = $3, geometry_uuid = $4, h_values = $5, nm_id = $6, mpt_values = $7
                WHERE uuid = $8
            `, [
                parameters.nm_values || name,
                parameters.status || description,
                parameters.type || value,
                finalGeoId,
                parameters.h_values || 'default',
                parameters.nm_id || 'default',
                parameters.mpt_values || 'default',
                id
            ]);
        }

        res.json({ message: 'Rule updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update rule' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
