import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rule, MissionGeometry, FormFieldDef } from '../../types';
import GenericFormField from '../ui/GenericFormField';
import { GenericInput, GenericSelect } from '../ui/GenericInputs';
import RuleFormModal from './RuleFormModal';

interface BulkEditRuleFormProps {
    rules: Rule[];
    geometries: MissionGeometry[];
    missionName: string;
    uiSchema?: FormFieldDef[];
    onClose: () => void;
    onSave: (ruleIds: string[], updatedParams: Record<string, any>) => void;
    darkMode: boolean;
}

const BulkEditRuleForm: React.FC<BulkEditRuleFormProps> = ({ rules, geometries, missionName, uiSchema, onClose, onSave, darkMode }) => {
    const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
    const [params, setParams] = useState<Record<string, any>>({});

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);
    const hasFittedRef = useRef(false);

    // STEP 1: Initialization
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const m = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: true,
            doubleClickZoom: false,
            fadeAnimation: true
        });

        const tileUrl = darkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        L.tileLayer(tileUrl).addTo(m);

        const group = L.layerGroup().addTo(m);
        layerGroupRef.current = group;
        mapInstanceRef.current = m;

        // Initial setup for the map container
        m.invalidateSize();

        return () => {
            m.remove();
            mapInstanceRef.current = null;
        };
    }, [darkMode]);

    // Initial Zoom Effect: Specific logic to fit bounds once when opened
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || hasFittedRef.current || geometries.length === 0) return;

        // Waiting for modal animation to stabilize
        const timer = setTimeout(() => {
            if (!mapInstanceRef.current) return;
            mapInstanceRef.current.invalidateSize();

            const bounds = L.latLngBounds([]);
            geometries.forEach(geo => {
                if (geo.type === 'Point') {
                    bounds.extend(geo.coordinates as [number, number]);
                } else {
                    bounds.extend(geo.coordinates as [number, number][]);
                }
            });

            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, {
                    padding: [30, 30],
                    maxZoom: 18,
                    animate: false
                });
                hasFittedRef.current = true;
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [geometries]);

    // Update geometries on map
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group) return;

        group.clearLayers();

        // Sort rules so selected ones are drawn LAST (to be on top)
        const sortedRules = [...rules].sort((a, b) => {
            const aSel = selectedRuleIds.includes(a.id) ? 1 : 0;
            const bSel = selectedRuleIds.includes(b.id) ? 1 : 0;
            return aSel - bSel;
        });

        sortedRules.forEach(rule => {
            // Find geometry by rule's geometryId or by back-reference
            const geo = geometries.find(g => g.id === rule.geometryId || g.ruleId === rule.id);
            if (!geo) return;

            const isSelected = selectedRuleIds.includes(rule.id);
            const color = isSelected ? '#10b981' : '#6366f1';
            let layer: L.Layer;

            if (geo.type === 'Point') {
                const coords = geo.coordinates as [number, number];
                layer = L.circleMarker(coords, {
                    radius: isSelected ? 10 : 8,
                    color: isSelected ? '#ffffff' : color,
                    weight: isSelected ? 3 : 2,
                    fillOpacity: isSelected ? 0.9 : 0.4,
                    fillColor: color,
                    className: isSelected ? 'drop-shadow-lg' : ''
                });
            } else {
                const coords = geo.coordinates as [number, number][];
                layer = L.polygon(coords, {
                    color: color,
                    weight: isSelected ? 4 : 2,
                    fillOpacity: isSelected ? 0.4 : 0.1,
                    fillColor: color,
                    className: isSelected ? 'drop-shadow-md' : ''
                });
            }

            layer.bindTooltip(`
                <div class="px-2 py-1 font-heebo text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    ${rule.name}
                </div>
            `, {
                sticky: true,
                direction: 'top',
                offset: [0, -10],
                className: 'bulk-edit-tooltip'
            });

            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                handleToggleRule(rule.id);
            });

            // If selected, ensure it has a higher z-index / brings to front
            if (isSelected && (layer as any).bringToFront) {
                setTimeout(() => (layer as any).bringToFront(), 10);
            }

            layer.addTo(group);
        });
    }, [geometries, rules, selectedRuleIds]);

    // Auto-Focus/Zoom on selection change
    const lastSelectedIdsRef = useRef<string[]>([]);
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || selectedRuleIds.length === 0) {
            lastSelectedIdsRef.current = selectedRuleIds;
            return;
        }

        // Only zoom if the selection is actually DIFFERENT (not just same array reference)
        const isSame = selectedRuleIds.length === lastSelectedIdsRef.current.length &&
            selectedRuleIds.every(id => lastSelectedIdsRef.current.includes(id));

        if (isSame) return;
        lastSelectedIdsRef.current = selectedRuleIds;

        // Ensure map size is correct before calculating zoom
        map.invalidateSize();

        const bounds = L.latLngBounds([]);
        let lastGeo: MissionGeometry | null = null;
        let validGeosCount = 0;

        selectedRuleIds.forEach(id => {
            const rule = rules.find(r => r.id === id);
            // Robust geometry lookup: rule.geometryId -> g.id -> g.ruleId
            const geo = geometries.find(g =>
                g.id === rule?.geometryId ||
                g.ruleId === id ||
                (rule?.id && g.ruleId === rule.id)
            );

            if (geo) {
                validGeosCount++;
                lastGeo = geo;
                if (geo.type === 'Point') {
                    bounds.extend(geo.coordinates as [number, number]);
                } else {
                    bounds.extend(geo.coordinates as [number, number][]);
                }
            }
        });

        if (bounds.isValid() && validGeosCount > 0) {
            // Close up zoom: Use points specifically for flyTo if it's the only one
            if (validGeosCount === 1 && lastGeo) {
                if (lastGeo.type === 'Point') {
                    map.flyTo(lastGeo.coordinates as [number, number], 18, { duration: 0.8 });
                } else {
                    map.flyToBounds(bounds, { padding: [30, 30], duration: 0.8, maxZoom: 18 });
                }
            } else {
                map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, maxZoom: 18 });
            }
        }
    }, [selectedRuleIds, rules, geometries]);

    const handleToggleRule = (id: string) => {
        setSelectedRuleIds(prev =>
            prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedRuleIds.length === rules.length) {
            setSelectedRuleIds([]);
        } else {
            setSelectedRuleIds(rules.map(r => r.id));
        }
    };

    const updateParam = (key: string, val: any) => {
        setParams(prev => ({ ...prev, [key]: val }));
    };

    const handleSave = () => {
        // Filter out empty params - only save what the user changed
        const finalParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );
        onSave(selectedRuleIds, finalParams);
    };

    return (
        <RuleFormModal
            title="עריכת חוקים מרובה"
            onClose={onClose}
            darkMode={darkMode}
            maxWidth="max-w-[95vw]"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="flex-1 px-8 py-4 border-2 border-gray-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-gray-500 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selectedRuleIds.length === 0}
                        className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-indigo-200 dark:shadow-none"
                    >
                        עדכן {selectedRuleIds.length} חוקים
                    </button>
                </>
            }
        >
            <div className="flex flex-col gap-12">

                {/* Top Section: Selection (Map + List in a wide row) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Map Area (Takes 7/12) */}
                    <div className="lg:col-span-8 space-y-4">
                        <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest block">תצוגה גאוגרפית של החוקים שנבחרו</label>
                        <div className="relative w-full h-[350px] rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-inner group">
                            <div ref={mapRef} className="w-full h-full z-0" />
                        </div>
                    </div>

                    {/* Selection List Area (Takes 4/12) */}
                    <div className="lg:col-span-4 space-y-4 flex flex-col h-[350px]">
                        <div className="flex justify-between items-center shrink-0">
                            <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">רשימת חוקים ({selectedRuleIds.length})</label>
                            <button onClick={handleSelectAll} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                {selectedRuleIds.length === rules.length ? 'בטל הכל' : 'בחר הכל'}
                            </button>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                            {rules.map(rule => (
                                <div
                                    key={rule.id}
                                    onClick={() => handleToggleRule(rule.id)}
                                    className={`group cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedRuleIds.includes(rule.id)
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 shadow-sm'
                                        : 'bg-gray-50/50 dark:bg-slate-800/30 border-transparent hover:border-gray-200 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedRuleIds.includes(rule.id)
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-gray-300 dark:border-slate-600'
                                        }`}>
                                        {selectedRuleIds.includes(rule.id) && (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`font-bold text-sm truncate ${selectedRuleIds.includes(rule.id) ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-slate-300'}`}>
                                            {rule.name}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Parameter Updates (Wide 5-column grid) */}
                <div className="space-y-8 pt-10 border-t border-gray-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider mb-8 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            עדכון פרמטרים משותף
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {(uiSchema || []).map((field) => {
                                if (field.condition) {
                                    const currentDependencyValue = params[field.condition.field];
                                    if (!field.condition.values.includes(currentDependencyValue)) {
                                        return null;
                                    }
                                }
                                // Logic: Frequency gets its own row. Others are 2 in a row.
                                const isStandalone = field.key === 'frequency' || field.label === 'תדירות';
                                return (
                                    <div key={field.key} className={isStandalone ? "col-span-full" : "col-span-1"}>
                                        <GenericFormField label={field.label || field.key} fullWidth={false}>
                                            {field.type === 'select' ? (
                                                <GenericSelect 
                                                    value={params[field.key] || ''} 
                                                    onChange={v => updateParam(field.key, v)} 
                                                    options={field.options || []} 
                                                    placeholder="ללא שינוי" 
                                                />
                                            ) : (
                                                <GenericInput 
                                                    type={field.type}
                                                    value={params[field.key] || ''} 
                                                    onChange={v => updateParam(field.key, v)} 
                                                    placeholder="השאר ריק אם אין שינוי"
                                                    min={field.min}
                                                    max={field.max}
                                                />
                                            )}
                                        </GenericFormField>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-800/30">
                        <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                שינויים אלו יבוצעו ב-<span className="text-amber-900 dark:text-amber-200 underline decoration-2">{selectedRuleIds.length}</span> חוקים שנבחרו למעלה.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </RuleFormModal>
    );
};

export default BulkEditRuleForm;
