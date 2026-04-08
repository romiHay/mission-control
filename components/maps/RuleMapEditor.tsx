import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MissionGeometry, GeometryType } from '../../types';

// =========================================================================
// MATH HELPER FUNCTIONS
// These formulas calculate the distance between points and lines.
// They are used to know exactly where to add a new point when a user clicks on a line.
// =========================================================================

/**
 * Calculates the straight-line distance between two points (x1, y1) and (x2, y2).
 */
export const getDistance = (p1: [number, number], p2: [number, number]) => {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
};

/**
 * Calculates the shortest distance from a point `p` to a line segment spanning from `v` to `w`.
 * This is crucial for knowing if a user clicked "near" an edge of a polygon to add a new point.
 */
export const getDistanceToSegment = (p: [number, number], v: [number, number], w: [number, number]) => {
    const l2 = Math.pow(getDistance(v, w), 2);
    if (l2 === 0) return getDistance(p, v);
    let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
    t = Math.max(0, Math.min(1, t)); // Bound length between 0 and 1
    return getDistance(p, [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]);
};


// =========================================================================
// MAP EDITOR COMPONENT
// This component is strictly responsible for managing the Leaflet Map.
// It receives properties (like selected pieces, new drawings) and triggers 
// events back to the parent component when the user interacts with the map.
// =========================================================================

interface RuleMapEditorProps {
    darkMode: boolean;
    availableGeometries: MissionGeometry[];    // All geometries that can be selected
    selectedGeoIds: string[];                  // IDs of currently selected geometries
    newGeos: { type: GeometryType, coords: any, name?: string }[]; // Newly drawn shapes
    isDrawing: GeometryType | null;            // Is the user actively drawing?
    isEditing: boolean;                        // Is the user actively editing existing lines?
    
    // --- CALLBACK EVENTS ---
    onToggleGeoSelection: (id: string) => void;
    onConvertGeoToEditable: (geo: MissionGeometry) => void;
    onSetNewGeos: (updater: (prev: any[]) => any[]) => void;
    onCaptureDrawing: (type: GeometryType, coords: any) => void;
    onOpenDeletePrompt: (type: 'geo' | 'point', geoIdx: number, pointIdx?: number) => void;
}

const RuleMapEditor: React.FC<RuleMapEditorProps> = ({
    darkMode,
    availableGeometries,
    selectedGeoIds,
    newGeos,
    isDrawing,
    isEditing,
    onToggleGeoSelection,
    onConvertGeoToEditable,
    onSetNewGeos,
    onCaptureDrawing,
    onOpenDeletePrompt
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);
    
    // References to keep track of dynamic edits (like points and drawing lines)
    const editMarkersRef = useRef<L.Marker[]>([]);
    const tempPointsRef = useRef<[number, number][]>([]);
    const tempVisualRef = useRef<L.Layer | null>(null);
    const hasFittedRef = useRef(false);

    // Only geometries that have NOT been assigned to another rule should be selectable here
    const unassignedGeos = React.useMemo(() => availableGeometries, [availableGeometries]);

    // -------------------------------------------------------------
    // 1. MAP INITIALIZATION RUNS ONCE ON MOUNT
    // Initializes Leaflet, sets up dark/light mode layer, ensures resizing.
    // -------------------------------------------------------------
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Create map without zooming into a specific point yet
        const m = L.map(mapRef.current, {
            center: [31.5, 34.8], // Default to Israel center
            zoom: 8,
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: true,
            doubleClickZoom: false, // Turn off so we can use double click for drawing completion!
            fadeAnimation: true
        });

        // Set Dark Mode or Light Mode dynamically using CartoDB layers
        const tileUrl = darkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        L.tileLayer(tileUrl).addTo(m);

        // All shapes will be drawn in this layer group so we can easily clear them on updates
        const group = L.layerGroup().addTo(m);
        layerGroupRef.current = group;
        mapInstanceRef.current = m;

        // Force Map to recalculate bounds (prevents gray box error in modals)
        setTimeout(() => {
            m.invalidateSize();
            window.dispatchEvent(new Event('resize'));
        }, 300);

        return () => {
            m.remove();
            mapInstanceRef.current = null;
        };
    }, [darkMode]);

    // -------------------------------------------------------------
    // 2. ZOOM TO FIT ALL GEOMETRIES ON FIRST OPEN
    // -------------------------------------------------------------
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || hasFittedRef.current || availableGeometries.length === 0) return;

        // Wait for modal animation to stabilize before flying
        const timer = setTimeout(() => {
            if (!mapInstanceRef.current) return;
            mapInstanceRef.current.invalidateSize();

            const bounds = L.latLngBounds([]);
            availableGeometries.forEach(geo => {
                if (geo.type === 'Point') bounds.extend(geo.coordinates as [number, number]);
                else bounds.extend(geo.coordinates as [number, number][]);
            });

            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false });
                hasFittedRef.current = true;
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [availableGeometries]);

    // -------------------------------------------------------------
    // 3. RENDER ALL EXISTING & NEW GEOMETRIES (Runs when things change)
    // -------------------------------------------------------------
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group) return;

        // Clear everything and redraw from scratch!
        group.clearLayers();
        editMarkersRef.current.forEach(m => m.remove());
        editMarkersRef.current = [];

        // A. RENDER ALREADY SAVED (UNASSIGNED) GEOMETRIES
        unassignedGeos.forEach(geo => {
            const isSelected = selectedGeoIds.includes(geo.id);
            let layer: L.Layer;

            const color = isSelected ? '#10b981' : '#94a3b8'; // Green if selected, Gray if not
            const opacity = isSelected ? 0.8 : 0.4;

            if (geo.type === 'Point') {
                layer = L.circleMarker(geo.coordinates as [number, number], {
                    radius: 8, color, weight: isSelected ? 4 : 2, fillOpacity: opacity, fillColor: color
                });
            } else {
                layer = L.polygon(geo.coordinates as [number, number][], {
                    color, weight: isSelected ? 4 : 2, fillOpacity: isSelected ? 0.4 : 0.15, fillColor: color
                });
            }

            // Click interaction for assigned maps
            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                
                // If editing and clicking a previously saved shape, we turn it "new" so vertices can be dragged!
                if (isEditing && geo.type === 'Polygon' && selectedGeoIds.includes(geo.id)) {
                    onConvertGeoToEditable(geo);
                } else if (!isEditing) {
                    onToggleGeoSelection(geo.id);
                }
            });

            layer.addTo(group);
        });

        // B. RENDER NEWLY DRAWN GEOMETRIES (Editable Shapes)
        newGeos.forEach((geo, geoIdx) => {
            const coords = geo.coords as any;
            let layer: L.Layer;

            if (geo.type === 'Point') {
                // Style for a newly drawn POINT
                layer = L.circleMarker(coords as [number, number], {
                    radius: 8, color: '#10b981', weight: 4, fillOpacity: 0.7, fillColor: '#10b981'
                });
            } else {
                // Style for a newly drawn POLYGON
                const poly = L.polygon(coords as [number, number][], {
                    color: '#10b981', weight: 4, fillOpacity: 0.3, fillColor: '#10b981'
                });
                layer = poly;

                // --- EDITING LOGIC: Add new points to polygon lines by clicking the border! ---
                if (isEditing) {
                    poly.on('mousedown', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        const pStart: [number, number] = [e.latlng.lat, e.latlng.lng];
                        const polyCoords = [...coords];

                        let minDist = Infinity;
                        let insertIdx = -1;
                        
                        // Discover exactly which segment the user clicked closest to
                        for (let i = 0; i < polyCoords.length; i++) {
                            const p1 = polyCoords[i];
                            const p2 = polyCoords[(i + 1) % polyCoords.length];
                            const d = getDistanceToSegment(pStart, p1, p2);
                            if (d < minDist) { minDist = d; insertIdx = i + 1; }
                        }

                        if (insertIdx !== -1) {
                            // Insert a new point at that edge exactly where they clicked!
                            polyCoords.splice(insertIdx, 0, pStart);
                            map.dragging.disable(); 
                            poly.setLatLngs(polyCoords);

                            // While mouse moves, drag that new point
                            const onMove = (me: L.LeafletMouseEvent) => {
                                polyCoords[insertIdx] = [me.latlng.lat, me.latlng.lng];
                                poly.setLatLngs(polyCoords);
                            };
                            
                            // On mouse up, lock it in completely!
                            const onUp = () => {
                                map.off('mousemove', onMove);
                                map.off('mouseup', onUp);
                                map.dragging.enable();
                                
                                // Send updated shape coordinates to parent state
                                onSetNewGeos(prev => {
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

            // --- EDITING LOGIC: White Dots on vertices ---
            if (isEditing && geo.type === 'Polygon') {
                const polyCoords = coords as [number, number][];
                polyCoords.forEach((pt, ptIdx) => {
                    const marker = L.marker(pt, {
                        draggable: true, // Allow user to drag points!
                        icon: L.divIcon({
                            className: 'vertex-marker',
                            html: `<div style="width:10px; height:10px; background:white; border:2.5px solid #10b981; border-radius:50%; shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>`,
                            iconSize: [10, 10], iconAnchor: [5, 5]
                        })
                    }).addTo(map);

                    // When physically dragging, dynamically update drawn shape line
                    marker.on('drag', () => {
                        const nextCoords = [...polyCoords];
                        const ll = marker.getLatLng();
                        nextCoords[ptIdx] = [ll.lat, ll.lng];
                        (layer as L.Polygon).setLatLngs(nextCoords);
                    });

                    // When dragging finishes, update master react state
                    marker.on('dragend', () => {
                        const nextCoords = [...polyCoords];
                        const ll = marker.getLatLng();
                        nextCoords[ptIdx] = [ll.lat, ll.lng];
                        onSetNewGeos(prev => {
                            const next = [...prev];
                            next[geoIdx] = { ...next[geoIdx], coords: nextCoords };
                            return next;
                        });
                    });

                    // Removing a point by right-clicking the white dot!
                    marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        if (polyCoords.length > 3) {
                            onOpenDeletePrompt('point', geoIdx, ptIdx);
                        }
                    });

                    editMarkersRef.current.push(marker);
                });
            }

            // Clicking an existing drawn shape to delete it (If we are NOT editing)
            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (!isEditing) onOpenDeletePrompt('geo', geoIdx);
            });
            layer.addTo(group);
        });

    }, [unassignedGeos, selectedGeoIds, newGeos, isEditing, darkMode, onOpenDeletePrompt, onSetNewGeos, onToggleGeoSelection, onConvertGeoToEditable]);


    // -------------------------------------------------------------
    // 4. DRAWING CREATION MODE (Points and Polygons)
    // Runs when user presses the "+ Polygon" or "+ Point" button
    // -------------------------------------------------------------
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group || !isDrawing) return;

        map.invalidateSize();
        map.getContainer().style.cursor = 'crosshair'; // Make mouse look like crosshair
        tempPointsRef.current = [];

        // Disable clicks on existing shapes so we don't accidentally select them while drawing
        group.eachLayer((layer: any) => {
            const el = layer.getElement?.();
            if (el) el.style.pointerEvents = 'none';
        });

        const redrawTempLayer = () => {
            if (tempVisualRef.current) map.removeLayer(tempVisualRef.current);
            if (tempPointsRef.current.length === 0) return;

            const visualGroup = L.featureGroup();

            // Draw a dot for every click we successfully registered
            tempPointsRef.current.forEach(pt => {
                L.circleMarker(pt, { radius: 5, color: '#6366f1', fillColor: 'white', fillOpacity: 1, weight: 2 }).addTo(visualGroup);
            });

            // If there's more than 1 point, start drawing lines between them so the user knows what it looks like!
            if (tempPointsRef.current.length > 1) {
                L.polygon(tempPointsRef.current, {
                    color: '#6366f1', weight: 3, fillColor: '#6366f1', fillOpacity: 0.15,
                    dashArray: isDrawing === 'Polygon' ? '5, 8' : undefined // Dashed line while drawing!
                }).addTo(visualGroup);
            }

            tempVisualRef.current = visualGroup.addTo(map);
        };

        const handleClick = (e: L.LeafletMouseEvent) => {
            const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];

            if (isDrawing === 'Point') {
                // If it's a point, one click is all we need! Send it up immediately!
                onCaptureDrawing('Point', latlng);
            } else {
                // Ignore double clicks registering as weird points
                const last = tempPointsRef.current[tempPointsRef.current.length - 1];
                if (last && last[0] === latlng[0] && last[1] === latlng[1]) return;

                tempPointsRef.current.push(latlng);
                redrawTempLayer(); // Reflect it to screen!
            }
        };

        // When user double clicks, the polygon is finished! Send it to the parent state!
        const handleDblClick = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stop(e.originalEvent);
            setTimeout(() => {
                if (isDrawing === 'Polygon' && tempPointsRef.current.length >= 3) {
                    onCaptureDrawing('Polygon', [...tempPointsRef.current]);
                    
                    // Cleanup drawing layers
                    if (tempVisualRef.current) mapInstanceRef.current?.removeLayer(tempVisualRef.current);
                    tempVisualRef.current = null;
                    tempPointsRef.current = [];
                }
            }, 100);
        };

        map.on('click', handleClick);
        map.on('dblclick', handleDblClick);

        return () => {
            // ALWAYS clean up leaflet events and pointers when leaving draw mode!
            map.off('click', handleClick);
            map.off('dblclick', handleDblClick);
            map.getContainer().style.cursor = '';

            if (tempVisualRef.current) {
                map.removeLayer(tempVisualRef.current);
                tempVisualRef.current = null;
            }

            group.eachLayer((layer: any) => {
                const el = layer.getElement?.();
                if (el) el.style.pointerEvents = 'auto'; // Turn interactivity back on for shapes!
            });
        };
    }, [isDrawing, onCaptureDrawing]);


    // Let the parent component know when to cancel drawing via escape key
    useEffect(() => {
       const escapeCancel = (e: KeyboardEvent) => {
           if (e.key === 'Escape' && isDrawing) {
               if (tempVisualRef.current) mapInstanceRef.current?.removeLayer(tempVisualRef.current);
               tempPointsRef.current = [];
           }
       };
       window.addEventListener('keydown', escapeCancel);
       return () => window.removeEventListener('keydown', escapeCancel);
    }, [isDrawing]);


    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full z-0 pointer-events-auto" />
            
            {/* INFORMATIVE OVERLAYS FOR THE USER */}
            {isEditing && (
                <div className="absolute top-4 right-4 z-[100] bg-amber-500/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex gap-2">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping mt-1"></div>
                    <div>
                        <div className="font-extrabold">מצב עריכה: צורות מודגשות ניתנות לשינוי</div>
                        <div className="text-[9px] font-medium opacity-90 leading-tight mt-0.5">
                            גרור נקודות קיימות (לבן), או לחץ על קווים להוסיף.<br />לחץ על צורות ירוקות כדי לערוך אותן.<br />לחיצה ימנית על נקודה ימחק אותה.
                        </div>
                    </div>
                </div>
            )}
            
            {isDrawing && (
                <div className="absolute inset-0 z-[100] bg-indigo-600/5 pointer-events-none flex items-start justify-center pt-4">
                    <div className="bg-indigo-600/90 dark:bg-indigo-500/90 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl pointer-events-auto">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>{isDrawing === 'Polygon' ? 'לחץ פעמיים לריק בכדי לסיים שרטוט פוליגון' : 'דגום נקודה במפה'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuleMapEditor;
