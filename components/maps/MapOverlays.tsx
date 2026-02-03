
import React from 'react';

interface MapOverlaysProps {
    drawingMode: boolean;
    onResetMap: () => void;
}

const MapOverlays: React.FC<MapOverlaysProps> = ({ drawingMode, onResetMap }) => {
    if (drawingMode) return null;

    return (
        <>
            <div className="absolute top-[26px] right-[26px] flex flex-col gap-3 z-[1000]">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 flex gap-4 text-xs font-bold transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-green-700 dark:border-green-900"></div>
                        <span className="text-gray-700 dark:text-slate-300">בעל חוק</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-red-700 dark:border-red-900"></div>
                        <span className="text-gray-700 dark:text-slate-300">חסר חוק</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-[26px] left-[26px] flex flex-col z-[1000] shadow-lg rounded-md overflow-hidden border border-gray-100 dark:border-slate-700">
                <button
                    onClick={onResetMap}
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm w-[34px] h-[34px] hover:bg-gray-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center group"
                    title="אפס תצוגת מפה"
                >
                    <svg className="w-4 h-4 text-gray-700 dark:text-slate-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>
            </div>
        </>
    );
};

export default MapOverlays;
