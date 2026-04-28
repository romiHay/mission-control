import React from 'react';
import { Rule, MissionGeometry, FormFieldDef } from '../../types';

interface RuleAccordionProps {
  rules: Rule[];
  openRuleId: string | null;
  onToggle: (id: string) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
  geometries: MissionGeometry[];
  disabled?: boolean;
  uiSchema?: FormFieldDef[];
}

const RuleAccordion: React.FC<RuleAccordionProps> = ({
  rules,
  openRuleId,
  onToggle,
  onEdit,
  onDelete,
  geometries,
  disabled,
  uiSchema
}) => {
  // If there are no rules, show a friendly empty state message with an icon
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400 dark:text-slate-600">
        <img src="/icons/inventory.png" className="w-11 h-12 flex items-center justify-center opacity-40 group-hover:opacity-100 dark:invert transition-opacity" alt="שמירה" />
        <p className="text-sm italic">לא הוגדרו חוקים למשימה זו.</p>
      </div>
    );
  }

  return (
    <div className={`divide-y divide-gray-100 dark:divide-slate-800 transition-opacity duration-300 ${disabled ? 'opacity-50 pointer-events-none saturate-50' : ''}`}>
      {rules.map((rule) => {
        const isOpen = openRuleId === rule.id;

        const linkedGeos = rule.geometryIds && rule.geometryIds.length > 0
          ? geometries.filter(g => rule.geometryIds!.includes(g.id))
          : (rule.geometryId ? geometries.filter(g => g.id === rule.geometryId) : []);
        const hasGeos = linkedGeos.length > 0;

        return (
          <div key={rule.id} className={`transition-all duration-300 ${isOpen ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'bg-white dark:bg-slate-900'}`}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => onToggle(rule.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <button
                  className={`p-1 rounded-md transition-all duration-300 group ${isOpen ? '-rotate-90 text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40' : 'rotate-0 text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(rule.id);
                  }}
                >
                  <img src="/icons/arrow_left.png" className="w-4 h-4 flex items-center justify-center opacity-40 group-hover:opacity-100 dark:invert transition-opacity" alt="פתיחה" />
                </button>

                {/* Rule Title and Labels */}
                <div>
                  <h3 className={`font-semibold transition-colors ${isOpen ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300'}`}>
                    {rule.name}
                  </h3>
                  {hasGeos && (
                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase">
                      משויך למיקום גיאוגרפי
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Action Buttons (Edit / Delete) */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(rule)}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all group"
                  title="ערוך חוק"
                >
                  <img src="/icons/edit.png" className="w-4 h-4 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity dark:invert dark:brightness-150" alt="עריכה" />
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-800 rounded transition-all group"
                  title="מחק חוק"
                >
                  <img src="/icons/delete.png" className="w-4 h-4 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity dark:invert dark:brightness-150" alt="מחיקה" />
                </button>
              </div>
            </div>

            {/* 2. EXPANDED CONTENT SECTION: Only shown if this rule is open */}
            {isOpen && (
              <div className="px-4 pb-6 pt-0 animate-slideDown overflow-hidden">
                <div className="space-y-4 flex flex-col items-center">

                  {rule.parameters && Object.keys(rule.parameters).length > 0 && (
                    <div className="bg-gray-50/50 dark:bg-slate-800/20 rounded-xl p-4 border border-gray-100 dark:border-slate-800/60 w-full max-w-sm mx-auto text-right mt-2 mb-4">
                      <span className="text-[11px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-wider block mb-3">פרמטרים</span>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        {Object.entries(rule.parameters)
                          .filter(([key]) => {
                            const fieldDef = uiSchema?.find(f => f.key === key);
                            return fieldDef?.type !== 'geometry';
                          })
                          .map(([key, val]) => {
                            const fieldDef = uiSchema?.find(f => f.key === key);
                            const label = fieldDef?.label || key;
                            return (
                              <div key={key} className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{label}</span>
                                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                                  {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {hasGeos && (
                    <div className="w-full max-w-sm mx-auto text-right">
                      <div className="inline-flex items-center justify-start gap-2 text-xs bg-green-50/50 dark:bg-green-900/10 px-3 py-2 rounded-lg text-green-700 dark:text-green-400 font-medium whitespace-normal mt-1 border border-green-100 dark:border-green-800/50 w-full">
                        <img src="/icons/marker-icon.png" className="w-3 h-4 flex-shrink-0" alt="מיקום" />
                        <span>ממוקם על {linkedGeos.map(g => g.name).join(', ')}</span>
                      </div>
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
