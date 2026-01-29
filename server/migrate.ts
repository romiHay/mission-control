import 'dotenv/config';
import { createMissionTables, addRule, addGeometry, initDB } from './db';
import { INITIAL_MISSIONS, INITIAL_RULES, INITIAL_GEOMETRIES } from '../mockData';

async function migrate() {
    console.log('Starting migration to PostgreSQL...');

    await initDB();

    for (const mission of INITIAL_MISSIONS) {
        console.log(`Creating tables for mission: ${mission.name}`);
        const nameHebrew = mission.name === 'Desert Sentinel' ? 'שומר המדבר' : (mission.name === 'Oceanic Reach' ? 'הישג אוקיאני' : 'רשת עירונית');
        const { rulesTable, geometriesTable } = await createMissionTables(mission.id, mission.name, nameHebrew);

        // Filter rules for this mission
        const missionRules = INITIAL_RULES.filter(r => r.missionId === mission.id);
        for (const rule of missionRules) {
            await addRule(rulesTable, rule);
        }

        // Filter geometries for this mission
        const missionGeometries = INITIAL_GEOMETRIES.filter(g => g.missionId === mission.id);
        for (const geo of missionGeometries) {
            await addGeometry(geometriesTable, geo);
        }
    }

    console.log('Migration complete!');
}

migrate().catch(console.error);
