// Add useCallback to the react import list
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MissionGeometry, Rule, GeometryType } from '../../types';

interface MapDisplayProps {
  geometries: MissionGeometry[];
  focusedGeoId: string | null;
  focusedRuleId: string | null;
  rules: Rule[];
  isVisible?: boolean;
  onSelectAsset?: (missionId: string, ruleId?: string, geoId?: string) => void;
  currentMissionId?: string;
  darkMode: boolean;
  onDeleteGeometry?: (geoId: string) => void;
  onDeleteGeometries?: (geoIds: string[]) => void;
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
  onDeleteGeometry,
  onDeleteGeometries,
  resetViewToggle,
  zoomInToggle,
  zoomOutToggle
}) => {
  // --- REFS & INSTANCE TRACKING ---
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoLayersRef = useRef<Record<string, L.Layer>>({}); // Stores references to active geometry layers
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hasInitializedViewRef = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [multiSelectedGeoIds, setMultiSelectedGeoIds] = useState<string[]>([]);

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
    setCurrentZoom(m.getZoom());

    m.on('zoomend', () => {
      setCurrentZoom(m.getZoom());
    });

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
      const isMultiSelected = multiSelectedGeoIds.includes(geo.id);

      const baseColor = hasRule ? '#22c55e' : '#ef4444';
      const borderCol = isMultiSelected ? '#3b82f6' : (hasRule ? '#166534' : '#991b1b');

      const layerOptions = {
        fillColor: baseColor,
        color: borderCol,
        weight: isMultiSelected ? 6 : (isFocused ? 5 : 2),
        opacity: 1,
        fillOpacity: geo.type === 'Point' ? 0.9 : 0.5,
      };

      if (geo.type === 'Point') {
        const coords = geo.coordinates as [number, number];

        // Dynamic radius based on zoom level: 
        // Very small when zoomed out (e.g. zoom 10 -> radius 4)
        // Normal when zoomed in (e.g. zoom 17+ -> radius 9-10)
        const zoomBase = Math.max(6, Math.min(10, currentZoom - 7));
        const radius = isFocused ? zoomBase * 1.5 : zoomBase;

        layer = L.circleMarker(coords, { ...layerOptions, radius });
      } else {
        const coords = geo.coordinates as [number, number][];
        layer = L.polygon(coords, { ...layerOptions, dashArray: hasRule ? undefined : '5, 5' });
      }

      layer.on('click', (e: L.LeafletMouseEvent) => {
        if (drawingMode) return;
        L.DomEvent.stopPropagation(e);
        
        if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            if (!hasRule && geo.createdBy === 'user') {
                setMultiSelectedGeoIds(prev =>
                    prev.includes(geo.id) ? prev.filter(id => id !== geo.id) : [...prev, geo.id]
                );
            }
            return;
        }

        setMultiSelectedGeoIds([]);
        (layer as any).openPopup();
        
        const mapObj = mapInstanceRef.current;
        if (mapObj) {
            if (geo.type === 'Point') {
                mapObj.flyTo(geo.coordinates as [number, number], 18, { duration: 1 });
            } else if (layer instanceof L.Polygon) {
                mapObj.flyToBounds(layer.getBounds(), { padding: [60, 60], duration: 1 });
            }
        }

        if (onSelectAsset) onSelectAsset(geo.missionId, geo.ruleId, geo.id);
      });

      const popupDiv = document.createElement('div');
      popupDiv.innerHTML = `
        <div style="font-family: sans-serif; min-width: 140px; padding: 2px; text-align: right;" dir="rtl">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px; color: ${darkMode ? '#e2e8f0' : '#1f2937'};">
            ${geo.name || 'ללא שם'}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: ${hasRule ? '#22c55e' : '#ef4444'}; display: flex; align-items: center; justify-content: flex-start; gap: 4px;">
            <span style="font-size: 14px;">${hasRule ? '✓' : '⚠'}</span> ${hasRule && associatedRule ? `חוק מוגדר: ${associatedRule.name}` : 'חוק חסר'}
          </div>
          ${(!hasRule && geo.createdBy === 'user') ? `
          <button id="del-btn-${geo.id}" style="margin-top: 8px; width: 100%; padding: 6px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; transition: opacity 0.2s;" onmousedown="this.style.opacity=0.7" onmouseup="this.style.opacity=1" onmouseleave="this.style.opacity=1">
             מחק דגימה
          </button>
          ` : ''}
        </div>
      `;

      if (!hasRule && geo.createdBy === 'user' && onDeleteGeometry) {
        const btn = popupDiv.querySelector(`#del-btn-${geo.id}`) as HTMLElement;
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            onDeleteGeometry(geo.id);
          });
        }
      }

      layer.bindPopup(popupDiv, {
        closeButton: false,
        offset: [0, -5],
        autoPan: false,
        className: darkMode ? 'dark-popup' : ''
      });

      layer.addTo(map);
      geoLayersRef.current[geo.id] = layer;
    });

    // Initial load behavior is handled by a separate effect
  }, [geometries, rules, darkMode, currentMissionId, drawingMode]);

  // Handle focused state and multi-select state dynamically without recreating layers
  useEffect(() => {
    geometries.forEach(geo => {
      const layer = geoLayersRef.current[geo.id];
      if (!layer) return;

      const hasRule = !!geo.ruleId;
      const isFocused = focusedRuleId === geo.ruleId || focusedGeoId === geo.id;
      const isMultiSelected = multiSelectedGeoIds.includes(geo.id);

      const borderCol = isMultiSelected ? '#3b82f6' : (hasRule ? '#166534' : '#991b1b');

      if (typeof (layer as any).setStyle === 'function') {
        (layer as any).setStyle({
          color: borderCol,
          weight: isMultiSelected ? 6 : (isFocused ? 5 : 2),
        });
      }

      if (geo.type === 'Point' && typeof (layer as any).setRadius === 'function') {
        const zoomBase = Math.max(6, Math.min(10, currentZoom - 7));
        const radius = isFocused ? zoomBase * 1.5 : zoomBase;
        (layer as L.CircleMarker).setRadius(radius);
      }
    });
  }, [focusedGeoId, focusedRuleId, multiSelectedGeoIds, currentZoom, geometries]);

  // Initial load behavior: Only fit bounds once per mission load
  useEffect(() => {
    if (geometries.length > 0 && !focusedGeoId && !focusedRuleId && !drawingMode && !hasInitializedViewRef.current) {
      fitMissionBounds();
      hasInitializedViewRef.current = true;
    }
  }, [geometries, focusedGeoId, focusedRuleId, drawingMode, fitMissionBounds]);

  // Reset initialization flag when switching missions
  useEffect(() => {
    hasInitializedViewRef.current = false;
  }, [currentMissionId]);

  // Track last focused ID to prevent "snap-back" on every render/poll
  const lastTargetGeoIdRef = useRef<string | null>(null);

  // Focus Zoom (triggered by manual interactions or selecting a rule from the list)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isVisible || drawingMode) return;

    // Only zoom if the target has actually CHANGED
    if (!focusedGeoId && !focusedRuleId) {
      lastTargetGeoIdRef.current = null;
      map.closePopup();
      return;
    }

    if (focusedGeoId) {
      const targetGeo = geometries.find(g => g.id === focusedGeoId);
      if (targetGeo) {
        const layer = geoLayersRef.current[targetGeo.id];
        if (layer) {
          layer.openPopup();
          if (focusedGeoId !== lastTargetGeoIdRef.current) {
            lastTargetGeoIdRef.current = focusedGeoId;
            if (targetGeo.type === 'Point') {
              map.flyTo(targetGeo.coordinates as [number, number], 18, { duration: 1 });
            } else if (layer instanceof L.Polygon) {
              map.flyToBounds(layer.getBounds(), { padding: [60, 60], duration: 1 });
            }
          }
        }
      }
    } else if (focusedRuleId) {
      const ruleGeos = geometries.filter(g => g.ruleId === focusedRuleId);
      if (ruleGeos.length > 0 && focusedRuleId !== lastTargetGeoIdRef.current) {
        lastTargetGeoIdRef.current = focusedRuleId;
        
        const bounds = L.latLngBounds([]);
        ruleGeos.forEach(geo => {
          const layer = geoLayersRef.current[geo.id];
          if (layer) layer.openPopup(); // Open pipups for these geometries
          
          if (geo.type === 'Point') {
            bounds.extend(geo.coordinates as [number, number]);
          } else {
            bounds.extend(geo.coordinates as [number, number][]);
          }
        });

        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [60, 60], duration: 1 });
        }
      }
    }
  }, [focusedRuleId, focusedGeoId, geometries, isVisible, drawingMode]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {drawingMode && (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center pointer-events-none z-[2000] p-4" dir="rtl">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-2xl rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 flex flex-col items-center gap-3 pointer-events-auto animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
              <span className="font-bold text-gray-800 dark:text-white uppercase tracking-wider text-sm">
                משרטט {drawingMode === 'Point' ? 'נקודה' : 'פוליגון'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 text-center max-w-xs">
              {drawingMode === 'Point'
                ? 'לחץ פעם אחת על המפה כדי לקבוע את מיקום הכלל.'
                : 'לחץ מספר פעמים כדי להגדיר את השטח. דאבל-קליק או לחיצה על "סיום" להשלמה.'}
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={onCancelDrawing}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              {drawingMode === 'Polygon' && (
                <button
                  onClick={() => {
                    if (drawPointsRef.current.length > 2) onGeometryCaptured('Polygon', [...drawPointsRef.current]);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  סיום פוליגון
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {multiSelectedGeoIds.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 p-2.5 flex items-center gap-4 animate-slideDown">
             <span className="font-bold text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 tracking-wide uppercase">
                 נבחרו {multiSelectedGeoIds.length} דגימות
             </span>
             <button 
                 onClick={() => {
                     setMultiSelectedGeoIds([]);
                 }} 
                 className="text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-2 transition-colors active:scale-95"
             >
                 ביטול
             </button>
             <button 
                 onClick={() => {
                     if (onDeleteGeometries) {
                         onDeleteGeometries(multiSelectedGeoIds);
                         setMultiSelectedGeoIds([]);
                     }
                 }} 
                 className="bg-red-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-600 transition-colors shadow-sm active:scale-95"
             >
                 מחק בחירה
             </button>
          </div>
      )}
    </div>
  );
};

export default MapDisplay;