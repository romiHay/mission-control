
import { Mission, Rule, MissionGeometry } from './types';

export const INITIAL_MISSIONS: Mission[] = [
  { id: 'm1', name: 'Desert Sentinel', description: 'Surveillance of perimeter alpha in the southern sector.' },
  { id: 'm2', name: 'Oceanic Reach', description: 'Monitoring deep sea sensors near the continental shelf.' },
  { id: 'm3', name: 'Urban Grid', description: 'Public safety analysis in downtown metropolitan area.' },
];

export const INITIAL_GEOMETRIES: MissionGeometry[] = [
  { id: 'g1', missionId: 'm1', type: 'Point', coordinates: [34.0522, -118.2437], name: 'Alpha Gate', ruleId: 'r1' },
  { id: 'g2', missionId: 'm1', type: 'Polygon', coordinates: [[34.05, -118.25], [34.06, -118.25], [34.06, -118.24], [34.05, -118.24]], name: 'No Fly Zone 1', ruleId: 'r2' },
  { id: 'g3', missionId: 'm1', type: 'Point', coordinates: [34.058, -118.248], name: 'Secondary Observation Post' }, // No rule
  { id: 'g4', missionId: 'm2', type: 'Point', coordinates: [33.8121, -117.9190], name: 'Sea Buoy X-4' },
];

export const INITIAL_RULES: Rule[] = [
  { id: 'r1', missionId: 'm1', name: 'Entry Protocol', description: 'All personnel must check in via biometrics at Alpha Gate.', value: 'Strict Biometric Auth', geometryId: 'g1' },
  { id: 'r2', missionId: 'm1', name: 'Air Restriction', description: 'Unauthorized drones will be jammed immediately.', value: 'Signal Jamming Active', geometryId: 'g2' },
  { id: 'r3', missionId: 'm1', name: 'General Safety', description: 'Hard hats required at all times across all sites.', value: 'PPE Level 2', geometryId: undefined },
];
