// Add useCallback to the react import list
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MissionGeometry, Rule, GeometryType } from '../types';

interface MapDisplayProps {
  geometries: MissionGeometry[];
  focusedGeoId: string | null;
  focusedRuleId: string | null;
  rules: Rule[];
  isVisible?: boolean;
  onSelectAsset?: (missionId: string, ruleId?: string, geoId?: string) => void;
  currentMissionId?: string;
  darkMode: boolean;
  drawingMode: GeometryType | null;
  onGeometryCaptured: (type: GeometryType, coords: any) => void;
  onCancelDrawing: () => void;
  resetViewToggle: number;
  zoomInToggle: number;
  zoomOutToggle: number;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  geometries,
  focusedGeoId,
  focusedRuleId,
  rules,
  isVisible = true,
  onSelectAsset,
  currentMissionId,
  darkMode,
  drawingMode,
  onGeometryCaptured,
  onCancelDrawing,
  resetViewToggle,
  zoomInToggle,
  zoomOutToggle
}) => {
  // --- REFS & INSTANCE TRACKING ---
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoLayersRef = useRef<Record<string, L.Layer>>({}); // Stores references to active geometry layers
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Drawing Refs: used for tracking mouse movement and click points during creation
  const drawPointsRef = useRef<[number, number][]>([]);
  const drawLayerRef = useRef<L.Layer | null>(null); // The actual visual shape
  const guideLayerRef = useRef<L.Polyline | null>(null); // The dashed guide line following the cursor

  // Helper to fit mission bounds
  const fitMissionBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || geometries.length === 0) return;

    const bounds = L.latLngBounds([]);
    geometries.forEach(geo => {
      if (geo.type === 'Point') {
        bounds.extend(geo.coordinates as [number, number]);
      } else {
        bounds.extend(geo.coordinates as [number, number][]);
      }
    });

    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [100, 100], duration: 1 });
    }
  }, [geometries]);

  // Handle zoom controls
  useEffect(() => {
    if (zoomInToggle > 0) mapInstanceRef.current?.zoomIn();
  }, [zoomInToggle]);

  useEffect(() => {
    if (zoomOutToggle > 0) mapInstanceRef.current?.zoomOut();
  }, [zoomOutToggle]);

  // Handle manual reset view
  useEffect(() => {
    if (resetViewToggle > 0) {
      fitMissionBounds();
    }
  }, [resetViewToggle, fitMissionBounds]);

  // STEP 1: Initialization
  // We initialize the Leaflet map and set the initial viewpoint.
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const m = L.map(mapContainerRef.current, {
      zoomControl: false,
      doubleClickZoom: false // Disabled to allow dblclick for polygon completion
    });

    mapInstanceRef.current = m;

    // Default center point (e.g., Tel Aviv coordinates)
    m.setView([32.0853, 34.7818], 13);

    return () => {
      m.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // STEP 2: Main Drawing Logic
  // Handles the interactive drawing of points and areas on the Large Map.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reset drawing state when entrying or exiting drawing mode
    drawPointsRef.current = [];
    if (drawLayerRef.current) {
      drawLayerRef.current.remove();
      drawLayerRef.current = null;
    }
    if (guideLayerRef.current) {
      guideLayerRef.current.remove();
      guideLayerRef.current = null;
    }

    if (!drawingMode) {
      map.off('click');
      map.off('mousemove');
      map.off('dblclick');
      return;
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (drawingMode === 'Point') {
        onGeometryCaptured('Point', [e.latlng.lat, e.latlng.lng]);
      } else if (drawingMode === 'Polygon') {
        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
        drawPointsRef.current.push(newPoint);

        if (drawLayerRef.current) drawLayerRef.current.remove();

        if (drawPointsRef.current.length === 1) {
          drawLayerRef.current = L.circleMarker(newPoint, { radius: 6, color: '#6366f1', fillOpacity: 1 }).addTo(map);
        } else {
          drawLayerRef.current = L.polygon(drawPointsRef.current, { color: '#6366f1', fillOpacity: 0.3 }).addTo(map);
        }
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (drawingMode === 'Polygon' && drawPointsRef.current.length > 0) {
        if (guideLayerRef.current) guideLayerRef.current.remove();
        guideLayerRef.current = L.polyline([drawPointsRef.current[drawPointsRef.current.length - 1], e.latlng], {
          color: '#6366f1',
          dashArray: '5, 10',
          weight: 2
        }).addTo(map);
      }
    };

    const handleDblClick = () => {
      if (drawingMode === 'Polygon' && drawPointsRef.current.length > 2) {
        onGeometryCaptured('Polygon', [...drawPointsRef.current]);
      }
    };

    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.off('dblclick', handleDblClick);
    };
  }, [drawingMode, onGeometryCaptured]);

  // Sync Tile Layer with Theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) tileLayerRef.current.remove();

    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; CARTO'
    }).addTo(map);

  }, [darkMode]);

  // Sync Geometries and Fit Bounds ONLY on Mission Load (not every rule update)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    (Object.values(geoLayersRef.current) as L.Layer[]).forEach((layer) => layer.remove());
    geoLayersRef.current = {};

    geometries.forEach(geo => {
      let layer: L.Layer;
      const hasRule = !!geo.ruleId;
      const associatedRule = rules.find(r => r.id === geo.ruleId);
      const isFocused = focusedRuleId === geo.ruleId || focusedGeoId === geo.id;

      const baseColor = hasRule ? '#22c55e' : '#ef4444';
      const borderCol = hasRule ? '#166534' : '#991b1b';

      const layerOptions = {
        fillColor: baseColor,
        color: borderCol,
        weight: isFocused ? 5 : 2,
        opacity: 1,
        fillOpacity: geo.type === 'Point' ? 0.9 : 0.5,
      };

      if (geo.type === 'Point') {
        const coords = geo.coordinates as [number, number];
        layer = L.circleMarker(coords, { ...layerOptions, radius: isFocused ? 14 : 9 });
      } else {
        const coords = geo.coordinates as [number, number][];
        layer = L.polygon(coords, { ...layerOptions, dashArray: hasRule ? undefined : '5, 5' });
      }

      layer.on('click', (e: L.LeafletMouseEvent) => {
        if (drawingMode) return;
        L.DomEvent.stopPropagation(e);
        if (onSelectAsset) onSelectAsset(geo.missionId, geo.ruleId, geo.id);
      });

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 140px; padding: 2px;">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px; color: ${darkMode ? '#e2e8f0' : '#1f2937'};">
            ${associatedRule ? associatedRule.name : 'No Rule Defined'}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: ${hasRule ? '#22c55e' : '#ef4444'}; display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 14px;">${hasRule ? '✓' : '⚠'}</span> ${hasRule ? 'Rule Defined' : 'No Rule Attached'}
          </div>
        </div>
      `;

      layer.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -5],
        autoPan: false,
        className: darkMode ? 'dark-popup' : ''
      });

      layer.addTo(map);
      geoLayersRef.current[geo.id] = layer;
    });

    // Initial load behavior
    if (geometries.length > 0 && !focusedGeoId && !focusedRuleId && !drawingMode) {
      fitMissionBounds();
    }
  }, [geometries, rules, darkMode, currentMissionId, fitMissionBounds]);

  // Focus Zoom (triggered by manual interactions or selecting a rule from the list)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isVisible || drawingMode) return;

    const targetGeoId = focusedGeoId || (focusedRuleId ? geometries.find(g => g.ruleId === focusedRuleId)?.id : null);
    if (!targetGeoId) return;

    const targetGeo = geometries.find(g => g.id === targetGeoId);
    if (targetGeo) {
      const layer = geoLayersRef.current[targetGeo.id];
      if (layer) {
        layer.openPopup();
        if (targetGeo.type === 'Point') {
          map.flyTo(targetGeo.coordinates as [number, number], 18, { duration: 1 });
        } else {
          if (layer instanceof L.Polygon) {
            map.flyToBounds(layer.getBounds(), { padding: [60, 60], duration: 1 });
          }
        }
      }
    } else {
      map.closePopup();
    }
  }, [focusedRuleId, focusedGeoId, geometries, isVisible, drawingMode]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {drawingMode && (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center pointer-events-none z-[2000] p-4">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xl rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 flex flex-col items-center gap-3 pointer-events-auto animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
              <span className="font-bold text-gray-800 dark:text-white uppercase tracking-wider text-sm">
                Drawing {drawingMode}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center max-w-xs">
              {drawingMode === 'Point'
                ? 'Click once on the map to set the rule location.'
                : 'Click multiple times to define the area. Double-click or click "Finish" to complete.'}
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={onCancelDrawing}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              {drawingMode === 'Polygon' && (
                <button
                  onClick={() => {
                    if (drawPointsRef.current.length > 2) onGeometryCaptured('Polygon', [...drawPointsRef.current]);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  Finish Area
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;