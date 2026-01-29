
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry } from './types';
import MissionSidebar from './components/MissionSidebar';
import MissionView from './components/MissionView';
import { INITIAL_MISSIONS, INITIAL_GEOMETRIES, INITIAL_RULES } from './mockData';

// --- APPLICATION ARCHITECTURE ---
// App.tsx is the root component that manages the global state for the entire mission control.
// It handles:
// 1. Mission data and selection.
// 2. Rule and Geometry updates/linking.
// 3. Global Dark Mode/Theme state.
const App: React.FC = () => {
  // Global data stores
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(INITIAL_MISSIONS[0].id);
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [geometries, setGeometries] = useState<MissionGeometry[]>(INITIAL_GEOMETRIES);

  // Cross-component UI state (shared between sidebar, map, and form)
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [focusedGeoId, setFocusedGeoId] = useState<string | null>(null);

  // --- THEME HANDLING ---
  // Tracks Dark/Light mode and persists the preference in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const selectedMission = missions.find(m => m.id === selectedMissionId) || null;

  const handleSelectSpatialAsset = (missionId: string, ruleId?: string, geoId?: string) => {
    setSelectedMissionId(missionId);
    setActiveRuleId(ruleId || null);
    setFocusedGeoId(geoId || null);
  };

  const handleAddRule = (newRule: Rule, newGeo?: MissionGeometry) => {
    if (newGeo) {
      setGeometries(prev => [...prev, newGeo]);
    }
    setRules(prev => [...prev, newRule]);

    // Link existing geometry if provided but not a brand new one
    if (!newGeo && newRule.geometryId) {
      setGeometries(prev => prev.map(g =>
        g.id === newRule.geometryId ? { ...g, ruleId: newRule.id } : g
      ));
    }
  };

  const handleUpdateRule = (updatedRule: Rule, newGeo?: MissionGeometry) => {
    if (newGeo) {
      setGeometries(prev => [...prev, newGeo]);
    }

    setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
    setGeometries(prev => prev.map(g => {
      // Clear old link if geometry changed
      if (g.ruleId === updatedRule.id && g.id !== updatedRule.geometryId) {
        return { ...g, ruleId: undefined };
      }
      // Link new geometry
      if (g.id === updatedRule.geometryId) {
        return { ...g, ruleId: updatedRule.id };
      }
      return g;
    }));
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    setGeometries(prev => prev.map(g => g.ruleId === ruleId ? { ...g, ruleId: undefined } : g));
    if (activeRuleId === ruleId) setActiveRuleId(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      <MissionSidebar
        missions={missions}
        selectedMissionId={selectedMissionId}
        onSelectMission={(id) => {
          setSelectedMissionId(id);
          setActiveRuleId(null);
          setFocusedGeoId(null);
        }}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      <main className="flex-1 overflow-hidden">
        {selectedMission ? (
          <MissionView
            mission={selectedMission}
            rules={rules}
            geometries={geometries}
            activeRuleId={activeRuleId}
            focusedGeoId={focusedGeoId}
            onAddRule={handleAddRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onSelectSpatialAsset={handleSelectSpatialAsset}
            darkMode={darkMode}
            onSetActiveRule={(id) => {
              setActiveRuleId(id);
              if (id) {
                const rule = rules.find(r => r.id === id);
                setFocusedGeoId(rule?.geometryId || null);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500 font-medium">
            Select a mission to begin
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
