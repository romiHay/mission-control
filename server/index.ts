import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
    getMissions,
    createMissionTables,
    getRules,
    getGeometries,
    addRule,
    addGeometry,
    initDB
} from './db';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Initialize DB before starting
initDB().catch(console.error);

// Get all missions and their table mappings
app.get('/api/missions', async (req, res) => {
    try {
        const missions = await getMissions();
        res.json(missions);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Create a new mission and its tables
app.post('/api/missions', async (req, res) => {
    const { id, nameEnglish, nameHebrew } = req.body;
    try {
        const tableInfo = await createMissionTables(id, nameEnglish, nameHebrew);
        res.json({ success: true, ...tableInfo });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Get rules for a specific mission
app.get('/api/missions/:missionId/rules', async (req, res) => {
    const { missionId } = req.params;
    try {
        const missions = await getMissions();
        const mission = (missions as any[]).find(m => m.id === missionId);

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        const rules = await getRules(mission.rules_table);
        res.json(rules.map((r: any) => ({ ...r, enabled: !!r.enabled })));
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Get geometries for a specific mission
app.get('/api/missions/:missionId/geometries', async (req, res) => {
    const { missionId } = req.params;
    try {
        const missions = await getMissions();
        const mission = (missions as any[]).find(m => m.id === missionId);

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        const geometries = await getGeometries(mission.geometries_table);
        res.json(geometries);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Add a rule to a mission
app.post('/api/missions/:missionId/rules', async (req, res) => {
    const { missionId } = req.params;
    try {
        const missions = await getMissions();
        const mission = (missions as any[]).find(m => m.id === missionId);

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        await addRule(mission.rules_table, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// Add a geometry to a mission
app.post('/api/missions/:missionId/geometries', async (req, res) => {
    const { missionId } = req.params;
    try {
        const missions = await getMissions();
        const mission = (missions as any[]).find(m => m.id === missionId);

        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }

        await addGeometry(mission.geometries_table, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
