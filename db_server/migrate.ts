import 'dotenv/config';
import { initDB, pool } from './db';
import { WEB_GENERAL_MOCK_DATA } from '../mockData';

async function migrate() {
    console.log('Starting migration to PostgreSQL...');

    await initDB();

    console.log('Seeding web_general tables...');

    const missionUuids: string[] = [];
    const userUuids: string[] = [];
    const teamUuids: string[] = [];
    const geometryUuids: string[] = [];

    // Seed missions_data
    for (const mission of WEB_GENERAL_MOCK_DATA.missions_data) {
        const res = await pool.query(
            'INSERT INTO web_general.missions_data (mission_name_english, mission_name_hebrew) VALUES ($1, $2) ON CONFLICT (mission_name_english) DO UPDATE SET mission_name_hebrew = EXCLUDED.mission_name_hebrew RETURNING uuid',
            [mission.mission_name_english, mission.mission_name_hebrew]
        );
        if (res.rows[0]) missionUuids.push(res.rows[0].uuid);
    }
    // If conflict happened and no returning (though I changed it to update), fetch existing
    if (missionUuids.length === 0) {
        const res = await pool.query('SELECT uuid FROM web_general.missions_data');
        missionUuids.push(...res.rows.map(r => r.uuid));
    }

    // Seed users
    for (const user of WEB_GENERAL_MOCK_DATA.users) {
        const res = await pool.query(
            'INSERT INTO web_general.users (display_name, full_display_name, origin_name, email, hierarchy) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING uuid',
            [user.display_name, user.full_display_name, user.origin_name, user.email, user.hierarchy]
        );
        if (res.rows[0]) userUuids.push(res.rows[0].uuid);
    }
    if (userUuids.length === 0) {
        const res = await pool.query('SELECT uuid FROM web_general.users');
        userUuids.push(...res.rows.map(r => r.uuid));
    }

    // Seed teams
    for (const team of WEB_GENERAL_MOCK_DATA.teams) {
        const res = await pool.query(
            'INSERT INTO web_general.teams (team_name, team, parent_uuid) VALUES ($1, $2, $3) ON CONFLICT (team_name) DO UPDATE SET team = EXCLUDED.team RETURNING uuid',
            [team.team_name, team.team, team.parent_uuid]
        );
        if (res.rows[0]) teamUuids.push(res.rows[0].uuid);
    }
    if (teamUuids.length === 0) {
        const res = await pool.query('SELECT uuid FROM web_general.teams');
        teamUuids.push(...res.rows.map(r => r.uuid));
    }

    // Seed geometries
    for (const geo of WEB_GENERAL_MOCK_DATA.geometries) {
        const res = await pool.query(
            'INSERT INTO web_general.geometries (geometry_name, geometry) VALUES ($1, ST_GeomFromText($2, 4326)) ON CONFLICT (geometry_name) DO UPDATE SET geometry = EXCLUDED.geometry RETURNING uuid',
            [geo.geometry_name, geo.geometry]
        );
        if (res.rows[0]) geometryUuids.push(res.rows[0].uuid);
    }
    if (geometryUuids.length === 0) {
        const res = await pool.query('SELECT uuid FROM web_general.geometries');
        geometryUuids.push(...res.rows.map(r => r.uuid));
    }

    console.log('Generating random relationships...');

    // Seed user_to_team (Relationships between Users and Teams)
    const roles = ['Team Lead', 'Operator', 'Analyst', 'Viewer'];
    for (const userUuid of userUuids) {
        // Assign each user to at least one random team
        const randomTeam = teamUuids[Math.floor(Math.random() * teamUuids.length)];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        await pool.query(
            'INSERT INTO web_general.user_to_team (team_uuid, user_uuid, user_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [randomTeam, userUuid, randomRole]
        );
    }

    // Seed geometry_to_team (Relationships between Geometries, Missions, and Teams)
    for (const geoUuid of geometryUuids) {
        // Link each geometry to a random mission and a random team
        const randomMission = missionUuids[Math.floor(Math.random() * missionUuids.length)];
        const randomTeam = teamUuids[Math.floor(Math.random() * teamUuids.length)];
        await pool.query(
            'INSERT INTO web_general.geometry_to_team (geometry_uuid, mission_uuid, team_uuid) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [geoUuid, randomMission, randomTeam]
        );
    }

    console.log('Web general seeding complete.');
    console.log('Migration complete!');
}

migrate().catch(console.error).finally(() => pool.end());