
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry, ViewMode, GeometryType } from '../../types';
import RuleAccordion from '../rules/RuleAccordion';
import MapDisplay from '../maps/MapDisplay';
import RuleForm from '../rules/RuleForm';
import BulkRuleForm from '../rules/BulkRuleForm';
import MissionStatsView from './MissionStatsView';
import MapOverlays from '../maps/MapOverlays';

interface MissionViewProps {
  mission: Mission;
  rules: Rule[];
  geometries: MissionGeometry[];
  activeRuleId: string | null;
  focusedGeoId: string | null;
  onAddRule: (rule: Rule, newGeo?: MissionGeometry) => void;
  onUpdateRule: (rule: Rule, newGeo?: MissionGeometry) => void;
  onDeleteRule: (id: string) => void;
  onSelectSpatialAsset: (missionId: string, ruleId?: string, geoId?: string) => void;
  onSetActiveRule: (id: string | null) => void;
  darkMode: boolean;
}

const MissionView: React.FC<MissionViewProps> = ({
  mission, rules, geometries, activeRuleId, focusedGeoId,
  onAddRule, onUpdateRule, onDeleteRule,
  onSelectSpatialAsset, onSetActiveRule, darkMode
}) => {
  const [openRuleId, setOpenRuleId] = useState<string | null>(activeRuleId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('rules');
  const [drawingState, setDrawingState] = useState<{ mode: GeometryType | null, isInline: boolean }>({ mode: null, isInline: false });
  const [tempGeo, setTempGeo] = useState<{ type: GeometryType, coordinates: any } | null>(null);
  const [toggles, setToggles] = useState({ reset: 0, zoomIn: 0, zoomOut: 0 });

  useEffect(() => setOpenRuleId(activeRuleId), [activeRuleId]);

  const missionRules = rules.filter(r => r.missionId === mission.id);
  const missionGeometries = geometries.filter(g => g.missionId === mission.id);

  const handleStartDrawing = (type: GeometryType, isInline?: boolean) => {
    setDrawingState({ mode: type, isInline: !!isInline });
    if (!isInline) setIsFormOpen(false);
  };

  const handleGeometryCaptured = useCallback((type: GeometryType, coords: any) => {
    setTempGeo({ type, coordinates: coords });
    setDrawingState({ mode: null, isInline: false });
    setIsFormOpen(true);
  }, []);

  const handleSaveRule = (rule: Rule) => {
    let newGeo: MissionGeometry | undefined;
    if (tempGeo) {
      newGeo = {
        id: `g-${Date.now()}`, missionId: mission.id, name: `Asset for ${rule.name}`,
        type: tempGeo.type, coordinates: tempGeo.coordinates, ruleId: rule.id
      };
      rule.geometryId = newGeo.id;
    }
    editingRule ? onUpdateRule(rule, newGeo) : onAddRule(rule, newGeo);
    setIsFormOpen(false);
    setTempGeo(null);
  };

  const handleSaveBulkRules = (baseRuleData: Partial<Rule>, selectedGeos: { id?: string, type: GeometryType, coords: any }[]) => {
    selectedGeos.forEach(item => {
      const ruleId = `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let geoToUse: MissionGeometry | undefined;

      if (item.id) {
        // Using existing geometry
        const existing = geometries.find(g => g.id === item.id);
        if (existing) {
          const rule: Rule = {
            id: ruleId,
            missionId: mission.id,
            name: baseRuleData.name || 'Untitled Rule',
            description: baseRuleData.description || '',
            value: baseRuleData.value || '',
            parameters: baseRuleData.parameters,
            geometryId: existing.id
          };
          onUpdateRule(rule); // This will link the rule to the geometry in the parent state
        }
      } else {
        // Using new geometry
        const newGeoId = `g-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newGeo: MissionGeometry = {
          id: newGeoId,
          missionId: mission.id,
          name: `Asset for ${baseRuleData.name}`,
          type: item.type,
          coordinates: item.coords,
          ruleId: ruleId
        };
        const rule: Rule = {
          id: ruleId,
          missionId: mission.id,
          name: baseRuleData.name || 'Untitled Rule',
          description: baseRuleData.description || '',
          value: baseRuleData.value || '',
          parameters: baseRuleData.parameters,
          geometryId: newGeoId
        };
        onAddRule(rule, newGeo);
      }
    });
    setIsBulkFormOpen(false);
  };

  return (
    <div className="h-full flex flex-col md:flex-row animate-fadeIn relative bg-gray-50 dark:bg-slate-950 font-heebo">
      <div className={`${viewMode === 'rules' ? 'w-full md:w-1/3' : 'w-full'} h-full flex flex-col border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 overflow-hidden relative transition-all`}>
        <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center text-right">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white leading-tight">{mission.nameHebrew}</h2>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-0.5">ניהול חוקים</span>
          </div>
          {viewMode === 'rules' && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsBulkFormOpen(true)}
                className="group relative flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
                title="הוספה מרובה"
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => { setEditingRule(undefined); setTempGeo(null); onSetActiveRule(null); setIsFormOpen(true); }}
                className="group relative flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
                title="הוספת חוק"
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" strokeWidth={2.5} strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16">
          {viewMode === 'rules' ? (
            <RuleAccordion rules={missionRules} openRuleId={openRuleId} onToggle={onSetActiveRule} onEdit={r => { setEditingRule(r); setTempGeo(null); setIsFormOpen(true); }} onDelete={id => confirm('האם למחוק?') && onDeleteRule(id)} geometries={missionGeometries} disabled={isFormOpen} />
          ) : (
            <MissionStatsView mission={mission} rules={missionRules} geometries={missionGeometries} />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-3 flex gap-2">
          <button
            onClick={() => setViewMode('rules')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${viewMode === 'rules'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
              : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            חוקים
          </button>
          <button
            onClick={() => setViewMode('statistics')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${viewMode === 'statistics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
              : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
          >
            סטטיסטיקה
          </button>
        </div>
      </div>

      <div className={`flex-1 h-full relative transition-all ${viewMode === 'rules' ? 'opacity-100' : 'opacity-0 invisible absolute'}`}>
        <div className="h-full w-full p-4">
          <div className={`w-full h-full bg-gray-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-slate-800 transition-all ${drawingState.mode && !drawingState.isInline ? 'ring-4 ring-indigo-500' : ''}`}>
            <MapDisplay
              geometries={missionGeometries} focusedGeoId={focusedGeoId} focusedRuleId={viewMode === 'rules' ? openRuleId : null}
              rules={rules} isVisible={viewMode === 'rules'} onSelectAsset={onSelectSpatialAsset} currentMissionId={mission.id}
              darkMode={darkMode} drawingMode={drawingState.isInline ? null : drawingState.mode} onGeometryCaptured={handleGeometryCaptured}
              onCancelDrawing={() => { setDrawingState({ mode: null, isInline: false }); setIsFormOpen(true); }}
              resetViewToggle={toggles.reset} zoomInToggle={toggles.zoomIn} zoomOutToggle={toggles.zoomOut}
            />
          </div>
          <MapOverlays drawingMode={!!drawingState.mode && !drawingState.isInline} onResetMap={() => { setToggles(t => ({ ...t, reset: t.reset + 1 })); onSetActiveRule(null); onSelectSpatialAsset(mission.id); }} />
        </div>
      </div>

      {isFormOpen && (
        <RuleForm
          missionId={mission.id}
          missionName={mission.name}
          missionNameHebrew={mission.nameHebrew}
          initialData={editingRule}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveRule}
          availableGeometries={missionGeometries} onStartDrawing={t => handleStartDrawing(t, true)} isNewGeometryCaptured={!!tempGeo}
          tempGeometryType={drawingState.isInline ? drawingState.mode || tempGeo?.type : tempGeo?.type}
          tempGeometryCoords={tempGeo?.coordinates} onClearTempGeometry={() => setTempGeo(null)}
          onGeometryCaptured={handleGeometryCaptured} darkMode={darkMode}
        />
      )}

      {isBulkFormOpen && (
        <BulkRuleForm
          missionId={mission.id}
          missionName={mission.name}
          missionNameHebrew={mission.nameHebrew}
          onClose={() => setIsBulkFormOpen(false)}
          onSaveBulk={handleSaveBulkRules}
          availableGeometries={missionGeometries}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default MissionView;
