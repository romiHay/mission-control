
export type GeometryType = 'Point' | 'Polygon';
export type ViewMode = 'rules' | 'statistics';

export interface MissionGeometry {
  id: string;
  missionId: string;
  teamIds: string[]; // Support multiple teams
  type: GeometryType;
  coordinates: number[] | number[][]; // [lat, lng] or [[lat, lng], ...]
  name: string;
  ruleId?: string; // Links back to a rule if applicable
  createdBy: 'system' | 'user'; // Source of creation
  system_uuid?: string; // New field from system
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  uuid: string;
  name: string;
}

export interface User {
  uuid: string;
  username: string;
  full_name: string;
  teams: Team[];
}

export interface Rule {
  id: string;
  missionId: string;
  teamIds: string[]; // Support multiple teams
  name: string;
  description: string;
  value: string;
  geometryId?: string;
  geometryIds?: string[];
  // Dynamic parameters for different mission types
  parameters?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormFieldCondition {
  field: string;
  values: any[];
}

export interface FormFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'geometry';
  options?: string[]; // Used if type is 'select'
  condition?: FormFieldCondition; // E.g., only show if frequency is "חודשי"
  min?: number;
  max?: number;
  required?: boolean;
  mode?: 'select-only' | 'all'; // Used if type is 'geometry'
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
