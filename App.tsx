
import React, { useState, useEffect, useCallback } from 'react';
import { Mission, Rule, MissionGeometry, User } from './types';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 1. INITIAL STARTUP: Fetch missions list AND the first mission's rules immediately
  useEffect(() => {
    const boot = async () => {
      try {
        const [missionsList, userProfile] = await Promise.all([
          api.fetchMissions(),
          api.fetchMe()
        ]);
        setMissions(missionsList);
        setCurrentUser(userProfile);

        if (missionsList.length > 0 && !selectedMissionId) {
          const firstId = missionsList[0].id;
          setSelectedMissionId(firstId);

          // EAGER FETCH: Pull first mission data immediately in the same cycle
          const [g, r] = await Promise.all([
            api.fetchGeometries(firstId),
            api.fetchRules(firstId)
          ]);
          setGeometries(g);
          setRules(r);
        }
      } catch (err) {
        console.error('Startup Error:', err);
      }
    };
    boot();
  }, []);

  // 2. Specialized fetch for mission-specific content (used for switches and polling)
  const fetchData = useCallback(async () => {
    if (!selectedMissionId) return;
    try {
      const [g, r] = await Promise.all([
        api.fetchGeometries(selectedMissionId),
        api.fetchRules(selectedMissionId)
      ]);
      setGeometries(g);
      setRules(r);
    } catch (err) {
      console.error('Mission Data Fetch Error:', err);
    }
  }, [selectedMissionId]);

  // 3. Polling Logic: Runs immediately on mission change and resets the 1-minute timer
  useEffect(() => {
    if (selectedMissionId) {
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedMissionId, fetchData]);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const selectedMission = missions.find(m => m.id === selectedMissionId) || null;

  const handleAddRule = async (newRule: Rule, newGeo?: MissionGeometry | MissionGeometry[]) => {
    await api.addRule(newRule, newGeo);
    await fetchData();
  };

  const handleUpdateRule = async (updatedRule: Rule, newGeo?: MissionGeometry | MissionGeometry[]) => {
    await api.updateRule(updatedRule, newGeo);
    await fetchData();
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

  const handleDeleteGeometry = async (geoId: string) => {
    try {
      await api.deleteGeometry(geoId);
      await fetchData();
      if (focusedGeoId === geoId) setFocusedGeoId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGeometries = async (geoIds: string[]) => {
    try {
      await api.deleteGeometries(geoIds);
      await fetchData();
      if (focusedGeoId && geoIds.includes(focusedGeoId)) setFocusedGeoId(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleAddBulkRules = async (items: { rule: Rule, newGeo?: MissionGeometry }[]) => {
    try {
      const payload = items.map(item => ({ rule: item.rule, newGeos: item.newGeo ? [item.newGeo] : [] }));
      await api.addBulkRules(payload as any);
      await fetchData();
    } catch (err) {
      console.error('Add bulk error:', err);
    }
  };

  const handleUpdateBulkRules = async (items: { rule: Rule, newGeo?: MissionGeometry }[]) => {
    try {
      const payload = items.map(item => ({ rule: item.rule, newGeos: item.newGeo ? [item.newGeo] : [] }));
      await api.updateBulkRules(payload as any);
      await fetchData();
    } catch (err) {
      console.error('Update bulk error:', err);
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
        onRefresh={fetchData}
      />
      <main className="flex-1 overflow-hidden">
        {missions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
              <img src="/icons/no_permissions.png" className="w-12 h-12 group-hover:rotate-90 transition-transform duration-300" alt="No access" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">אין משימות זמינות</h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-md leading-relaxed">
              המשתמש שלך לא משויך לאף משימה פעילה עבור הצוותים שלך ({currentUser?.teams.map(t => t.name).join(', ') || 'ללא צוות'}).
            </p>
          </div>
        ) : selectedMission ? (
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
            onDeleteGeometry={handleDeleteGeometry}
            onDeleteGeometries={handleDeleteGeometries}
            onSelectSpatialAsset={(mId, rId, gId) => { setSelectedMissionId(mId); setActiveRuleId(rId || null); setFocusedGeoId(gId || null); }}
            darkMode={darkMode}
            userTeams={currentUser?.teams || []}
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
          <div className="flex items-center justify-center h-full text-gray-400 font-medium animate-pulse">בחר משימה מתוך המשימות כדי להתחיל</div>
        )}
      </main>
    </div>
  );
};

export default App;
