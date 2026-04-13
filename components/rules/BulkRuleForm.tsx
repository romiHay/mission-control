
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rule, MissionGeometry, GeometryType, FormFieldDef } from '../../types';
import GenericFormField from '../ui/GenericFormField';
import { GenericInput, GenericSelect } from '../ui/GenericInputs';
import RuleFormModal from './RuleFormModal';
import ConfirmModal from '../ui/ConfirmModal';
import AlertModal from '../ui/AlertModal';
import PromptModal from '../ui/PromptModal';
import RuleMapEditor from '../maps/RuleMapEditor';

interface BulkRuleFormProps {
    missionId: string;
    missionName: string;
    missionNameHebrew: string;
    uiSchema?: FormFieldDef[];
    initialData?: Rule;
    onClose: () => void;
    onSaveBulk: (baseData: Partial<Rule>, selectedGeos: { id?: string, type: GeometryType, coords: any, name?: string }[]) => Promise<void>;
    availableGeometries: MissionGeometry[];
    darkMode: boolean;
}

const BulkRuleForm: React.FC<BulkRuleFormProps> = ({
    missionId,
    missionName,
    missionNameHebrew,
    onClose,
    onSaveBulk,
    availableGeometries,
    uiSchema,
    initialData,
    darkMode
}) => {
    const [params, setParams] = useState<Record<string, any>>(initialData?.parameters || {});
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [value, setValue] = useState(initialData?.value || '');

    const [error, setError] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Selection state
    const [selectedGeoIds, setSelectedGeoIds] = useState<string[]>(initialData?.geometryIds || []);
    const [newGeos, setNewGeos] = useState<{ type: GeometryType, coords: any, name?: string }[]>([]);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState<GeometryType | null>(null);
    const [pendingGeo, setPendingGeo] = useState<{ type: GeometryType, coords: any } | null>(null);
    const [pendingGeoName, setPendingGeoName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ active: boolean, type: 'geo' | 'point', index: number, pointIndex?: number }>({ active: false, type: 'geo', index: -1 });

    const confirmDeleteGeo = (idx: number) => {
        setShowDeleteConfirm({ active: true, type: 'geo', index: idx });
    };

    const confirmDeletePoint = (geoIdx: number, ptIdx: number) => {
        setShowDeleteConfirm({ active: true, type: 'point', index: geoIdx, pointIndex: ptIdx });
    };

    const executeDelete = () => {
        const { type, index, pointIndex } = showDeleteConfirm;
        if (type === 'geo') {
            setNewGeos(prev => prev.filter((_, i) => i !== index));
        } else if (type === 'point' && pointIndex !== undefined) {
            setNewGeos(prev => {
                const next = [...prev];
                const updated = [...(next[index].coords as [number, number][])];
                updated.splice(pointIndex, 1);
                next[index] = { ...next[index], coords: updated };
                return next;
            });
        }
        setShowDeleteConfirm({ active: false, type: 'geo', index: -1 });
    };

    const unassignedGeos = React.useMemo(() => availableGeometries.filter(g => !g.ruleId || g.ruleId === initialData?.id), [availableGeometries, initialData]);

    useEffect(() => {
        // Only initialize if we don't have initial data and params are currently empty.
        // This prevents resetting the form while the user is typing if the mission data re-fetches.
        if (!initialData && uiSchema && Object.keys(params).length === 0) {
            const initialParams: Record<string, any> = {};
            uiSchema.forEach(field => {
                initialParams[field.key] = '';
            });
            setParams(initialParams);
        }
    }, [uiSchema, initialData, params]);



    const updateParam = (key: string, val: any) => {
        setParams(prev => ({ ...prev, [key]: val }));
        if (key === 'code_name' || key === 'nm_values') setName(val);
        if (key === 'frequency' || key === 'status') setDescription(val);
    };

    // --- AUTO-EDIT LOGIC ---
    // When the user enters "Edit Points" mode, we immediately convert selected 
    // geometries into editable "newGeos" so their vertices (white dots) appear right away.
    useEffect(() => {
        if (isEditing && selectedGeoIds.length > 0) {
            const geosToConvert = unassignedGeos.filter(g => 
                selectedGeoIds.includes(g.id) && g.createdBy === 'user'
            );

            if (geosToConvert.length > 0) {
                setNewGeos(prev => [
                    ...prev,
                    ...geosToConvert.map(g => ({ type: g.type, coords: g.coordinates, name: g.name }))
                ]);
                // Remove from standard selection to avoid duplicates (now they are in newGeos)
                setSelectedGeoIds(prev => prev.filter(id => !geosToConvert.some(g => g.id === id)));
            }
        }
    }, [isEditing, selectedGeoIds, unassignedGeos]);

    const handleSave = async () => {
        const errs: string[] = [];
        if (uiSchema) {
            uiSchema.forEach(field => {
                // 1. Check if the field is currently "active" based on its condition
                if (field.condition) {
                    const currentDependentValue = params[field.condition.field];
                    if (!field.condition.values.includes(currentDependentValue)) {
                        return; // Skip validation for hidden fields
                    }
                }

                // 2. Check if the value is actually empty (handling 0 and false as valid values)
                const val = params[field.key];
                if (val === undefined || val === null || val === '') {
                    errs.push(`שדה "${field.label || field.key}" הינו שדה חובה`);
                }
            });
        }

        if (errs.length > 0) {
            setError(errs);
            return;
        }

        setIsSaving(true);
        setError([]);
        try {
            const selectedExisting = selectedGeoIds.map(id => {
                const g = availableGeometries.find(ag => ag.id === id)!;
                return { id: g.id, type: g.type, coords: g.coordinates };
            });

            const allGeos = [...selectedExisting, ...newGeos];
            await onSaveBulk({ id: initialData?.id, name, description, value, parameters: params }, allGeos);
        } catch (err: any) {
            console.error(err);
            setError([err.message || 'אירעה שגיאה בשמירת החוק. אנא נסה שנית.']);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <RuleFormModal
            title={initialData ? "עריכת חוק ראשי" : "הוספת חוק חדש"}
            subtitle={missionNameHebrew}
            onClose={onClose}
            darkMode={darkMode}
            maxWidth="max-w-4xl"
            footer={
                <div className="w-full flex flex-col gap-3">
                    <div className="flex gap-4 w-full">
                        <button onClick={onClose} disabled={isSaving} className="flex-1 px-8 py-4 border-2 border-gray-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-gray-500 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
                            ביטול
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-200 dark:shadow-none disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    שומר...
                                </>
                            ) : (
                                selectedGeoIds.length + newGeos.length > 0
                                    ? `שמור חוק לכל הגיאוגרפיות הבחורות`
                                    : 'שמור חוק ללא גיאוגרפיה'
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <ConfirmModal
                isOpen={showDeleteConfirm.active}
                title="למחוק לצמיתות?"
                description={showDeleteConfirm.type === 'geo' ? "האם להסיר את השרטוט שבחרת? לא ניתן לבטל פעולה זו." : "האם למחוק את הנקודה הזו מהצורה?"}
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteConfirm({ active: false, type: 'geo', index: -1 })}
            />

            <AlertModal
                isOpen={error.length > 0}
                title="שגיאת אימות נתונים"
                buttonText="הבנתי, אחזור לתקן"
                onClose={() => setError([])}
                description={
                    <div className="bg-red-50/50 dark:bg-slate-800 rounded-xl p-3 w-full flex flex-col gap-2 border border-red-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                        {error.map((err, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-right w-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div>
                                <span className="text-xs font-bold text-red-700 dark:text-red-400 leading-relaxed">{err}</span>
                            </div>
                        ))}
                    </div>
                }
            />

            <PromptModal
                isOpen={!!pendingGeo}
                title="שם לגיאומטריה קבועה"
                label="הכנס שם עבור הגיאומטריה שדגמת:"
                placeholder="לדוגמה: מחסן מרכזי"
                initialValue=""
                onConfirm={(val) => {
                    if (pendingGeo) {
                        setNewGeos(prev => [...prev, { type: pendingGeo.type, coords: pendingGeo.coords, name: val || 'ללא שם' }]);
                        setPendingGeo(null);
                    }
                }}
                onCancel={() => setPendingGeo(null)}
                cancelText="ביטול שרטוט"
            />

            <div className="space-y-8">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {(uiSchema || []).map((field) => {
                            if (field.condition) {
                                const currentDependentValue = params[field.condition.field];
                                if (!field.condition.values.includes(currentDependentValue)) {
                                    return null;
                                }
                            }
                            return (
                                <GenericFormField key={field.key} label={field.label || field.key} required={true}>
                                    {field.type === 'select' ? (
                                        <GenericSelect
                                            value={params[field.key] || ''}
                                            onChange={(v) => updateParam(field.key, v)}
                                            options={field.options || []}
                                            placeholder="בחר..."
                                        />
                                    ) : (
                                        <GenericInput
                                            type={field.type}
                                            defaultValue={params[field.key] || ''}
                                            onChange={(val: any) => updateParam(field.key, val)}
                                            onBlur={(e: any) => updateParam(field.key, e.target.value)}
                                            min={field.min}
                                            max={field.max}
                                        />
                                    )}
                                </GenericFormField>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex justify-between items-end">
                        <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-[0.2em]">שיוך גיאוגרפי</label>
                        <div className="flex gap-2">
                            <button onClick={() => { setIsEditing(!isEditing); setIsDrawing(null); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 hover:bg-amber-100'}`}>
                                {isEditing ? 'סיים עריכה' : 'עריכת נקודות'}
                            </button>
                            <button onClick={() => { setIsDrawing('Point'); setIsEditing(false); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDrawing === 'Point' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'}`}>+ נקודה</button>
                            <button onClick={() => { setIsDrawing('Polygon'); setIsEditing(false); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDrawing === 'Polygon' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'}`}>+ פוליגון</button>
                        </div>
                    </div>

                    <div className="relative h-80 rounded-[2rem] overflow-hidden border border-gray-200 dark:border-slate-800 shadow-inner group">
                        <RuleMapEditor 
                            darkMode={darkMode}
                            availableGeometries={unassignedGeos}
                            selectedGeoIds={selectedGeoIds}
                            newGeos={newGeos}
                            isDrawing={isDrawing}
                            isEditing={isEditing}
                            onToggleGeoSelection={(id) => {
                                setSelectedGeoIds(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]);
                            }}
                            onConvertGeoToEditable={(geo) => {
                                setSelectedGeoIds(prev => prev.filter(id => id !== geo.id));
                                setNewGeos(prev => [...prev, { type: geo.type, coords: geo.coordinates, name: geo.name }]);
                            }}
                            onSetNewGeos={setNewGeos}
                            onCaptureDrawing={(type, coords) => {
                                setPendingGeo({ type, coords });
                                setPendingGeoName('');
                                setIsDrawing(null);
                            }}
                            onOpenDeletePrompt={(type, geoIdx, pointIdx) => {
                                setShowDeleteConfirm({ active: true, type, index: geoIdx, pointIndex: pointIdx });
                            }}
                        />

                        {selectedGeoIds.length > 0 || newGeos.length > 0 ? (
                            <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-2 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xl flex items-center gap-3">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                    {selectedGeoIds.length + newGeos.length} פריטים נבחרו
                                </span>
                                <button onClick={() => { setSelectedGeoIds([]); setNewGeos([]); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">נקה הכל</button>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/40 dark:bg-slate-900/40 pointer-events-none">
                                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">בחר גיאומטריות מהמפה</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </RuleFormModal>
    );
};

export default BulkRuleForm;
