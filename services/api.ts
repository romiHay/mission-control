import { Mission, Rule, MissionGeometry } from '../types';

// ============================================================================
// BASE CONFIGURATION
// ============================================================================
// The root URL for all your API requests. If you change your server address, you only need to change it here.
// The root URL for all your API requests.
// By using '/api', Vite will proxy these requests and log them in your terminal!
const BASE_URL = '/api';

/**
 * A generic, reusable function to handle all HTTP requests (GET, POST, PUT, DELETE).
 * Why is this useful? 
 * 1. It saves writing the same fetch logic (headers, error checking) over and over.
 * 2. It handles errors consistently in one place.
 * 
 * @param endpoint - The path you want to hit (e.g., '/missions'). Will be attached to BASE_URL.
 * @param method - The HTTP method to use ('GET', 'POST', 'PUT', 'DELETE'). Defaults to 'GET'.
 * @param body - The data you want to send (optional). It will be automatically converted to JSON.
 * @param customErrorMessage - A fallback error message if the server doesn't return a specific error.
 */
async function genericFetch<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    customErrorMessage: string = 'שגיאה בפנייה לשרת'
): Promise<T> {
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        // the data we want to send if we have any
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options); // execute the request to the backend

        if (!response.ok) {
            // Try to read the exact error details from the server, otherwise use the fallback message
            const errData = await response.json().catch(() => null);
            console.log(`Error for API call: ${BASE_URL}${endpoint}. STATUS: ${response.status}. MSG: ${errData?.detail || customErrorMessage}`);
            throw new Error(errData?.detail || customErrorMessage);
        }

        console.log(`Success for API call: ${BASE_URL}${endpoint}`);
        return response.json();
    } catch (err: any) {
        // Handle network errors or other unexpected crashes
        if (!(err instanceof Error) || err.message !== (err as any).detail) {
            console.error(`Network or unexpected error for API call: ${BASE_URL}${endpoint}:`, err);
        }
        throw err;
    }
}


export const api = {

    fetchMissions: () => genericFetch<Mission[]>('/missions/'),
    fetchGeometries: (missionId?: string) => genericFetch<MissionGeometry[]>(missionId ? `/geometries/?mission_id=${missionId}` : '/geometries/'),
    fetchRules: (missionId?: string) => genericFetch<Rule[]>(missionId ? `/rules/?mission_id=${missionId}` : '/rules/'),

    // === RULES APIS === //

    /**
     * Adds a new rule and its geometries.
     */

    addRule: (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[], newGeos?: MissionGeometry[]) => {
        // This ensures 'geos' is always an array, whether you provide a single item, multiple, or none
        const geos = Array.isArray(newGeo) ? newGeo : (newGeo ? [newGeo] : (newGeos || []));
        return genericFetch<any>('/rules/create-rule/', 'POST', { rule, newGeos: geos }, 'שגיאה בשמירת החוק מול השרת');
    },

    /**
     * Updates an existing rule by its ID.
     */
    updateRule: (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[], newGeos?: MissionGeometry[]) => {
        const geos = Array.isArray(newGeo) ? newGeo : (newGeo ? [newGeo] : (newGeos || []));
        return genericFetch<any>(`/rules/update-rule-${rule.id}/`, 'PUT', { rule, newGeos: geos }, 'שגיאה בעדכון החוק מול השרת');
    },

    /**
     * deletes an existing rule by its ID.
     */
    deleteRule: (ruleId: string) => {
        return genericFetch<any>(`/rules/delete-rule-${ruleId}/`, 'DELETE', undefined, 'Failed to delete rule');
    },

    // === GEOMETRIES APIS === //

    /**
     * deletes an existing geometry by its ID.
     */
    deleteGeometry: (geoId: string) => {
        return genericFetch<any>(`/geometries/delete-geometry-${geoId}/`, 'DELETE', undefined, 'Failed to delete geometry');
    },

    /**
     * deletes an existing geometries by their IDs.
     */
    deleteGeometries: (geoIds: string[]) => {
        return genericFetch<any>('/geometries/bulk-delete-geometries/', 'DELETE', geoIds, 'Failed to bulk delete geometries');
    },

    // NOT IN USE FOR NOW!! - RULES API

    /**
     * Bulk save rules. Helpful when you want to save many rules at once instead of one by one.
     */
    addBulkRules: (items: any[]) => {
        return genericFetch<any>('/rules/bulk', 'POST', items, 'שגיאה בשמירת חוקים מול השרת');
    },

    /**
     * Bulk update rules.
     */
    updateBulkRules: (items: any[]) => {
        return genericFetch<any>('/rules/bulk', 'PUT', items, 'שגיאה בעדכון חוקים מול השרת');
    },
};
