
import React from 'react';
import { Mission, Rule, MissionGeometry } from '../types';

interface MissionStatsViewProps {
  mission: Mission;
  rules: Rule[];
  geometries: MissionGeometry[];
}

const MissionStatsView: React.FC<MissionStatsViewProps> = ({ mission, rules, geometries }) => {
  const linkedCount = geometries.filter(g => !!g.ruleId).length;
  const unlinkedCount = geometries.length - linkedCount;
  const ruleDensity = rules.length > 0 ? (linkedCount / rules.length).toFixed(2) : '0';

  return (
    <div className="p-8 space-y-10 animate-fadeIn max-w-5xl mx-auto">
      {/* Overview Hero Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm transition-colors text-right">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-600 dark:bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/40">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">ביצועי משימה</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">סקירה של כללים מבצעיים ונכסים מרחביים.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-transform hover:-translate-y-1">
            <span className="block text-xs font-bold text-indigo-400 dark:text-indigo-400 uppercase mb-2">סה"כ כללים</span>
            <span className="text-4xl font-black text-indigo-700 dark:text-indigo-300">{rules.length}</span>
            <p className="mt-2 text-[10px] text-indigo-400 dark:text-indigo-500 font-medium">לוגיקה מבצעית פעילה</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm transition-transform hover:-translate-y-1">
            <span className="block text-xs font-bold text-emerald-400 dark:text-emerald-400 uppercase mb-2">קישורים מרחביים</span>
            <span className="text-4xl font-black text-emerald-700 dark:text-emerald-300">{linkedCount}</span>
            <p className="mt-2 text-[10px] text-emerald-400 dark:text-emerald-500 font-medium">מעוגן גיאוגרפית</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm transition-transform hover:-translate-y-1">
            <span className="block text-xs font-bold text-amber-400 dark:text-amber-400 uppercase mb-2">נכסים לא מקושרים</span>
            <span className="text-4xl font-black text-amber-700 dark:text-amber-300">{unlinkedCount}</span>
            <p className="mt-2 text-[10px] text-amber-400 dark:text-amber-500 font-medium">בהמתנה להקצאת כלל</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm transition-transform hover:-translate-y-1">
            <span className="block text-xs font-bold text-rose-400 dark:text-rose-400 uppercase mb-2">צפיפות כללים</span>
            <span className="text-4xl font-black text-rose-700 dark:text-rose-300">{ruleDensity}</span>
            <p className="mt-2 text-[10px] text-rose-400 dark:text-rose-500 font-medium">ממוצע כללים למיקום</p>
          </div>
        </div>
      </section>

      {/* Analysis Metrics */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm transition-colors text-right">
        <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-8">ניתוח תקינות מערכת</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-slate-400 mb-2">
                <span>כיסוי מרחבי</span>
                <span className="text-indigo-600 dark:text-indigo-400">{geometries.length > 0 ? Math.round((linkedCount / geometries.length) * 100) : 0}%</span>
              </div>
              <div className="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                <div
                  className="h-full bg-indigo-500 dark:bg-indigo-500 rounded-full transition-all duration-1000 shadow-lg"
                  style={{ width: `${geometries.length > 0 ? (linkedCount / geometries.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 italic">מדד זה משקף את אחוז הנכסים הגיאוגרפיים הנשלטים כרגע על ידי כלל מבצעי אחד לפחות.</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-slate-400 mb-2">
                <span>איכות תיעוד</span>
                <span className="text-emerald-600 dark:text-emerald-400">{rules.length > 0 ? Math.round((rules.filter(r => r.description.length > 50).length / rules.length) * 100) : 0}%</span>
              </div>
              <div className="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                <div
                  className="h-full bg-emerald-500 dark:bg-emerald-500 rounded-full transition-all duration-1000 shadow-lg"
                  style={{ width: `${rules.length > 0 ? (rules.filter(r => r.description.length > 50).length / rules.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 italic">מודד את יסודיות פרוטוקולי המשימה בהתבסס על עומק התיאור והבהירות.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-center p-8 text-center">
        <div className="max-w-md">
          <p className="text-[10px] text-gray-400 dark:text-slate-600 font-bold uppercase tracking-[0.3em]">תמונת מצב מדדי תפעול • v1.2.4</p>
        </div>
      </div>
    </div>
  );
};

export default MissionStatsView;
