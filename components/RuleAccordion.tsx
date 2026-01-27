
import React from 'react';
import { Rule, MissionGeometry } from '../types';

interface RuleAccordionProps {
  rules: Rule[];
  openRuleId: string | null;
  onToggle: (id: string) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
  geometries: MissionGeometry[];
}

const RuleAccordion: React.FC<RuleAccordionProps> = ({ rules, openRuleId, onToggle, onEdit, onDelete, geometries }) => {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400 dark:text-slate-600">
        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm italic">No rules defined for this mission.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-slate-800">
      {rules.map((rule) => {
        const isOpen = openRuleId === rule.id;
        const linkedGeo = geometries.find(g => g.id === rule.geometryId);

        return (
          <div key={rule.id} className={`transition-all duration-300 ${isOpen ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'bg-white dark:bg-slate-900'}`}>
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => onToggle(rule.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <button 
                  className={`p-1 rounded-md transition-transform duration-300 ${isOpen ? '-rotate-90 text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40' : 'rotate-0 text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(rule.id);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h3 className={`font-semibold transition-colors ${isOpen ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300'}`}>
                    {rule.name}
                  </h3>
                  {linkedGeo && (
                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase">
                      Spatial
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => onEdit(rule)}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all"
                  title="Edit Rule"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={() => onDelete(rule.id)}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all"
                  title="Delete Rule"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="px-14 pb-6 pt-0 animate-slideDown overflow-hidden">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider block mb-1">Description</span>
                    <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-indigo-200 dark:border-indigo-900 pl-3">
                      "{rule.description}"
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider block mb-1">Value / Config</span>
                    <div className="bg-gray-100 dark:bg-slate-800 p-2 rounded text-xs font-mono text-gray-700 dark:text-slate-300">
                      {rule.value}
                    </div>
                  </div>
                  {linkedGeo && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Centered on {linkedGeo.name}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RuleAccordion;
