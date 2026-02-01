
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry } from './types';
import MissionSidebar from './components/MissionSidebar';
import MissionView from './components/MissionView';
import { api } from './services/api';

const App: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [geometries, setGeometries] = useState<MissionGeometry[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [focusedGeoId, setFocusedGeoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Theme state
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

  // Load initial missions
  useEffect(() => {
    api.getMissions().then(data => {
      setMissions(data);
      if (data.length > 0) setSelectedMissionId(data[0].id);
      setLoading(false);
    });
  }, []);

  // Load rules and geometries when mission changes
  useEffect(() => {
    if (selectedMissionId) {
      Promise.all([
        api.getRules(selectedMissionId),
        api.getGeometries(selectedMissionId)
      ]).then(([rulesData, geoData]) => {
        setRules(rulesData);
        setGeometries(geoData);
      });
    }
  }, [selectedMissionId]);

  const selectedMission = missions.find(m => m.id === selectedMissionId) || null;

  const handleSelectSpatialAsset = (missionId: string, ruleId?: string, geoId?: string) => {
    setSelectedMissionId(missionId);
    setActiveRuleId(ruleId || null);
    setFocusedGeoId(geoId || null);
  };

  const handleAddRule = async (newRule: Rule, newGeo?: MissionGeometry) => {
    if (selectedMissionId) {
      if (newGeo) {
        await api.addGeometry(selectedMissionId, newGeo);
        setGeometries(prev => [...prev, newGeo]);
      }

      await api.addRule(selectedMissionId, newRule);
      setRules(prev => [...prev, newRule]);

      if (!newGeo && newRule.geometryId) {
        // This part would ideally be updated on backend too if geometry->rule relation is kept there
        setGeometries(prev => prev.map(g =>
          g.id === newRule.geometryId ? { ...g, ruleId: newRule.id } : g
        ));
      }
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
    </div>
  );
};

export default App;
