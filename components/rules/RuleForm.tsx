
import React, { useState, useEffect } from 'react';
import { Rule, MissionGeometry, GeometryType } from '../../types';
import { PARAM_LABELS, PARAM_OPTIONS } from '../../utils/constants';
import GenericFormField from '../ui/GenericFormField';
import SpatialAttachmentSection from './SpatialAttachmentSection';

interface RuleFormProps {
  missionId: string;
  missionName: string;
  missionNameHebrew: string;
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

const GenericInput: React.FC<{
  value: any;
  onChange: (val: any) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
}> = ({ value, onChange, placeholder, type = "text", required = true, min, max }) => (
  <input
    required={required}
    type={type}
    value={value || ''}
    min={min}
    max={max}
    onChange={e => {
      let val: any = e.target.value;
      if (type === 'number') {
        val = val === '' ? '' : parseInt(val);
        if (typeof val === 'number') {
          if (min !== undefined && val < min) val = min;
          if (max !== undefined && val > max) val = max;
        }
      }
      onChange(val);
    }}
    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-slate-500 text-right selection:bg-indigo-100 dark:selection:bg-indigo-900/40"
    placeholder={placeholder}
    spellCheck={false}
  />
);

const GenericSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}> = ({ value, onChange, options, placeholder, required = true }) => (
  <select
    required={required}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right ${!value ? 'text-gray-500 dark:text-slate-500' : ''}`}
  >
    <option value="" disabled hidden>{placeholder}</option>
    {options.map(opt => (
      <option key={opt} value={opt} className="text-gray-900 dark:text-white">{opt}</option>
    ))}
  </select>
);

const RuleForm: React.FC<RuleFormProps> = ({
  missionId,
  missionName,
  missionNameHebrew,
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
  const [params, setParams] = useState<Record<string, any>>(initialData?.parameters || {});
  const [geoSource, setGeoSource] = useState<'existing' | 'new' | 'none'>(
    initialData?.geometryId ? 'existing' : (isNewGeometryCaptured || !!tempGeometryType) ? 'new' : 'none'
  );
  const [isDrawingInline, setIsDrawingInline] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [backupCoords, setBackupCoords] = useState<any>(null);
  const [wasEditingExisting, setWasEditingExisting] = useState(false);
  const [pendingSource, setPendingSource] = useState<'existing' | 'new' | 'none' | null>(null);
  const [pendingType, setPendingType] = useState<GeometryType | null>(null);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);

  useEffect(() => {
    if (!initialData) {
      if (missionName === 'qa') {
        setParams({ code_name: '', frequency: '', code_type: '', checks_amount: '', check_precent: '' });
      } else if (missionName === 'new_missions') {
        setParams({ nm_values: '', status: '', type: '', mpt_values: '', h_values: '', nm_id: '' });
      }
    }
  }, [missionName, initialData]);

  const updateParam = (key: string, val: any) => {
    setParams(prev => ({ ...prev, [key]: val }));
    if (key === 'code_name' || key === 'nm_values') setName(val);
    if (key === 'frequency' || key === 'status') setDescription(val);
  };

  const handleSourceChangeRequest = (newSource: 'existing' | 'new' | 'none') => {
    if (newSource === geoSource) return;
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
      setIsEditingInline(false);
      setWasEditingExisting(false);
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
      setIsEditingInline(false);
      setWasEditingExisting(false);
    }
  };



  const handleToggleEdit = () => {
    if (!isEditingInline) {
      setBackupCoords(tempGeometryCoords);
      setWasEditingExisting(false);
      setIsEditingInline(true);
      setIsDrawingInline(false);
    } else {
      setIsEditingInline(false);
    }
  };

  const handleCancelEditing = () => {
    if (wasEditingExisting) {
      setGeoSource('existing');
      onClearTempGeometry();
    } else {
      onGeometryCaptured('Polygon', backupCoords);
    }
    setIsEditingInline(false);
    setWasEditingExisting(false);
  };

  const confirmChange = () => {
    if (pendingSource) {
      setGeoSource(pendingSource);
      if (pendingSource !== 'existing') setGeometryId('');
      if (pendingSource !== 'new') onClearTempGeometry();
      setIsDrawingInline(false);
      setIsEditingInline(false);
      setWasEditingExisting(false);
    } else if (pendingType) {
      onClearTempGeometry();
      onStartDrawing(pendingType);
      setIsDrawingInline(true);
      setIsEditingInline(false);
      setWasEditingExisting(false);
    }
    setShowConfirmSwitch(false);
    setPendingSource(null);
    setPendingType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || `r-${Date.now()}`,
      missionId,
      name: name || params.code_name || params.nm_values || 'Untitled Rule',
      description: description || params.frequency || params.status || '',
      value: value || params.code_type || params.type || '',
      geometryId: geoSource === 'existing' ? (geometryId || undefined) : undefined,
      parameters: params
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-slate-900 shadow-2xl w-full max-w-md h-full overflow-hidden flex flex-col transform transition-all border-l border-gray-200 dark:border-slate-800 pointer-events-auto animate-slideInRight relative font-heebo">

        {showConfirmSwitch && (
          <div className="absolute inset-0 z-[2100] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full max-w-[280px] border border-gray-100 dark:border-slate-800 animate-slideUp">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center shadow-sm rotate-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight">ביטול שינויים?</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed mt-1 px-2">
                    {pendingSource ? "החלפת מקור הגיאומטריה תבטל את הגיאומטריה שנבחרה." : "שינוי סוג הגיאוגרפיה ימחק את הגיאומטריה ששורטטה."}
                  </p>
                </div>
                <div className="flex gap-2 w-full pt-2">
                  <button
                    onClick={() => setShowConfirmSwitch(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                  >
                    חזור
                  </button>
                  <button
                    onClick={confirmChange}
                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    אשר
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 text-white shrink-0" dir="rtl">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">{missionNameHebrew}</span>
            <h3 className="text-xl font-bold leading-tight">{initialData ? 'עריכת חוק קיים' : 'הוספת חוק חדש'}</h3>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-right" dir="rtl">
          <div className="space-y-4">
            {missionName === 'qa' && (
              <>
                <GenericFormField label={PARAM_LABELS.code_name}>
                  <GenericInput value={params.code_name} onChange={v => updateParam('code_name', v)} placeholder="לדוגמה: QA_ZONE_1" />
                </GenericFormField>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GenericFormField label={PARAM_LABELS.frequency} fullWidth={!(params.frequency === 'חודשי' || params.frequency === 'שבועי')}>
                    <GenericSelect value={params.frequency} onChange={v => updateParam('frequency', v)} options={PARAM_OPTIONS.frequency} placeholder="בחר תדירות" />
                  </GenericFormField>
                  {(params.frequency === 'חודשי' || params.frequency === 'שבועי') && (
                    <GenericFormField label={PARAM_LABELS.code_type}>
                      <GenericInput value={params.code_type} onChange={v => updateParam('code_type', v)} placeholder="לדוגמה: VISUAL" />
                    </GenericFormField>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <GenericFormField label={PARAM_LABELS.checks_amount}>
                    <GenericInput type="number" value={params.checks_amount} onChange={v => updateParam('checks_amount', v)} />
                  </GenericFormField>
                  <GenericFormField label={PARAM_LABELS.check_precent + " (%)"}>
                    <GenericInput type="number" value={params.check_precent} onChange={v => updateParam('check_precent', v)} placeholder="1 - 100" min={0} max={100} />
                  </GenericFormField>
                </div>
              </>
            )}

            {missionName === 'new_missions' && (
              <div className="grid grid-cols-2 gap-4">
                <GenericFormField label={PARAM_LABELS.nm_values} fullWidth>
                  <GenericInput value={params.nm_values} onChange={v => updateParam('nm_values', v)} />
                </GenericFormField>
                <GenericFormField label={PARAM_LABELS.type}>
                  <GenericInput value={params.type} onChange={v => updateParam('type', v)} />
                </GenericFormField>
                <GenericFormField label={PARAM_LABELS.status}>
                  <GenericSelect value={params.status} onChange={v => updateParam('status', v)} options={PARAM_OPTIONS.status} placeholder="בחר סטטוס" />
                </GenericFormField>
                <GenericFormField label={PARAM_LABELS.mpt_values}>
                  <GenericInput value={params.mpt_values} onChange={v => updateParam('mpt_values', v)} />
                </GenericFormField>
                <GenericFormField label={PARAM_LABELS.h_values}>
                  <GenericInput value={params.h_values} onChange={v => updateParam('h_values', v)} />
                </GenericFormField>
                <GenericFormField label={PARAM_LABELS.nm_id} fullWidth>
                  <GenericInput value={params.nm_id} onChange={v => updateParam('nm_id', v)} />
                </GenericFormField>
              </div>
            )}
          </div>

          <SpatialAttachmentSection
            geoSource={geoSource}
            onSourceChange={handleSourceChangeRequest}
            geometryId={geometryId}
            setGeometryId={setGeometryId}
            availableGeometries={availableGeometries}
            initialDataId={initialData?.id}
            isDrawingInline={isDrawingInline}
            setIsDrawingInline={setIsDrawingInline}
            isEditingInline={isEditingInline}
            onToggleEdit={handleToggleEdit}
            onCancelEditing={handleCancelEditing}
            tempGeometryType={tempGeometryType}
            tempGeometryCoords={tempGeometryCoords}
            isNewGeometryCaptured={isNewGeometryCaptured}
            onStartDrawing={onStartDrawing}
            onClearTempGeometry={onClearTempGeometry}
            onGeometryCaptured={onGeometryCaptured}
            handleTypeChangeRequest={handleTypeChangeRequest}
            darkMode={darkMode}
          />

          <GenericFormField label="לוגיקה תפעולית">
            <GenericInput value={value} onChange={setValue} placeholder="לדוגמה: הגבלת גובה 10 מטר" />
          </GenericFormField>
        </form>

        <footer className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-white transition-all active:scale-95">ביטול</button>
          <button onClick={() => document.querySelector('form')?.requestSubmit()} className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95">שמירה</button>
        </footer>
      </div>
    </div>
  );
};

export default RuleForm;
