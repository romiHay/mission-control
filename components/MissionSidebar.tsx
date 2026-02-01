
import React from 'react';
import { Mission } from '../types';

interface MissionSidebarProps {
  missions: Mission[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

const MissionSidebar: React.FC<MissionSidebarProps> = ({ missions, selectedMissionId, onSelectMission, darkMode, onToggleTheme }) => {
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-sm z-10 transition-colors duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          משימות
        </h1>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
          aria-label="Toggle Theme"
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M14.5 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {missions.map((mission) => (
          <button
            key={mission.id}
            onClick={() => onSelectMission(mission.id)}
            className={`w-full text-left px-6 py-3 transition-colors flex items-center gap-3 ${selectedMissionId === mission.id
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
              }`}
          >
            <div className={`w-2 h-2 rounded-full ${selectedMissionId === mission.id ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-gray-300 dark:bg-slate-700'}`} />
            <span className="font-medium">{mission.name}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800">
        <p className="text-xs text-gray-400 dark:text-slate-600 text-center uppercase tracking-widest font-semibold">v1.2.4 Enterprise</p>
      </div>
    </aside>
  );
};

export default MissionSidebar;
