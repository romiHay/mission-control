
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry, ViewMode, GeometryType } from '../types';
import RuleAccordion from './RuleAccordion';
import MapDisplay from './MapDisplay';
import RuleForm from './RuleForm';
import MissionStatsView from './MissionStatsView';

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
  mission,
  rules,
  geometries,
  activeRuleId,
  focusedGeoId,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onSelectSpatialAsset,
  onSetActiveRule,
  darkMode
}) => {
  // --- STATE MANAGEMENT ---
  const [openRuleId, setOpenRuleId] = useState<string | null>(activeRuleId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('rules');

  // Controls for the main map view
  const [resetViewToggle, setResetViewToggle] = useState(0);
  const [zoomInToggle, setZoomInToggle] = useState(0);
  const [zoomOutToggle, setZoomOutToggle] = useState(0);

  // Drawing States (Global tracking for geometry capture)
  const [drawingMode, setDrawingMode] = useState<GeometryType | null>(null);
  const [formDrawingType, setFormDrawingType] = useState<GeometryType | null>(null);
  const [tempGeometry, setTempGeometry] = useState<{ type: GeometryType, coordinates: any } | null>(null);

  // Synchronize internal state with the globally active rule
  useEffect(() => {
    setOpenRuleId(activeRuleId);
  }, [activeRuleId]);

  const missionRules = rules.filter(r => r.missionId === mission.id);
  const missionGeometries = geometries.filter(g => g.missionId === mission.id);

  const toggleRule = (id: string) => {
    // Prevent toggling rules when the sidebar form is open
    if (isFormOpen) return;

    const newId = openRuleId === id ? null : id;
    setOpenRuleId(newId);
    onSetActiveRule(newId);
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setTempGeometry(null);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      onDeleteRule(id);
      if (openRuleId === id) setOpenRuleId(null);
    }
  };

  const handleOpenNewForm = () => {
    setEditingRule(undefined);
    setTempGeometry(null);
    onSetActiveRule(null); // Ensure we don't zoom in to previous active rule when creating new
    setIsFormOpen(true);
  };

  // --- DRAWING HANDLERS ---

  // isInline indicates if the drawing is happening inside the Sidebar Mini-Map
  const handleStartDrawing = (type: GeometryType, isInline?: boolean) => {
    if (isInline) {
      setFormDrawingType(type);
      setDrawingMode(null); // Ensure main map drawing is disabled
    } else {
      setDrawingMode(type);
      setFormDrawingType(null);
      setIsFormOpen(false); // Close sidebar to let user draw on the large map
    }
  };

  // Called when a point or area is finalized on any map
  const handleGeometryCaptured = useCallback((type: GeometryType, coords: any) => {
    setTempGeometry({ type, coordinates: coords });
    setDrawingMode(null);
    setFormDrawingType(null);
    setIsFormOpen(true); // Re-open or keep the form open to show the captured result
  }, []);

  const handleClearTempGeometry = () => {
    setTempGeometry(null);
  };

  const handleSaveRule = (rule: Rule) => {
    let newGeo: MissionGeometry | undefined = undefined;
    if (tempGeometry) {
      newGeo = {
        id: `g-${Date.now()}`,
        missionId: mission.id,
        name: `Asset for ${rule.name}`,
        type: tempGeometry.type,
        coordinates: tempGeometry.coordinates,
        ruleId: rule.id
      };
      rule.geometryId = newGeo.id;
    }

    if (editingRule) {
      onUpdateRule(rule, newGeo);
    } else {
      onAddRule(rule, newGeo);
    }
    setIsFormOpen(false);
    setTempGeometry(null);
    setFormDrawingType(null);
  };

  const handleResetMap = () => {
    setResetViewToggle(prev => prev + 1);
    onSetActiveRule(null);
    onSelectSpatialAsset(mission.id, undefined, undefined);
  };

  return (
    <div className="h-full flex flex-col md:flex-row animate-fadeIn relative bg-gray-50 dark:bg-slate-950 transition-colors">
      <div className={`flex-1 h-full relative transition-all duration-300 ease-in-out ${viewMode === 'rules' ? 'opacity-100 visible' : 'opacity-0 invisible absolute right-0'}`}
        style={{ width: viewMode === 'rules' ? 'auto' : '0' }}>
        <div className="h-full w-full p-4 min-w-[300px]">
          <div className={`w-full h-full bg-gray-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-slate-800 transition-all ${drawingMode ? 'ring-4 ring-indigo-500' : ''}`}>
            <MapDisplay
              geometries={missionGeometries}
              focusedGeoId={focusedGeoId}
              focusedRuleId={viewMode === 'rules' ? openRuleId : null}
              rules={rules}
              isVisible={viewMode === 'rules'}
              onSelectAsset={onSelectSpatialAsset}
              currentMissionId={mission.id}
              darkMode={darkMode}
              drawingMode={drawingMode}
              onGeometryCaptured={handleGeometryCaptured}
              onCancelDrawing={() => {
                setDrawingMode(null);
                setIsFormOpen(true);
              }}
              resetViewToggle={resetViewToggle}
              zoomInToggle={zoomInToggle}
              zoomOutToggle={zoomOutToggle}
            />
          </div>

          <div className="absolute top-[26px] left-[26px] flex flex-col gap-3 z-[1000]">
            {!drawingMode && (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 flex gap-4 text-xs font-bold transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-green-700 dark:border-green-900"></div>
                  <span className="text-gray-700 dark:text-slate-300">Has Rule</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-red-700 dark:border-red-900"></div>
                  <span className="text-gray-700 dark:text-slate-300">No Rule</span>
                </div>
              </div>
            )}
          </div>

          <div className="absolute top-[26px] right-[26px] flex flex-col z-[1000] shadow-lg rounded-md overflow-hidden border border-gray-100 dark:border-slate-700">
            {!drawingMode && (
              <>
                <button
                  onClick={() => setZoomInToggle(prev => prev + 1)}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm w-[34px] h-[34px] hover:bg-gray-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center border-b border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-lg"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => setZoomOutToggle(prev => prev + 1)}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm w-[34px] h-[34px] hover:bg-gray-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center border-b border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-lg"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={handleResetMap}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm w-[34px] h-[34px] hover:bg-gray-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center group"
                  title="Reset Map to Full Extent"
                >
                  <svg className="w-4 h-4 text-gray-700 dark:text-slate-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`${viewMode === 'rules' ? 'w-full md:w-1/3 border-l' : 'w-full'} h-full flex flex-col border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 overflow-hidden relative transition-all duration-300 ease-in-out`}>
        <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">Active Mission Profile</span>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{mission.name}</h2>
            </div>
            {viewMode === 'rules' && (
              <button
                onClick={handleOpenNewForm}
                className="bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white p-2 rounded-full shadow-lg transition-transform active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto custom-scrollbar pb-16 ${viewMode === 'statistics' ? 'max-w-4xl mx-auto w-full' : ''}`}>
          {viewMode === 'rules' ? (
            <RuleAccordion
              rules={missionRules}
              openRuleId={openRuleId}
              onToggle={toggleRule}
              onEdit={handleEdit}
              onDelete={handleDelete}
              geometries={missionGeometries}
              disabled={isFormOpen}
            />
          ) : (
            <MissionStatsView
              mission={mission}
              rules={missionRules}
              geometries={missionGeometries}
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-3 flex gap-2">
          <div className="w-full flex gap-2 max-w-md mx-auto">
            <button
              onClick={() => setViewMode('rules')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${viewMode === 'rules'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
            >
              Rules
            </button>
            <button
              onClick={() => setViewMode('statistics')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${viewMode === 'statistics'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
            >
              Statistics
            </button>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <RuleForm
          missionId={mission.id}
          initialData={editingRule}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveRule}
          availableGeometries={missionGeometries}
          onStartDrawing={(type) => handleStartDrawing(type, true)}
          isNewGeometryCaptured={!!tempGeometry}
          tempGeometryType={formDrawingType || tempGeometry?.type}
          tempGeometryCoords={tempGeometry?.coordinates}
          onClearTempGeometry={handleClearTempGeometry}
          onGeometryCaptured={handleGeometryCaptured}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default MissionView;
