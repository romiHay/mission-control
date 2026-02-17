// This component provides a small, interactive map inside the Rule Form.
// It allows users to either view an existing spatial asset or draw a new one (Point or Polygon).
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GeometryType } from '../../types';

interface GeometryMiniMapProps {
    type: GeometryType;
    coordinates?: any;
    onGeometryCaptured: (coords: any) => void;
    isDrawing: boolean;
    isEditing?: boolean;
    onCancelDrawing: () => void;
    darkMode: boolean;
}

const GeometryMiniMap: React.FC<GeometryMiniMapProps> = ({
    type,
    coordinates,
    onGeometryCaptured,
    isDrawing,
    isEditing = false,
    onCancelDrawing,
    darkMode
}) => {
    // Map container and instance references
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<L.LayerGroup | null>(null);

    // Internal state to track the points being drawn before they are confirmed
    const tempPointsRef = useRef<[number, number][]>([]);
    const tempLayerRef = useRef<L.Layer | null>(null);
    const editMarkersRef = useRef<L.Marker[]>([]);
    const [isReady, setIsReady] = useState(false);

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

    // STEP 1: Initialization
    // We initialize the Leaflet map once the component mounts.
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const timeout = setTimeout(() => {
            if (!mapRef.current) return;
            const m = L.map(mapRef.current, {
                zoomControl: true,
                attributionControl: false,
                doubleClickZoom: false
            }).setView([32.0853, 34.7818], 13);

            const tileUrl = darkMode
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

            L.tileLayer(tileUrl).addTo(m);

            layerGroupRef.current = L.layerGroup().addTo(m);
            mapInstanceRef.current = m;
            setIsReady(true);
            m.invalidateSize();
        }, 100);

        return () => {
            clearTimeout(timeout);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [darkMode]);

    // STEP 2: Displaying Existing Geometry
    // This effect handles rendering the provided 'coordinates' on the map when not in drawing mode.
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group || isDrawing || !isReady) return;

        group.clearLayers();

        if (coordinates) {
            try {
                if (type === 'Point') {
                    const coords = coordinates as [number, number];
                    if (Array.isArray(coords) && coords.length === 2) {
                        L.circleMarker(coords, { radius: 8, color: '#4f46e5', weight: 3, fillOpacity: 0.7 }).addTo(group);
                        map.panTo(coords);
                    }
                } else if (type === 'Polygon') {
                    const coords = coordinates as [number, number][];
                    if (Array.isArray(coords) && coords.length > 0) {
                        const poly = L.polygon(coords, { color: '#4f46e5', weight: 3, fillOpacity: 0.3 }).addTo(group);

                        // If in editing mode, handle adding points by clicking on edges
                        if (isEditing) {
                            poly.on('mousedown', (e: L.LeafletMouseEvent) => {
                                // Prevent map drag while we are creating a point
                                L.DomEvent.stopPropagation(e);
                                const pStart: [number, number] = [e.latlng.lat, e.latlng.lng];

                                // Find the closest segment to insert the new point
                                let minDist = Infinity;
                                let insertIdx = -1;

                                for (let i = 0; i < coords.length; i++) {
                                    const p1 = coords[i];
                                    const p2 = coords[(i + 1) % coords.length];
                                    const d = distToSegment(pStart, p1, p2);
                                    if (d < minDist) {
                                        minDist = d;
                                        insertIdx = i + 1;
                                    }
                                }

                                if (insertIdx !== -1) {
                                    const dragCoords = [...coords];
                                    dragCoords.splice(insertIdx, 0, pStart);

                                    // Disable map dragging so only the point moves (moving "alone")
                                    map.dragging.disable();

                                    // Live update the polygon shape for visual feedback
                                    poly.setLatLngs(dragCoords);

                                    const onMapMouseMove = (me: L.LeafletMouseEvent) => {
                                        dragCoords[insertIdx] = [me.latlng.lat, me.latlng.lng];
                                        poly.setLatLngs(dragCoords);
                                    };

                                    const onMapMouseUp = () => {
                                        map.off('mousemove', onMapMouseMove);
                                        map.off('mouseup', onMapMouseUp);
                                        map.dragging.enable(); // Re-enable map drag
                                        // Finalize the geometry change
                                        onGeometryCaptured([...dragCoords]);
                                    };

                                    map.on('mousemove', onMapMouseMove);
                                    map.on('mouseup', onMapMouseUp);
                                }
                            });
                        }

                        const bounds = poly.getBounds();
                        if (bounds.isValid() && !isEditing) {
                            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
                        }
                    }
                }
                map.invalidateSize();
            } catch (e) {
                console.error("Error drawing geometry on mini-map:", e);
            }
        }
    }, [coordinates, type, isDrawing, isReady, isEditing, onGeometryCaptured]);

    // STEP 2.5: Editing Mode logic
    useEffect(() => {
        const map = mapInstanceRef.current;
        const group = layerGroupRef.current;
        if (!map || !group || !isReady) return;

        const cleanup = () => {
            editMarkersRef.current.forEach(m => m.remove());
            editMarkersRef.current = [];
        };

        if (!isEditing || type !== 'Polygon' || !coordinates) {
            cleanup();
            return;
        }

        const coords = coordinates as [number, number][];

        // We rebuild the markers if the number of points changed or if they aren't initialized
        if (editMarkersRef.current.length !== coords.length) {
            cleanup();

            // Create Vertex Markers
            coords.forEach((coord, index) => {
                const marker = L.marker(coord, {
                    draggable: true,
                    icon: L.divIcon({
                        className: 'vertex-marker',
                        html: `<div style="width: 12px; height: 12px; background: white; border: 3px solid #6366f1; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                }).addTo(map);

                marker.on('drag', () => {
                    const newCoords = editMarkersRef.current.map(m => {
                        const ll = m.getLatLng();
                        return [ll.lat, ll.lng] as [number, number];
                    });

                    group.eachLayer((layer) => {
                        if (layer instanceof L.Polygon) {
                            layer.setLatLngs(newCoords);
                        }
                    });
                });

                marker.on('dragend', () => {
                    const newCoords = editMarkersRef.current.map(m => {
                        const ll = m.getLatLng();
                        return [ll.lat, ll.lng] as [number, number];
                    });
                    onGeometryCaptured(newCoords);
                });

                editMarkersRef.current.push(marker);
            });

            const bounds = L.latLngBounds(coords);
            if (bounds.isValid() && editMarkersRef.current.length === 0) {
                map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
            }
        }
    }, [isEditing, type, coordinates, onGeometryCaptured, isReady]);

    // STEP 3: Drawing Mode Setup
    // This effect sets up event listeners for drawing when 'isDrawing' is true.
    useEffect(() => {
        const map = mapInstanceRef.current;
        // STEP 4: Interaction Logic
        // This effect handles the drawing process by listening to map events.
        const group = layerGroupRef.current;
        if (!map || !group || !isDrawing || !isReady) {
            if (map) {
                map.off('click');
                map.off('dblclick');
                map.getContainer().style.cursor = '';
            }
            return;
        }

        map.invalidateSize();
        // Change cursor to crosshair to indicate active drawing mode
        map.getContainer().style.cursor = 'crosshair';
        group.clearLayers();
        tempPointsRef.current = [];
        tempLayerRef.current = null;

        // Redraws the visual elements (marker or polygon) while user is clicking
        const redrawTemp = () => {
            if (tempLayerRef.current) group.removeLayer(tempLayerRef.current);
            if (tempPointsRef.current.length === 0) return;

            const drawGroup = L.featureGroup();

            if (type === 'Point') {
                L.circleMarker(tempPointsRef.current[0], {
                    radius: 8,
                    color: '#6366f1',
                    fillOpacity: 0.7,
                    weight: 3
                }).addTo(drawGroup);
            } else {
                // For Polygons: Show the shape if we have at least 2 points
                if (tempPointsRef.current.length > 1) {
                    L.polygon(tempPointsRef.current, {
                        color: '#6366f1',
                        fillOpacity: 0.3,
                        weight: 3
                    }).addTo(drawGroup);
                }

                // CRITICAL: Always show markers for every click so they don't "disappear"
                tempPointsRef.current.forEach(pt => {
                    L.circleMarker(pt, {
                        radius: 5,
                        color: '#6366f1',
                        fillColor: 'white',
                        fillOpacity: 1,
                        weight: 2
                    }).addTo(drawGroup);
                });
            }

            tempLayerRef.current = drawGroup.addTo(group);
        };

        const handleClick = (e: L.LeafletMouseEvent) => {
            const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
            if (type === 'Point') {
                // Points are captured instantly on the first click
                tempPointsRef.current = [latlng];
                redrawTemp();
                onGeometryCaptured(latlng);
            } else {
                // For polygons, we prevent adding exact duplicate points from rapid clicking
                const last = tempPointsRef.current[tempPointsRef.current.length - 1];
                if (last && last[0] === latlng[0] && last[1] === latlng[1]) return;

                tempPointsRef.current.push(latlng);
                redrawTemp();
            }
        };

        // STEP 5: Completion Logic (Double-Click)
        // We use double-click to finalize a polygon shape.
        const handleDblClick = (e: L.LeafletMouseEvent) => {
            // Stop propagation to prevent conflict with other map behaviors
            L.DomEvent.stop(e.originalEvent);
            // Wait slightly for any trailing click event to finish processing
            setTimeout(() => {
                if (type === 'Polygon' && tempPointsRef.current.length >= 3) {
                    onGeometryCaptured([...tempPointsRef.current]);
                }
            }, 100);
        };

        map.on('click', handleClick);
        map.on('dblclick', handleDblClick);

        return () => {
            map.off('click', handleClick);
            map.off('dblclick', handleDblClick);
        };
    }, [isDrawing, type, onGeometryCaptured, isReady]);

    return (
        <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-inner group bg-gray-100 dark:bg-slate-900">
            <div ref={mapRef} className="w-full h-full z-0" />
            {!isDrawing && !coordinates && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-[1px] z-10">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">No Geometry Selected</p>
                </div>
            )}
        </div>
    );
};

export default GeometryMiniMap;
