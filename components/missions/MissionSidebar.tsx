
import React from 'react';
import { Mission } from '../../types';

interface MissionSidebarProps {
  missions: Mission[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onRefresh?: () => void;
}

const MissionSidebar: React.FC<MissionSidebarProps> = ({ missions, selectedMissionId, onSelectMission, darkMode, onToggleTheme, onRefresh }) => {
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-sm z-10 transition-colors duration-300">
      <div className="p-6 h-[92px] border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <img src="/icons/missions_icon.png" className="w-6 h-6 flex items-center justify-center opacity-40 group-hover:opacity-100 dark:invert transition-opacity" alt="משימות" />
          משימות
        </h1>
        <div className="flex items-center gap-1">
          {/* REFRESH MISSION BUTTON */}
          {/* {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
              aria-label="Refresh Data"
              title="רענון נתונים"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )} */}
          {/* THEME BUTTON */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
            aria-label="Toggle Theme"
          >
            {darkMode ? (
              <img src="/icons/light_mode.png" className="w-5 h-5 flex items-center justify-center opacity-40 group-hover:opacity-100 dark:invert transition-opacity" alt="מצב יום" />
            ) : (
              <img src="/icons/dark_mode.png" className="w-5 h-5 flex items-center justify-center opacity-40 group-hover:opacity-100 dark:invert transition-opacity" alt="מצב לילה" />
            )}
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {/* MISSION LIST */}
        {missions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => onSelectMission(mission.id)}
            className={`w-full text-right px-6 py-3 transition-colors flex items-center gap-3 ${selectedMissionId === mission.id
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-r-4 border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${selectedMissionId === mission.id ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-gray-300 dark:bg-slate-700'}`} />
            <span className="font-medium">{mission.nameHebrew}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default MissionSidebar;
