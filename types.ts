
export type GeometryType = 'Point' | 'Polygon';
export type ViewMode = 'rules' | 'statistics';

export interface MissionGeometry {
  id: string;
  missionId: string;
  type: GeometryType;
  coordinates: number[] | number[][]; // [lat, lng] or [[lat, lng], ...]
  name: string;
  ruleId?: string; // Links back to a rule if applicable
  createdBy: 'system' | 'user'; // Source of geometry creation
}

export interface Rule {
  id: string;
  missionId: string;
  name: string;
  description: string;
  value: string;
  geometryId?: string;
  geometryIds?: string[];
  // Dynamic parameters for different mission types
  parameters?: Record<string, any>;
}

export interface Mission {
  id: string;
  name: string;
  nameHebrew: string;
  description: string;
}

export interface MissionStats {
  ruleCount: number;
  geometryCount: number;
  unlinkedGeometryCount: number;
  coveragePercentage: number;
  lastUpdated: string;
}

export interface AppState {
  missions: Mission[];
  selectedMissionId: string | null;
  rules: Rule[];
  geometries: MissionGeometry[];
  viewMode: ViewMode;
}
