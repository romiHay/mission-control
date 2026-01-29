
import React, { useState } from 'react';
import { Rule, MissionGeometry, GeometryType } from '../types';

interface RuleFormProps {
  missionId: string;
  initialData?: Rule;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  availableGeometries: MissionGeometry[];
  onStartDrawing: (type: GeometryType) => void;
  isNewGeometryCaptured: boolean;
  tempGeometryType?: GeometryType;
  onClearTempGeometry: () => void;
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
  onClearTempGeometry
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [value, setValue] = useState(initialData?.value || '');
  const [geometryId, setGeometryId] = useState(initialData?.geometryId || '');
  const [geoSource, setGeoSource] = useState<'existing' | 'new' | 'none'>(
    initialData?.geometryId ? 'existing' : isNewGeometryCaptured ? 'new' : 'none'
  );

  // Switch confirmation states
  const [pendingSource, setPendingSource] = useState<'existing' | 'new' | 'none' | null>(null);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);

  const handleSourceChangeRequest = (newSource: 'existing' | 'new' | 'none') => {
    if (newSource === geoSource) return;

    // Check if switching from an active selection to something else
    const hasUnsavedWork = (geoSource === 'new' && isNewGeometryCaptured) ||
      (geoSource === 'existing' && geometryId && geometryId !== initialData?.geometryId);

    if (hasUnsavedWork) {
      setPendingSource(newSource);
      setShowConfirmSwitch(true);
    } else {
      setGeoSource(newSource);
      // Clean up previous choices immediately if no confirmation needed
      if (newSource !== 'existing') setGeometryId('');
      if (newSource !== 'new') onClearTempGeometry();
    }
  };

  const confirmSourceChange = () => {
    if (pendingSource) {
      setGeoSource(pendingSource);
      // Explicitly clear all previous spatial state on confirmation
      if (pendingSource !== 'existing') setGeometryId('');
      if (pendingSource !== 'new') onClearTempGeometry();

      setPendingSource(null);
      setShowConfirmSwitch(false);
    }
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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all scale-100 border border-transparent dark:border-slate-800 relative">

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
                Changing the spatial attachment mode will discard your current drawing or selection.
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

        <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 dark:bg-indigo-600 text-white">
          <h3 className="text-xl font-bold">{initialData ? 'Edit Rule' : 'New Mission Rule'}</h3>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Rule Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. Access Control Alpha"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                placeholder="Detailed instructions..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Spatial Attachment</label>
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              {(['none', 'existing', 'new'] as const).map(source => (
                <button
                  key={source}
                  type="button"
                  onClick={() => handleSourceChangeRequest(source)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all capitalize ${geoSource === source ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}
                >
                  {source}
                </button>
              ))}
            </div>

            {geoSource === 'existing' && (
              <select
                value={geometryId}
                onChange={e => setGeometryId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select Spatial Asset...</option>
                {availableGeometries.map(geo => (
                  <option key={geo.id} value={geo.id} disabled={!!geo.ruleId && geo.ruleId !== initialData?.id}>
                    {geo.name} {geo.ruleId && geo.ruleId !== initialData?.id ? '(Used)' : ''}
                  </option>
                ))}
              </select>
            )}

            {geoSource === 'new' && (
              <div className="space-y-4">
                {isNewGeometryCaptured ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-xl">
                      <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                          {tempGeometryType} Captured
                        </p>
                        <button
                          type="button"
                          onClick={onClearTempGeometry}
                          className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 underline"
                        >
                          Discard
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onStartDrawing(tempGeometryType || 'Point')}
                        className="flex items-center justify-center gap-2 px-3 py-3 border border-indigo-200 dark:border-indigo-900 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        Redraw {tempGeometryType}
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartDrawing(tempGeometryType === 'Point' ? 'Polygon' : 'Point')}
                        className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        Switch to {tempGeometryType === 'Point' ? 'Area' : 'Point'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onStartDrawing('Point')}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-500 hover:text-indigo-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">Draw Point</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartDrawing('Polygon')}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-500 hover:text-indigo-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">Draw Area</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Logic / Value</label>
            <input
              required
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Value or logic..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
            >
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RuleForm;
