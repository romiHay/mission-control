
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

export interface FormFieldCondition {
  field: string;
  values: any[];
}

export interface FormFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[]; // Used if type is 'select'
  condition?: FormFieldCondition; // E.g., only show if frequency is "חודשי"
  min?: number;
  max?: number;
}

export interface Mission {
  id: string;
  name: string;
  nameHebrew: string;
  description: string;
  ui_schema?: FormFieldDef[]; // Schema from the API!
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
