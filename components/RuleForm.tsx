
import React, { useState, useEffect } from 'react';
import { Rule, MissionGeometry, GeometryType } from '../types';
import GeometryMiniMap from './GeometryMiniMap';

interface RuleFormProps {
  missionId: string;
  initialData?: Rule;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  availableGeometries: MissionGeometry[];
  onStartDrawing: (type: GeometryType) => void;
  isNewGeometryCaptured: boolean;
  tempGeometryType?: GeometryType;
  tempGeometryCoords?: any;
  onClearTempGeometry: () => void;
  onGeometryCaptured: (type: GeometryType, coords: any) => void;
  darkMode: boolean;
}

const RuleForm: React.FC<RuleFormProps> = ({
  missionId,
  initialData,
  onClose,
  onSave,
  availableGeometries,
  onStartDrawing,
  isNewGeometryCaptured,
  tempGeometryType,
  tempGeometryCoords,
  onClearTempGeometry,
  onGeometryCaptured,
  darkMode
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [value, setValue] = useState(initialData?.value || '');
  const [geometryId, setGeometryId] = useState(initialData?.geometryId || '');
  const [geoSource, setGeoSource] = useState<'existing' | 'new' | 'none'>(
    initialData?.geometryId ? 'existing' : (isNewGeometryCaptured || !!tempGeometryType) ? 'new' : 'none'
  );

  const [isDrawingInline, setIsDrawingInline] = useState(false);

  // Switch confirmation states
  const [pendingSource, setPendingSource] = useState<'existing' | 'new' | 'none' | null>(null);
  const [pendingType, setPendingType] = useState<GeometryType | null>(null);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);

  const handleSourceChangeRequest = (newSource: 'existing' | 'new' | 'none') => {
    if (newSource === geoSource) return;

    // Check if switching from an active selection to something else
    const hasUnsavedWork = (geoSource === 'new' && isNewGeometryCaptured) ||
      (geoSource === 'existing' && geometryId && geometryId !== initialData?.geometryId);

    if (hasUnsavedWork) {
      setPendingSource(newSource);
      setPendingType(null);
      setShowConfirmSwitch(true);
    } else {
      setGeoSource(newSource);
      if (newSource !== 'existing') setGeometryId('');
      if (newSource !== 'new') onClearTempGeometry();
      setIsDrawingInline(false);
    }
  };

  const handleTypeChangeRequest = (newType: GeometryType) => {
    if (newType === tempGeometryType) return;

    if (isNewGeometryCaptured) {
      setPendingType(newType);
      setPendingSource(null);
      setShowConfirmSwitch(true);
    } else {
      onClearTempGeometry();
      onStartDrawing(newType);
      setIsDrawingInline(true);
    }
  };

  const confirmSourceChange = () => {
    if (pendingSource) {
      setGeoSource(pendingSource);
      if (pendingSource !== 'existing') setGeometryId('');
      if (pendingSource !== 'new') onClearTempGeometry();
      setIsDrawingInline(false);
      setPendingSource(null);
    } else if (pendingType) {
      onClearTempGeometry();
      onStartDrawing(pendingType);
      setIsDrawingInline(true);
      setPendingType(null);
    }
    setShowConfirmSwitch(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || `r-${Date.now()}`,
      missionId,
      name,
      description,
      value,
      geometryId: geoSource === 'existing' ? (geometryId || undefined) : undefined,
    });
  };

  const selectedExistingGeo = availableGeometries.find(g => g.id === geometryId);

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/20 backdrop-blur-[2px] pointer-events-none">
      <div className="bg-white dark:bg-slate-900 shadow-2xl w-full max-w-md h-full overflow-hidden flex flex-col transform transition-all border-l border-gray-200 dark:border-slate-800 pointer-events-auto animate-slideInRight relative">

        {/* Warning Pop-up for Source Switching */}
        {showConfirmSwitch && (
          <div className="absolute inset-0 z-[2100] bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-center p-8 animate-fadeIn">
            <div className="max-w-xs text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">Discard changes?</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                {pendingSource
                  ? "Changing the spatial attachment mode will discard your current drawing or selection."
                  : "Switching geometry types will discard your current drawing."}
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowConfirmSwitch(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={confirmSourceChange}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all active:scale-95"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 dark:bg-indigo-600 text-white shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Configuration</span>
            <h3 className="text-xl font-bold leading-tight">{initialData ? 'Edit Rule' : 'New Mission Rule'}</h3>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 mb-1.5 uppercase tracking-[0.2em]">Rule Identification</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                placeholder="e.g. Zone A Restriction"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 mb-1.5 uppercase tracking-[0.2em]">Deployment Instructions</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-gray-400"
                placeholder="Provide details on how to apply this rule..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">Spatial Attachment</label>
              {geoSource === 'new' && isDrawingInline && (
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  Live Drawing
                </span>
              )}
            </div>

            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              {(['none', 'existing', 'new'] as const).map(source => (
                <button
                  key={source}
                  type="button"
                  onClick={() => handleSourceChangeRequest(source)}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${geoSource === source ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}
                >
                  {source}
                </button>
              ))}
            </div>

            {geoSource === 'existing' && (
              <div className="space-y-3">
                <select
                  value={geometryId}
                  onChange={e => setGeometryId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">Select Spatial Asset...</option>
                  {availableGeometries.map(geo => (
                    <option key={geo.id} value={geo.id} disabled={!!geo.ruleId && geo.ruleId !== initialData?.id}>
                      {geo.name} {geo.ruleId && geo.ruleId !== initialData?.id ? '(Attached)' : ''}
                    </option>
                  ))}
                </select>

                <GeometryMiniMap
                  type={selectedExistingGeo?.type || 'Point'}
                  coordinates={selectedExistingGeo?.coordinates}
                  onGeometryCaptured={() => { }}
                  isDrawing={false}
                  onCancelDrawing={() => { }}
                  darkMode={darkMode}
                />
              </div>
            )}

            {geoSource === 'new' && (
              <div className="space-y-4">
                {(isNewGeometryCaptured || isDrawingInline) ? (
                  <div className="space-y-3">
                    <GeometryMiniMap
                      type={tempGeometryType || 'Point'}
                      coordinates={tempGeometryCoords}
                      onGeometryCaptured={(coords) => {
                        onGeometryCaptured(tempGeometryType || 'Point', coords);
                        setIsDrawingInline(false);
                      }}
                      isDrawing={isDrawingInline}
                      onCancelDrawing={() => setIsDrawingInline(false)}
                      darkMode={darkMode}
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDrawingInline(!isDrawingInline)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${isDrawingInline ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100'}`}
                      >
                        {isDrawingInline ? 'Stop Drawing' : (isNewGeometryCaptured ? 'Redraw Asset' : 'Start Drawing')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChangeRequest(tempGeometryType === 'Point' ? 'Polygon' : 'Point')}
                        className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        Use {tempGeometryType === 'Point' ? 'Area' : 'Point'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onStartDrawing('Point');
                        setIsDrawingInline(true);
                      }}
                      className="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-400 hover:text-indigo-600 group"
                    >
                      <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Draw Point</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onStartDrawing('Polygon');
                        setIsDrawingInline(true);
                      }}
                      className="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-400 hover:text-indigo-600 group"
                    >
                      <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Draw Area</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 mb-1.5 uppercase tracking-[0.2em]">Operational Logic</label>
            <input
              required
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
              placeholder="e.g. 10m Altitude Limit"
            />
          </div>
        </form>

        <footer className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest('div').parentElement?.querySelector('form');
              if (form) form.requestSubmit();
            }}
            className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            Command Save
          </button>
        </footer>
      </div >
    </div >
  );
};

export default RuleForm;
