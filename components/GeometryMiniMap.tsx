// This component provides a small, interactive map inside the Rule Form.
// It allows users to either view an existing spatial asset or draw a new one (Point or Polygon).
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GeometryType } from '../types';

interface GeometryMiniMapProps {
    type: GeometryType;
    coordinates?: any;
    onGeometryCaptured: (coords: any) => void;
    isDrawing: boolean;
    onCancelDrawing: () => void;
    darkMode: boolean;
}

const GeometryMiniMap: React.FC<GeometryMiniMapProps> = ({
    type,
    coordinates,
    onGeometryCaptured,
    isDrawing,
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
    const [isReady, setIsReady] = useState(false);

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
                        const bounds = poly.getBounds();
                        if (bounds.isValid()) {
                            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
                        }
                    }
                }
                map.invalidateSize();
            } catch (e) {
                console.error("Error drawing geometry on mini-map:", e);
            }
        }
    }, [coordinates, type, isDrawing, isReady]);

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

            if (type === 'Point') {
                tempLayerRef.current = L.circleMarker(tempPointsRef.current[0], {
                    radius: 8,
                    color: '#6366f1',
                    fillOpacity: 1
                });
            } else {
                tempLayerRef.current = L.polygon(tempPointsRef.current, {
                    color: '#6366f1',
                    fillOpacity: 0.3
                });
            }
            tempLayerRef.current.addTo(group);
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
