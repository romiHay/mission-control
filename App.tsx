
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry } from './types';
import MissionSidebar from './components/MissionSidebar';
import MissionView from './components/MissionView';

// --- APPLICATION ARCHITECTURE ---
// App.tsx is the root component that manages the global state for the entire mission control.
// It handles:
// 1. Mission data and selection.
// 2. Rule and Geometry updates/linking.
// 3. Global Dark Mode/Theme state.
const App: React.FC = () => {
  // Global data stores
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [geometries, setGeometries] = useState<MissionGeometry[]>([]);

  // Cross-component UI state (shared between sidebar, map, and form)
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [focusedGeoId, setFocusedGeoId] = useState<string | null>(null);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      console.log('Fetching live data from PostgreSQL...');
      const [missionsRes, geometriesRes, rulesRes] = await Promise.all([
        fetch('http://localhost:3001/api/missions'),
        fetch('http://localhost:3001/api/geometries'),
        fetch('http://localhost:3001/api/rules')
      ]);

      const missionsData = await missionsRes.json();
      const geometriesData = await geometriesRes.json();
      const rulesData = await rulesRes.json();

      setMissions(missionsData);
      setGeometries(geometriesData);
      setRules(rulesData);

      if (missionsData.length > 0 && !selectedMissionId) {
        setSelectedMissionId(missionsData[0].id);
      }
    } catch (err) {
      console.error('SERVER ERROR: Ensure PostgreSQL is running and you started the app with "npm run dev"', err);
    }
  }, [selectedMissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleAddRule = async (newRule: Rule, newGeo?: MissionGeometry) => {
    try {
      // Optimistic update (optional, but good for UX)
      // For now, let's just do the DB call and refresh
      const response = await fetch('http://localhost:3001/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rule: newRule, newGeo }),
      });

      if (!response.ok) {
        throw new Error('Failed to save rule to DB');
      }

      console.log('Rule saved to DB, refreshing data...');
      await fetchData();
    } catch (err) {
      console.error('Error adding rule:', err);
      // Fallback to local state if DB fails (already handled by error log)
    }
  };

  const handleUpdateRule = async (updatedRule: Rule, newGeo?: MissionGeometry) => {
    try {
      const response = await fetch(`http://localhost:3001/api/rules/${updatedRule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rule: updatedRule, newGeo }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rule in DB');
      }

      console.log('Rule updated in DB, refreshing data...');
      await fetchData();
    } catch (err) {
      console.error('Error updating rule:', err);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
    setGeometries(prev => prev.map(g => g.ruleId === ruleId ? { ...g, ruleId: undefined } : g));
    if (activeRuleId === ruleId) setActiveRuleId(null);
  };

  return (
    <div dir="rtl" className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
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
            בחר משימה כדי להתחיל
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
