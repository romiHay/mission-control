
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry, ViewMode, GeometryType } from '../../types';
import RuleAccordion from '../rules/RuleAccordion';
import MapDisplay from '../maps/MapDisplay';
import BulkRuleForm from '../rules/BulkRuleForm';
import BulkEditRuleForm from '../rules/BulkEditRuleForm';
import MissionStatsView from './MissionStatistics';
import MapOverlays from '../maps/MapOverlays';
import ConfirmModal from '../ui/ConfirmModal';

interface MissionViewProps {
  mission: Mission;
  rules: Rule[];
  geometries: MissionGeometry[];
  activeRuleId: string | null;
  focusedGeoId: string | null;
  onAddRule: (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[]) => void;
  onUpdateRule: (rule: Rule, newGeo?: MissionGeometry | MissionGeometry[]) => void;
  onDeleteRule: (id: string) => void;
  onAddBulkRules: (items: { rule: Rule, newGeo?: MissionGeometry }[]) => void;
  onUpdateBulkRules: (items: { rule: Rule, newGeo?: MissionGeometry }[]) => void;
  onDeleteGeometry: (id: string) => void;
  onDeleteGeometries: (ids: string[]) => Promise<void>;
  onSelectSpatialAsset: (missionId: string, ruleId?: string, geoId?: string) => void;
  onSetActiveRule: (id: string | null) => void;
  darkMode: boolean;
}

const MissionView: React.FC<MissionViewProps> = ({
  mission, rules, geometries, activeRuleId, focusedGeoId,
  onAddRule, onUpdateRule, onDeleteRule, onAddBulkRules, onUpdateBulkRules, onDeleteGeometry, onDeleteGeometries,
  onSelectSpatialAsset, onSetActiveRule, darkMode
}) => {
  const [openRuleId, setOpenRuleId] = useState<string | null>(activeRuleId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkEditFormOpen, setIsBulkEditFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('rules');
  const [drawingState, setDrawingState] = useState<{ mode: GeometryType | null, isInline: boolean }>({ mode: null, isInline: false });
  const [tempGeo, setTempGeo] = useState<{ type: GeometryType, coordinates: any } | null>(null);
  const [toggles, setToggles] = useState({ reset: 0, zoomIn: 0, zoomOut: 0 });
  const [ruleToDeleteId, setRuleToDeleteId] = useState<string | null>(null);
  const [pendingDeleteGeoId, setPendingDeleteGeoId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);

  useEffect(() => setOpenRuleId(activeRuleId), [activeRuleId]);

  const missionRules = rules.filter(r => r.missionId === mission.id);

  // The big map should only show explicitly assigned geometries
  const assignedGeometries = geometries.filter(g => g.missionId === mission.id);
  // The creator form mini-map will also ONLY see the current mission's geometries
  const eligibleGeometries = geometries.filter(g => g.missionId === mission.id);

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
        id: undefined as any,
        missionId: mission.id,
        name: `Asset for ${rule.name}`,
        type: tempGeo.type,
        coordinates: tempGeo.coordinates,
        ruleId: rule.id,
        createdBy: 'user'
      };
    }
    editingRule ? onUpdateRule(rule, newGeo) : onAddRule(rule, newGeo);
    setIsFormOpen(false);
    setTempGeo(null);
  };

  const handleSaveBulkRules = async (baseRuleData: Partial<Rule>, selectedGeos: { id?: string, type: GeometryType, coords: any, name?: string }[]) => {
    const isUpdating = !!baseRuleData.id;
    const ruleName = baseRuleData.name || 'כלל מרובה גיאומטריות';

    const existingGeoIds: string[] = [];
    const newGeos: MissionGeometry[] = [];

    selectedGeos.forEach((item, index) => {
      // If it has coordinates, it means it's either NEW or EDITED.
      // We must send it in the 'newGeos' array so the backend can process the coordinates.
      if (item.coords) {
        newGeos.push({
          id: item.id as any, // Preserve the ID so the backend knows to UPDATE instead of INSERT
          missionId: mission.id,
          name: item.name || `מיקום ${index + 1} עבור ${ruleName}`,
          type: item.type,
          coordinates: item.coords,
          ruleId: baseRuleData.id as any,
          createdBy: 'user'
        });
      } else if (item.id) {
        // If it only has an ID and no coords, it's an existing geometry we are just linking
        existingGeoIds.push(item.id);
      }
    });

    const newRule: Rule = {
      id: baseRuleData.id as any,
      missionId: mission.id,
      name: ruleName,
      description: baseRuleData.description || '',
      value: baseRuleData.value || '',
      parameters: baseRuleData.parameters,
      geometryIds: existingGeoIds
    };

    isUpdating ? await onUpdateRule(newRule, newGeos as any) : await onAddRule(newRule, newGeos as any);
    setIsFormOpen(false);
  };

  const handleConfirmDeleteRule = () => {
    if (ruleToDeleteId) {
      onDeleteRule(ruleToDeleteId);
      setRuleToDeleteId(null);
    }
  };

  const handleSaveBulkEditRules = async (ruleIds: string[], updatedParams: Record<string, any>) => {
    const itemsToUpdate: { rule: Rule }[] = [];

    ruleIds.forEach(id => {
      const original = rules.find(r => r.id === id);
      if (original) {
        itemsToUpdate.push({
          rule: {
            ...original,
            parameters: {
              ...(original.parameters || {}),
              ...updatedParams
            }
          }
        });
      }
    });

    if (itemsToUpdate.length > 0) {
      await onUpdateBulkRules(itemsToUpdate);
    }
    setIsBulkEditFormOpen(false);
  };

  return (
    <div className="h-full flex flex-col md:flex-row animate-fadeIn relative bg-gray-50 dark:bg-slate-950 font-heebo">
      <div className={`${viewMode === 'rules' ? 'w-full md:w-1/3' : 'w-full'} h-full flex flex-col border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 overflow-hidden relative transition-all`}>
        <header className="p-6 h-[92px] border-b border-gray-100 dark:border-slate-800 flex justify-between items-center text-right">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white leading-tight">{mission.nameHebrew}</h2>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-0.5">ניהול חוקים</span>
          </div>
          {viewMode === 'rules' && (
            <div className="flex gap-2">
              {/* <button
                onClick={() => setIsBulkEditFormOpen(true)}
                className="group relative flex items-center justify-center w-10 h-10 bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-600 hover:text-white transition-all duration-300 shadow-sm"
                title="עריכה מרובה"
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button> */}
              <button
                onClick={() => { setEditingRule(undefined); setTempGeo(null); onSetActiveRule(null); setIsFormOpen(true); }}
                className="group relative flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
                title="הוספת חוק"
              >
                <img src="/icons/plus.png" className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" alt="add" />
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16">
          {viewMode === 'rules' ? (
            <RuleAccordion
              rules={missionRules}
              openRuleId={activeRuleId}
              onToggle={onSetActiveRule}
              onEdit={r => { setEditingRule(r); setTempGeo(null); setIsFormOpen(true); }}
              onDelete={setRuleToDeleteId}
              geometries={assignedGeometries}
              disabled={isFormOpen}
              uiSchema={mission.ui_schema}
            />
          ) : (
            <MissionStatsView mission={mission} rules={missionRules} geometries={assignedGeometries} />
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
              geometries={assignedGeometries} focusedGeoId={focusedGeoId} focusedRuleId={viewMode === 'rules' ? openRuleId : null}
              rules={rules} isVisible={viewMode === 'rules'} onSelectAsset={onSelectSpatialAsset} currentMissionId={mission.id}
              darkMode={darkMode} drawingMode={drawingState.isInline ? null : drawingState.mode} onGeometryCaptured={handleGeometryCaptured}
              onCancelDrawing={() => { setDrawingState({ mode: null, isInline: false }); setIsFormOpen(true); }}
              onDeleteGeometry={setPendingDeleteGeoId}
              onDeleteGeometries={setPendingBulkDeleteIds}
              resetViewToggle={toggles.reset} zoomInToggle={toggles.zoomIn} zoomOutToggle={toggles.zoomOut}
            />
          </div>
          <MapOverlays drawingMode={!!drawingState.mode && !drawingState.isInline} onResetMap={() => { setToggles(t => ({ ...t, reset: t.reset + 1 })); onSetActiveRule(null); onSelectSpatialAsset(mission.id); }} />
        </div>
      </div>

      {isFormOpen && (
        <BulkRuleForm
          missionId={mission.id}
          missionName={mission.name}
          missionNameHebrew={mission.nameHebrew}
          uiSchema={mission.ui_schema}
          initialData={editingRule}
          onClose={() => { setIsFormOpen(false); setEditingRule(undefined); }}
          onSaveBulk={handleSaveBulkRules}
          availableGeometries={eligibleGeometries}
          darkMode={darkMode}
        />
      )}

      {isBulkEditFormOpen && (
        <BulkEditRuleForm
          rules={missionRules}
          geometries={assignedGeometries}
          missionName={mission.name}
          uiSchema={mission.ui_schema}
          onClose={() => setIsBulkEditFormOpen(false)}
          onSave={handleSaveBulkEditRules}
          darkMode={darkMode}
        />
      )}

      <ConfirmModal
        isOpen={!!ruleToDeleteId}
        title="למחוק את החוק?"
        description="פעולה זו תמחק את החוק ואת השיוך הגיאוגרפי שלו לצמיתות."
        onConfirm={handleConfirmDeleteRule}
        onCancel={() => setRuleToDeleteId(null)}
      />

      <ConfirmModal
        isOpen={!!pendingDeleteGeoId}
        title="למחוק גיאומטריה מהמפה?"
        description="גאומטריה זו תמחק מהמערכת לצמיתות."
        onConfirm={() => {
          onDeleteGeometry(pendingDeleteGeoId!);
          setPendingDeleteGeoId(null);
        }}
        onCancel={() => setPendingDeleteGeoId(null)}
      />

      <ConfirmModal
        isOpen={pendingBulkDeleteIds.length > 0}
        title="למחוק דגימות נבחרות?"
        description={`${pendingBulkDeleteIds.length} גיאומטריות אלה ימחקו מהמערכת לצמיתות.`}
        onConfirm={async () => {
          if (typeof onDeleteGeometries === 'function') {
            await onDeleteGeometries(pendingBulkDeleteIds);
          }
          setPendingBulkDeleteIds([]);
        }}
        onCancel={() => setPendingBulkDeleteIds([])}
      />
    </div>
  );
};

export default MissionView;
