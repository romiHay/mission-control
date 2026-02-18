import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rule, MissionGeometry } from '../../types';
import { PARAM_LABELS, PARAM_OPTIONS } from '../../utils/constants';
import GenericFormField from '../ui/GenericFormField';
import { GenericInput, GenericSelect } from '../ui/GenericInputs';
import RuleFormModal from './RuleFormModal';

interface BulkEditRuleFormProps {
    rules: Rule[];
    geometries: MissionGeometry[];
    missionName: string;
    onClose: () => void;
    onSave: (ruleIds: string[], updatedParams: Record<string, any>) => void;
    darkMode: boolean;
}

const BulkEditRuleForm: React.FC<BulkEditRuleFormProps> = ({ rules, geometries, missionName, onClose, onSave, darkMode }) => {
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
            subtitle="פעולות קבוצתיות"
            onClose={onClose}
            darkMode={darkMode}
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
                        className="flex-[2] px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-indigo-200 dark:shadow-none"
                    >
                        עדכן {selectedRuleIds.length} חוקים
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-10">

                {/* Right Side: Rule Selection (Map + List) */}
                <div className="md:col-span-2 space-y-6 flex flex-col min-h-0">
                    <div className="space-y-4 flex flex-col h-full">
                        <div className="flex justify-between items-center shrink-0">
                            <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">בחירת חוקים ({selectedRuleIds.length})</label>
                            <button
                                onClick={handleSelectAll}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {selectedRuleIds.length === rules.length ? 'בטל הכל' : 'בחר הכל'}
                            </button>
                        </div>

                        {/* Mini Map */}
                        <div className="relative w-full h-48 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-800 shrink-0 shadow-inner group">
                            <div ref={mapRef} className="w-full h-full z-0" />
                            <div className="absolute top-3 right-3 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">בחירה מהמפה</p>
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[40vh]">
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
                                        <p className="text-[10px] text-gray-400 truncate tracking-tight font-mono">{rule.id}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Left Side: Parameter Updates */}
                <div className="md:col-span-3 space-y-8">
                    <div>
                        <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            עדכון פרמטרים משותף
                        </h3>

                        {missionName === 'qa' && (
                            <div className="grid grid-cols-2 gap-4">
                                <GenericFormField label={PARAM_LABELS.code_name}>
                                    <GenericInput value={params.code_name} onChange={v => updateParam('code_name', v)} placeholder="השאר ריק" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.frequency}>
                                    <GenericSelect value={params.frequency} options={PARAM_OPTIONS.frequency} onChange={v => updateParam('frequency', v)} placeholder="תדירות" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.code_type}>
                                    <GenericSelect value={params.code_type} options={PARAM_OPTIONS.code_type} onChange={v => updateParam('code_type', v)} placeholder="סוג קוד" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.checks_amount}>
                                    <GenericInput type="number" value={params.checks_amount} onChange={v => updateParam('checks_amount', v)} placeholder="כמות" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.check_precent} fullWidth>
                                    <GenericInput type="number" value={params.check_precent} onChange={v => updateParam('check_precent', v)} placeholder="אחוז %" min={0} max={100} />
                                </GenericFormField>
                            </div>
                        )}

                        {missionName === 'new_missions' && (
                            <div className="grid grid-cols-2 gap-4">
                                <GenericFormField label={PARAM_LABELS.nm_values}>
                                    <GenericInput value={params.nm_values} onChange={v => updateParam('nm_values', v)} placeholder="ערכי NM" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.status}>
                                    <GenericSelect value={params.status} options={PARAM_OPTIONS.status} onChange={v => updateParam('status', v)} placeholder="סטטוס" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.type}>
                                    <GenericInput value={params.type} onChange={v => updateParam('type', v)} placeholder="סוג" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.mpt_values}>
                                    <GenericInput value={params.mpt_values} onChange={v => updateParam('mpt_values', v)} placeholder="ערכי MPT" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.h_values}>
                                    <GenericInput value={params.h_values} onChange={v => updateParam('h_values', v)} placeholder="ערכי H" />
                                </GenericFormField>
                                <GenericFormField label={PARAM_LABELS.nm_id} fullWidth>
                                    <GenericInput value={params.nm_id} onChange={v => updateParam('nm_id', v)} placeholder="מזהה NM" />
                                </GenericFormField>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-800/30">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest mb-1">שים לב</h4>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                                    שינויים שהוזנו יבוצעו ב-<span className="text-amber-900 dark:text-amber-200 underline decoration-2">{selectedRuleIds.length}</span> חוקים.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </RuleFormModal>
    );
};

export default BulkEditRuleForm;
