
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rule, MissionGeometry, GeometryType } from '../../types';
import { PARAM_LABELS, PARAM_OPTIONS } from '../../utils/constants';
import GenericFormField from '../ui/GenericFormField';

interface BulkRuleFormProps {
    missionId: string;
    missionName: string;
    missionNameHebrew: string;
    onClose: () => void;
    onSaveBulk: (baseData: Partial<Rule>, selectedGeos: { id?: string, type: GeometryType, coords: any }[]) => void;
    availableGeometries: MissionGeometry[];
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

const BulkRuleForm: React.FC<BulkRuleFormProps> = ({
    missionId,
    missionName,
    missionNameHebrew,
    onClose,
    onSaveBulk,
    availableGeometries,
    darkMode
}) => {
    const [params, setParams] = useState<Record<string, any>>({});
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [value, setValue] = useState('');

    // Selection state
    const [selectedGeoIds, setSelectedGeoIds] = useState<string[]>([]);
    const [newGeos, setNewGeos] = useState<{ type: GeometryType, coords: any }[]>([]);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState<GeometryType | null>(null);
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

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);
    const editMarkersRef = useRef<L.Marker[]>([]);
    const tempPointsRef = useRef<[number, number][]>([]);
    const tempVisualRef = useRef<L.Layer | null>(null);

    const unassignedGeos = availableGeometries.filter(g => !g.ruleId);

    // Helper functions for distance calculations
    const L2dist = (p1: [number, number], p2: [number, number]) => {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
    };

    const distToSegment = (p: [number, number], v: [number, number], w: [number, number]) => {
        const l2 = Math.pow(L2dist(v, w), 2);
        if (l2 === 0) return L2dist(p, v);
        let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
        t = Math.max(0, Math.min(1, t));
        return L2dist(p, [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]);
    };

    useEffect(() => {
        if (missionName === 'qa') {
            setParams({ code_name: '', frequency: '', code_type: '', checks_amount: '', check_precent: '' });
        } else if (missionName === 'new_missions') {
            setParams({ nm_values: '', status: '', type: '', mpt_values: '', h_values: '', nm_id: '' });
        }
    }, [missionName]);

    // Initialize Map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const m = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: true,
            doubleClickZoom: false,
            fadeAnimation: true
        }).setView([32.0853, 34.7818], 13);

        const tileUrl = darkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        L.tileLayer(tileUrl).addTo(m);

        const group = L.layerGroup().addTo(m);
        layerGroupRef.current = group;
        mapInstanceRef.current = m;

        // Multi-stage invalidation to handle modal entry animation
        m.invalidateSize();
        const timer = setTimeout(() => {
            m.invalidateSize();
        }, 300);

        return () => {
            clearTimeout(timer);
            m.remove();
            mapInstanceRef.current = null;
        };
    }, [darkMode]);

    // Update geometries on map
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group) return;

        group.clearLayers();
        editMarkersRef.current.forEach(m => m.remove());
        editMarkersRef.current = [];

        const bounds = L.latLngBounds([]);

        // 1. Render Unassigned (Selectable) Geometries
        unassignedGeos.forEach(geo => {
            const isSelected = selectedGeoIds.includes(geo.id);
            let layer: L.Layer;

            if (geo.type === 'Point') {
                const coords = geo.coordinates as [number, number];
                layer = L.circleMarker(coords, {
                    radius: 8,
                    color: isSelected ? '#10b981' : '#94a3b8',
                    weight: isSelected ? 4 : 2,
                    fillOpacity: isSelected ? 0.8 : 0.4,
                    fillColor: isSelected ? '#10b981' : '#94a3b8'
                });
                bounds.extend(coords);
            } else {
                const coords = geo.coordinates as [number, number][];
                layer = L.polygon(coords, {
                    color: isSelected ? '#10b981' : '#94a3b8',
                    weight: isSelected ? 4 : 2,
                    fillOpacity: isSelected ? 0.4 : 0.1,
                    fillColor: isSelected ? '#10b981' : '#94a3b8'
                });
                bounds.extend(coords);
            }

            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedGeoIds(prev =>
                    prev.includes(geo.id) ? prev.filter(id => id !== geo.id) : [...prev, geo.id]
                );
            });

            layer.addTo(group);
        });

        // 2. Render Newly Drawn (Editable) Geometries
        newGeos.forEach((geo, geoIdx) => {
            const coords = geo.coords as any;
            let layer: L.Layer;

            if (geo.type === 'Point') {
                layer = L.circleMarker(coords as [number, number], {
                    radius: 8, color: '#10b981', weight: 4, fillOpacity: 0.7, fillColor: '#10b981'
                });
                bounds.extend(coords as [number, number]);
            } else {
                const poly = L.polygon(coords as [number, number][], {
                    color: '#10b981', weight: 4, fillOpacity: 0.3, fillColor: '#10b981'
                });
                layer = poly;
                bounds.extend(coords as [number, number][]);

                // Edge-click Insertion Logic (Only in Edit mode)
                if (isEditing) {
                    poly.on('mousedown', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        const pStart: [number, number] = [e.latlng.lat, e.latlng.lng];
                        const polyCoords = [...coords];

                        let minDist = Infinity;
                        let insertIdx = -1;
                        for (let i = 0; i < polyCoords.length; i++) {
                            const p1 = polyCoords[i];
                            const p2 = polyCoords[(i + 1) % polyCoords.length];
                            const d = distToSegment(pStart, p1, p2);
                            if (d < minDist) { minDist = d; insertIdx = i + 1; }
                        }

                        if (insertIdx !== -1) {
                            polyCoords.splice(insertIdx, 0, pStart);
                            map.dragging.disable();
                            poly.setLatLngs(polyCoords);

                            const onMove = (me: L.LeafletMouseEvent) => {
                                polyCoords[insertIdx] = [me.latlng.lat, me.latlng.lng];
                                poly.setLatLngs(polyCoords);
                            };
                            const onUp = () => {
                                map.off('mousemove', onMove);
                                map.off('mouseup', onUp);
                                map.dragging.enable();
                                setNewGeos(prev => {
                                    const next = [...prev];
                                    next[geoIdx] = { ...next[geoIdx], coords: polyCoords };
                                    return next;
                                });
                            };
                            map.on('mousemove', onMove);
                            map.on('mouseup', onUp);
                        }
                    });
                }
            }

            // Vertex Markers for editing
            if (isEditing && geo.type === 'Polygon') {
                const polyCoords = coords as [number, number][];
                polyCoords.forEach((pt, ptIdx) => {
                    const marker = L.marker(pt, {
                        draggable: true,
                        icon: L.divIcon({
                            className: 'vertex-marker',
                            html: `<div style="width:10px; height:10px; background:white; border:2.5px solid #10b981; border-radius:50%; shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>`,
                            iconSize: [10, 10], iconAnchor: [5, 5]
                        })
                    }).addTo(map);

                    marker.on('drag', () => {
                        const nextCoords = [...polyCoords];
                        const ll = marker.getLatLng();
                        nextCoords[ptIdx] = [ll.lat, ll.lng];
                        (layer as L.Polygon).setLatLngs(nextCoords);
                    });

                    marker.on('dragend', () => {
                        const nextCoords = [...polyCoords];
                        const ll = marker.getLatLng();
                        nextCoords[ptIdx] = [ll.lat, ll.lng];
                        setNewGeos(prev => {
                            const next = [...prev];
                            next[geoIdx] = { ...next[geoIdx], coords: nextCoords };
                            return next;
                        });
                    });

                    marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        if (polyCoords.length > 3) {
                            confirmDeletePoint(geoIdx, ptIdx);
                        }
                    });

                    editMarkersRef.current.push(marker);
                });
            }

            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (!isEditing) {
                    confirmDeleteGeo(geoIdx);
                }
            });
            layer.addTo(group);
        });

        if (bounds.isValid() && selectedGeoIds.length === 0 && newGeos.length === 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [unassignedGeos.length, selectedGeoIds, newGeos, isEditing]);

    // Handle Drawing Interaction
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group || !isDrawing) return;

        // When drawing, temporarily disable interactivity of existing layers so they don't block clicks
        group.eachLayer((layer: any) => {
            if (layer instanceof L.Path || layer instanceof L.Marker) {
                layer.getElement()?.style.setProperty('pointer-events', 'none');
            }
        });
        map.invalidateSize();
        map.getContainer().style.cursor = 'crosshair';
        tempPointsRef.current = [];

        // When drawing, temporarily disable interactivity of existing layers so they don't block clicks
        group.eachLayer((layer: any) => {
            const el = layer.getElement?.();
            if (el) el.style.pointerEvents = 'none';
        });

        const redraw = () => {
            if (tempVisualRef.current) map.removeLayer(tempVisualRef.current);
            if (tempPointsRef.current.length === 0) return;

            const visualGroup = L.featureGroup();

            // Draw indicators for every point
            tempPointsRef.current.forEach(pt => {
                L.circleMarker(pt, {
                    radius: 5,
                    color: '#6366f1',
                    fillColor: 'white',
                    fillOpacity: 1,
                    weight: 2
                }).addTo(visualGroup);
            });

            if (tempPointsRef.current.length > 1) {
                L.polygon(tempPointsRef.current, {
                    color: '#6366f1',
                    weight: 3,
                    fillColor: '#6366f1',
                    fillOpacity: 0.15,
                    dashArray: isDrawing === 'Polygon' ? '5, 8' : undefined
                }).addTo(visualGroup);
            }

            tempVisualRef.current = visualGroup.addTo(map);
        };

        const handleClick = (e: L.LeafletMouseEvent) => {
            const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];

            if (isDrawing === 'Point') {
                setNewGeos(prev => [...prev, { type: 'Point', coords: latlng }]);
                setIsDrawing(null);
            } else {
                const last = tempPointsRef.current[tempPointsRef.current.length - 1];
                if (last && last[0] === latlng[0] && last[1] === latlng[1]) return;

                tempPointsRef.current.push(latlng);
                redraw();
            }
        };

        const handleDblClick = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stop(e.originalEvent);
            if (isDrawing === 'Polygon' && tempPointsRef.current.length >= 3) {
                const finalPoints = [...tempPointsRef.current];
                setNewGeos(prev => [...prev, { type: 'Polygon', coords: finalPoints }]);
                if (tempVisualRef.current) map.removeLayer(tempVisualRef.current);
                tempVisualRef.current = null;
                tempPointsRef.current = [];
                setIsDrawing(null);
            }
        };

        map.on('click', handleClick);
        map.on('dblclick', handleDblClick);

        return () => {
            map.off('click', handleClick);
            map.off('dblclick', handleDblClick);
            map.getContainer().style.cursor = '';

            if (tempVisualRef.current) {
                map.removeLayer(tempVisualRef.current);
                tempVisualRef.current = null;
            }

            // Always restore interactivity in cleanup
            group.eachLayer((layer: any) => {
                const el = layer.getElement?.();
                if (el) el.style.pointerEvents = 'auto';
            });
        };
    }, [isDrawing]);

    const updateParam = (key: string, val: any) => {
        setParams(prev => ({ ...prev, [key]: val }));
        if (key === 'code_name' || key === 'nm_values') setName(val);
        if (key === 'frequency' || key === 'status') setDescription(val);
    };

    const handleSave = () => {
        const selectedExisting = selectedGeoIds.map(id => {
            const g = availableGeometries.find(ag => ag.id === id)!;
            return { id: g.id, type: g.type, coords: g.coordinates };
        });

        const allGeos = [...selectedExisting, ...newGeos];
        if (allGeos.length === 0) return alert('בחר לפחות גיאומטריה אחת');

        onSaveBulk({ name, description, value, parameters: params }, allGeos);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex justify-end bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white dark:bg-slate-900 shadow-2xl w-full max-w-xl h-full overflow-hidden flex flex-col transform transition-all border-l border-gray-200 dark:border-slate-800 pointer-events-auto animate-slideInRight font-heebo relative" dir="rtl">
                {showDeleteConfirm.active && (
                    <div className="absolute inset-0 z-[3000] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-fadeIn">
                        <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full max-w-[280px] border border-gray-100 dark:border-slate-800 animate-slideUp">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight">למחוק לצמיתות?</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed mt-1 px-2">
                                        {showDeleteConfirm.type === 'geo' ? "האם להסיר את השרטוט שבחרת? לא ניתן לבטל פעולה זו." : "האם למחוק את הנקודה הזו מהצורה?"}
                                    </p>
                                </div>
                                <div className="flex gap-2 w-full pt-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm({ active: false, type: 'geo', index: -1 })}
                                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                                    >
                                        ביטול
                                    </button>
                                    <button
                                        onClick={executeDelete}
                                        className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                    >
                                        מחק
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <header className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">{missionNameHebrew}</span>
                        <h3 className="text-xl font-bold leading-tight">הוספת חוקים מרובה</h3>
                    </div>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

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

                        <GenericFormField label="לוגיקה תפעולית">
                            <GenericInput value={value} onChange={setValue} placeholder="לדוגמה: הגבלת גובה 10 מטר" />
                        </GenericFormField>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex justify-between items-end">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-[0.2em]">שיוך גיאוגרפי מרובה</label>
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditing(!isEditing); setIsDrawing(null); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 hover:bg-amber-100'}`}>
                                    {isEditing ? 'סיים עריכה' : 'עריכת נקודות'}
                                </button>
                                <button onClick={() => { setIsDrawing('Point'); setIsEditing(false); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDrawing === 'Point' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'}`}>+ נקודה</button>
                                <button onClick={() => { setIsDrawing('Polygon'); setIsEditing(false); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDrawing === 'Polygon' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200'}`}>+ פוליגון</button>
                            </div>
                        </div>

                        <div className="relative h-72 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-inner group">
                            <div ref={mapRef} className="w-full h-full z-0" />
                            {isEditing && (
                                <div className="absolute top-4 right-4 z-[100] bg-amber-500/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                                    מצב עריכה: גרור נקודות
                                </div>
                            )}
                            {isDrawing && (
                                <div className="absolute inset-0 z-[100] bg-indigo-600/5 pointer-events-none flex items-start justify-center pt-4">
                                    <div className="bg-indigo-600/90 dark:bg-indigo-500/90 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl pointer-events-auto">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        <span>דגום את הגיאומטריה הרצויה</span>
                                        <div className="w-px h-3 bg-white/20 mx-1"></div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsDrawing(null); if (tempVisualRef.current) mapInstanceRef.current?.removeLayer(tempVisualRef.current); tempPointsRef.current = []; }}
                                            className="hover:text-indigo-200 transition-colors px-1"
                                        >
                                            ביטול
                                        </button>
                                    </div>
                                </div>
                            )}
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

                <footer className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-white transition-all active:scale-95">ביטול</button>
                    <button
                        onClick={handleSave}
                        disabled={selectedGeoIds.length === 0 && newGeos.length === 0}
                        className="flex-[2] px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        צור {selectedGeoIds.length + newGeos.length} חוקים חדשים
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default BulkRuleForm;
