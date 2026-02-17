
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry } from './types';
import MissionSidebar from './components/missions/MissionSidebar';
import MissionView from './components/missions/MissionView';
import { api } from './services/api';

const App: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [geometries, setGeometries] = useState<MissionGeometry[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [focusedGeoId, setFocusedGeoId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [m, g, r] = await Promise.all([
        api.fetchMissions(),
        api.fetchGeometries(),
        api.fetchRules()
      ]);
      setMissions(m);
      setGeometries(g);
      setRules(r);
      if (m.length > 0 && !selectedMissionId) setSelectedMissionId(m[0].id);
    } catch (err) {
      console.error('Data Fetch Error:', err);
    }
  }, [selectedMissionId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const selectedMission = missions.find(m => m.id === selectedMissionId) || null;

  const handleAddRule = async (newRule: Rule, newGeo?: MissionGeometry) => {
    try {
      await api.addRule(newRule, newGeo);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRule = async (updatedRule: Rule, newGeo?: MissionGeometry) => {
    try {
      await api.updateRule(updatedRule, newGeo);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await api.deleteRule(ruleId);
      await fetchData();
      if (activeRuleId === ruleId) setActiveRuleId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBulkRules = async (items: { rule: Rule, newGeo?: MissionGeometry }[]) => {
    try {
      // Process all sequentially to ensure order, but only fetch data once at the end
      for (const item of items) {
        await api.addRule(item.rule, item.newGeo);
      }
      await fetchData();
    } catch (err) {
      console.error('Bulk Add Error:', err);
    }
  };

  const handleUpdateBulkRules = async (items: { rule: Rule, newGeo?: MissionGeometry }[]) => {
    try {
      for (const item of items) {
        await api.updateRule(item.rule, item.newGeo);
      }
      await fetchData();
    } catch (err) {
      console.error('Bulk Update Error:', err);
    }
  };

  return (
    <div dir="rtl" className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden font-heebo">
      <MissionSidebar
        missions={missions}
        selectedMissionId={selectedMissionId}
        onSelectMission={id => { setSelectedMissionId(id); setActiveRuleId(null); setFocusedGeoId(null); }}
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
            onAddBulkRules={handleAddBulkRules}
            onUpdateBulkRules={handleUpdateBulkRules}
            onSelectSpatialAsset={(mId, rId, gId) => { setSelectedMissionId(mId); setActiveRuleId(rId || null); setFocusedGeoId(gId || null); }}
            darkMode={darkMode}
            onSetActiveRule={id => {
              // Toggle: if clicking the active one, close it
              const nextId = activeRuleId === id ? null : id;
              setActiveRuleId(nextId);
              if (nextId) {
                setFocusedGeoId(rules.find(r => r.id === nextId)?.geometryId || null);
              } else {
                setFocusedGeoId(null);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 font-medium">בחר משימה כדי להתחיל</div>
        )}
      </main>
    </div>
  );
};

export default App;
