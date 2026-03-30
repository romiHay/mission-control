
import { Mission, Rule, MissionGeometry } from '../types';

const BASE_URL = 'http://localhost:8000/api';

export const api = {
    fetchMissions: async (): Promise<Mission[]> => {
        const res = await fetch(`${BASE_URL}/missions`);
        return res.json();
    },
    fetchGeometries: async (): Promise<MissionGeometry[]> => {
        const res = await fetch(`${BASE_URL}/geometries`);
        return res.json();
    },
    fetchRules: async (): Promise<Rule[]> => {
        const res = await fetch(`${BASE_URL}/rules`);
        return res.json();
    },
    addRule: async (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[], newGeos?: MissionGeometry[]) => {
        const geos = Array.isArray(newGeo) ? newGeo : (newGeo ? [newGeo] : (newGeos || []));
        const res = await fetch(`${BASE_URL}/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rule, newGeos: geos }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || 'שגיאה בשמירת החוק מול השרת');
        }
        return res.json();
    },
    updateRule: async (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[], newGeos?: MissionGeometry[]) => {
        const geos = Array.isArray(newGeo) ? newGeo : (newGeo ? [newGeo] : (newGeos || []));
        const res = await fetch(`${BASE_URL}/rules/${rule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rule, newGeos: geos }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || 'שגיאה בעדכון החוק מול השרת');
        }
        return res.json();
    },
    deleteRule: async (ruleId: string) => {
        const res = await fetch(`${BASE_URL}/rules/${ruleId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete rule');
        return res.json();
    },
    deleteGeometry: async (geoId: string) => {
        const res = await fetch(`${BASE_URL}/geometries/${geoId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete geometry');
        return res.json();
    }
};
