import { Mission, Rule, MissionGeometry } from '../types';

const API_BASE = 'http://localhost:3001/api';

export const api = {
    async getMissions(): Promise<Mission[]> {
        const res = await fetch(`${API_BASE}/missions`);
        return res.json();
    },

    async getRules(missionId: string): Promise<Rule[]> {
        const res = await fetch(`${API_BASE}/missions/${missionId}/rules`);
        return res.json();
    },

    async getGeometries(missionId: string): Promise<MissionGeometry[]> {
        const res = await fetch(`${API_BASE}/missions/${missionId}/geometries`);
        return res.json();
    },

    async addRule(missionId: string, rule: Rule): Promise<void> {
        await fetch(`${API_BASE}/missions/${missionId}/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
        });
    },

    async addGeometry(missionId: string, geo: MissionGeometry): Promise<void> {
        await fetch(`${API_BASE}/missions/${missionId}/geometries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geo),
        });
    },

    async createMission(id: string, name: string): Promise<void> {
        await fetch(`${API_BASE}/missions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name }),
        });
    }
};
