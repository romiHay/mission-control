import { Mission, Rule, MissionGeometry } from '../types';

// ============================================================================
// BASE CONFIGURATION
// ============================================================================
// The root URL for all your API requests. If you change your server address, you only need to change it here.
const BASE_URL = 'http://localhost:8000/api';

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
            // We tell the server we are sending and expecting JSON data
            'Content-Type': 'application/json',
        },
    };

    // If we have data to send, we turn it into a JSON string and attach it to the request
    if (body) {
        options.body = JSON.stringify(body);
    }

    // Execute the network request
    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    // If the server returns a bad status (like 404 Not Found or 500 Internal Error)
    if (!response.ok) {
        // Try to read the exact error details from the server, otherwise use the fallback message
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || customErrorMessage);
    }

    // Convert the valid response back into JavaScript objects and return it
    return response.json();
}

// ============================================================================
// API METHODS
// ============================================================================
// We export an object called 'api' that groups all your server communication functions.
export const api = {
    
    // --- GET METHODS (Fetching data from the server) ---
    
    fetchMissions: () => genericFetch<Mission[]>('/missions'),
    
    fetchGeometries: () => genericFetch<MissionGeometry[]>('/geometries'),
    
    fetchRules: () => genericFetch<Rule[]>('/rules'),

    // --- POST & PUT METHODS (Creating and Updating data) ---
    
    /**
     * Adds a new rule and its geometries.
     */
    addRule: (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[], newGeos?: MissionGeometry[]) => {
        // This ensures 'geos' is always an array, whether you provide a single item, multiple, or none
        const geos = Array.isArray(newGeo) ? newGeo : (newGeo ? [newGeo] : (newGeos || []));
        
        // We use our generic function, passing the specific endpoint, method, and the body data
        return genericFetch<any>('/rules', 'POST', { rule, newGeos: geos }, 'שגיאה בשמירת החוק מול השרת');
    },

    /**
     * Updates an existing rule by its ID.
     */
    updateRule: (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[], newGeos?: MissionGeometry[]) => {
        const geos = Array.isArray(newGeo) ? newGeo : (newGeo ? [newGeo] : (newGeos || []));
        
        return genericFetch<any>(`/rules/${rule.id}`, 'PUT', { rule, newGeos: geos }, 'שגיאה בעדכון החוק מול השרת');
    },

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

    // --- DELETE METHODS (Removing data) ---

    deleteRule: (ruleId: string) => {
        // Since we are deleting, we don't need to send a body, so we pass 'undefined'
        return genericFetch<any>(`/rules/${ruleId}`, 'DELETE', undefined, 'Failed to delete rule');
    },

    deleteGeometry: (geoId: string) => {
        return genericFetch<any>(`/geometries/${geoId}`, 'DELETE', undefined, 'Failed to delete geometry');
    },

    deleteGeometries: (geoIds: string[]) => {
        // Here we send the array of IDs in the body, so we use POST (since some servers don't like bodies in DELETE requests for bulk ops)
        return genericFetch<any>('/geometries/bulk-delete', 'POST', geoIds, 'Failed to bulk delete geometries');
    }
};
