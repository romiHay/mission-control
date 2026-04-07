
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rule, MissionGeometry, GeometryType, FormFieldDef } from '../../types';
import { PARAM_LABELS, PARAM_OPTIONS } from '../../utils/constants';
import GenericFormField from '../ui/GenericFormField';
import { GenericInput, GenericSelect } from '../ui/GenericInputs';
import RuleFormModal from './RuleFormModal';

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

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);
    const editMarkersRef = useRef<L.Marker[]>([]);
    const tempPointsRef = useRef<[number, number][]>([]);
    const tempVisualRef = useRef<L.Layer | null>(null);

    const unassignedGeos = React.useMemo(() => availableGeometries.filter(g => !g.ruleId || g.ruleId === initialData?.id), [availableGeometries, initialData]);

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
        if (!initialData) {
            if (missionName === 'qa') {
                setParams({ code_name: '', frequency: '', code_type: '', checks_amount: '', check_precent: '' });
            } else if (missionName === 'new_missions') {
                setParams({ nm_values: '', status: '', type: '', mpt_values: '', h_values: '', nm_id: '' });
            }
        }
    }, [missionName, initialData]);

    // Initialize Map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const m = L.map(mapRef.current, {
            center: [31.5, 34.8],
            zoom: 8,
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

        // Force Leaflet to recalculate its bounds inside the modal!
        setTimeout(() => {
            m.invalidateSize();
            window.dispatchEvent(new Event('resize'));
        }, 300);

        return () => {
            m.remove();
            mapInstanceRef.current = null;
        };
    }, [darkMode]);

    const hasFittedRef = useRef(false);

    // Initial Zoom Effect: Specific logic to fit bounds once when opened
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || hasFittedRef.current || availableGeometries.length === 0) return;

        // Waiting for modal animation to stabilize
        const timer = setTimeout(() => {
            if (!mapInstanceRef.current) return;
            mapInstanceRef.current.invalidateSize();

            const bounds = L.latLngBounds([]);
            availableGeometries.forEach(geo => {
                if (geo.type === 'Point') {
                    bounds.extend(geo.coordinates as [number, number]);
                } else {
                    bounds.extend(geo.coordinates as [number, number][]);
                }
            });

            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, {
                    padding: [40, 40],
                    maxZoom: 16,
                    animate: false
                });
                hasFittedRef.current = true;
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [availableGeometries]);

    // Update geometries on map
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group) return;

        group.clearLayers();
        editMarkersRef.current.forEach(m => m.remove());
        editMarkersRef.current = [];

        const bounds = L.latLngBounds([]);

        // 1. Render ONLY Unassigned Geometries
        unassignedGeos.forEach(geo => {
            const isSelected = selectedGeoIds.includes(geo.id);
            let layer: L.Layer;

            const color = isSelected ? '#10b981' : '#94a3b8'; // emerald if selected, slate if unselected
            const opacity = isSelected ? 0.8 : 0.4;

            if (geo.type === 'Point') {
                const coords = geo.coordinates as [number, number];
                layer = L.circleMarker(coords, {
                    radius: 8,
                    color: color,
                    weight: isSelected ? 4 : 2,
                    fillOpacity: opacity,
                    fillColor: color
                });
                bounds.extend(coords);
            } else {
                const coords = geo.coordinates as [number, number][];
                layer = L.polygon(coords, {
                    color: color,
                    weight: isSelected ? 4 : 2,
                    fillOpacity: isSelected ? 0.4 : 0.15,
                    fillColor: color
                });
                bounds.extend(coords);
            }

            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (isEditing && geo.type === 'Polygon' && selectedGeoIds.includes(geo.id)) {
                    // Convert an existing assigned shape into a new editable shape, dropping its old DB tie!
                    setSelectedGeoIds(prev => prev.filter(id => id !== geo.id));
                    setNewGeos(prev => [...prev, { type: 'Polygon', coords: geo.coordinates, name: geo.name }]);
                } else if (!isEditing) {
                    setSelectedGeoIds(prev =>
                        prev.includes(geo.id) ? prev.filter(id => id !== geo.id) : [...prev, geo.id]
                    );
                }
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

    }, [availableGeometries, selectedGeoIds, newGeos, isEditing, darkMode]);

    // Handle Drawing Interaction
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group || !isDrawing) return;

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
                setPendingGeo({ type: 'Point', coords: latlng });
                setPendingGeoName('');
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
            // Slight delay to ensure the last click point is processed
            setTimeout(() => {
                if (isDrawing === 'Polygon' && tempPointsRef.current.length >= 3) {
                    const finalPoints = [...tempPointsRef.current];
                    setPendingGeo({ type: 'Polygon', coords: finalPoints });
                    setPendingGeoName('');
                    if (tempVisualRef.current) mapInstanceRef.current?.removeLayer(tempVisualRef.current);
                    tempVisualRef.current = null;
                    tempPointsRef.current = [];
                    setIsDrawing(null);
                }
            }, 100);
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

    const handleSave = async () => {
        // --- FORM VALIDATION ---
        const errs: string[] = [];
        if (uiSchema) {
            uiSchema.forEach(field => {
                if (!params[field.key]) {
                    errs.push(`שדה "${field.label}" הינו שדה חובה`);
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

            {error.length > 0 && (
                <div className="absolute inset-0 z-[4000] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full max-w-sm border border-gray-100 dark:border-slate-800 animate-slideUp">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="w-full">
                                <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight mb-3">שגיאת אימות נתונים</h4>
                                <div className="bg-red-50/50 dark:bg-slate-800 rounded-xl p-3 w-full flex flex-col gap-2 border border-red-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                                    {error.map((err, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-right w-full">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div>
                                            <span className="text-xs font-bold text-red-700 dark:text-red-400 leading-relaxed">{err}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full pt-1">
                                <button
                                    onClick={() => setError([])}
                                    className="w-full px-4 py-3.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    הבנתי, אחזור לתקן
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {pendingGeo && (
                <div className="absolute inset-0 z-[5000] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full max-w-sm border border-gray-100 dark:border-slate-800 animate-slideUp">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-2xl flex items-center justify-center shadow-sm">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div className="w-full">
                                <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight mb-3">שם לגיאומטריה קבועה</h4>
                                <div className="w-full text-right mt-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-white mb-2 block">הכנס שם עבור הגיאומטריה שדגמת:</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={pendingGeoName}
                                        onChange={e => setPendingGeoName(e.target.value)}
                                        placeholder="לדוגמה: מחסן מרכזי"
                                        className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 w-full pt-2">
                                <button
                                    onClick={() => {
                                        setPendingGeo(null);
                                        setPendingGeoName('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    ביטול שרטוט
                                </button>
                                <button
                                    onClick={() => {
                                        setNewGeos(prev => [...prev, { type: pendingGeo.type, coords: pendingGeo.coords, name: pendingGeoName || 'ללא שם' }]);
                                        setPendingGeo(null);
                                        setPendingGeoName('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200 dark:shadow-none"
                                >
                                    שמור
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                <GenericFormField key={field.key} label={field.label} required={true}>
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
                        <div ref={mapRef} className="w-full h-full z-0" />
                        {isEditing && (
                            <div className="absolute top-4 right-4 z-[100] bg-amber-500/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex gap-2">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping mt-1"></div>
                                <div>
                                    <div className="font-extrabold">מצב עריכה: צורות מודגשות ניתנות לשינוי</div>
                                    <div className="text-[9px] font-medium opacity-90">גרור נקודות קיימות, או שים נקודות חדשות על הקווים.<br />לחץ על צורות קיימות כדי להוסיף להן נקודות עריכה.</div>
                                </div>
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
        </RuleFormModal>
    );
};

export default BulkRuleForm;
