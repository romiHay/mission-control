
import React from 'react';
import { MissionGeometry, GeometryType } from '../../types';
import GeometryMiniMap from '../maps/GeometryMiniMap';

interface SpatialAttachmentSectionProps {
    geoSource: 'existing' | 'new' | 'none';
    onSourceChange: (source: 'existing' | 'new' | 'none') => void;
    geometryId: string;
    setGeometryId: (id: string) => void;
    availableGeometries: MissionGeometry[];
    initialDataId?: string;
    isDrawingInline: boolean;
    setIsDrawingInline: (val: boolean) => void;
    isEditingInline: boolean;
    onToggleEdit: () => void;
    onCancelEditing: () => void;
    tempGeometryType?: GeometryType;
    tempGeometryCoords?: any;
    isNewGeometryCaptured: boolean;
    onStartDrawing: (type: GeometryType) => void;
    onEditExisting: (coords: any) => void;
    onClearTempGeometry: () => void;
    onGeometryCaptured: (type: GeometryType, coords: any) => void;
    handleTypeChangeRequest: (type: GeometryType) => void;
    darkMode: boolean;
}

const SpatialAttachmentSection: React.FC<SpatialAttachmentSectionProps> = ({
    geoSource,
    onSourceChange,
    geometryId,
    setGeometryId,
    availableGeometries,
    initialDataId,
    isDrawingInline,
    setIsDrawingInline,
    isEditingInline,
    onToggleEdit,
    onCancelEditing,
    tempGeometryType,
    tempGeometryCoords,
    isNewGeometryCaptured,
    onStartDrawing,
    onEditExisting,
    onClearTempGeometry,
    onGeometryCaptured,
    handleTypeChangeRequest,
    darkMode
}) => {
    const selectedExistingGeo = availableGeometries.find(g => g.id === geometryId);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-[0.2em]">שיוך מרחבי</label>
                {(isDrawingInline || isEditingInline) && (
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        {isDrawingInline ? 'שרטוט חי' : 'עריכה פעילה'}
                    </span>
                )}
            </div>

            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                {(['none', 'existing', 'new'] as const).map(source => {
                    const labelMap = { 'none': 'ללא', 'existing': 'קיים', 'new': 'חדש' };
                    return (
                        <button
                            key={source}
                            type="button"
                            onClick={() => onSourceChange(source)}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${geoSource === source ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}
                        >
                            {labelMap[source]}
                        </button>
                    );
                })}
            </div>

            {geoSource === 'existing' && (
                <div className="space-y-3 font-heebo">
                    <select
                        value={geometryId}
                        onChange={e => setGeometryId(e.target.value)}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right ${!geometryId ? 'text-gray-500 dark:text-slate-500' : ''}`}
                    >
                        <option value="" disabled hidden>בחר גיאוגרפיה קיימת</option>
                        {availableGeometries.map(geo => (
                            <option key={geo.id} value={geo.id} disabled={!!geo.ruleId && geo.ruleId !== initialDataId} className="text-right">
                                {geo.name} {geo.ruleId && geo.ruleId !== initialDataId ? '(משויך)' : ''}
                            </option>
                        ))}
                    </select>

                    <GeometryMiniMap
                        type={selectedExistingGeo?.type || 'Point'}
                        coordinates={selectedExistingGeo?.coordinates}
                        onGeometryCaptured={() => { }}
                        isDrawing={false}
                        onCancelDrawing={() => { }}
                        darkMode={darkMode}
                    />

                    {selectedExistingGeo?.type === 'Polygon' && (
                        <button
                            type="button"
                            onClick={() => onEditExisting(selectedExistingGeo.coordinates)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 rounded-xl hover:bg-indigo-100 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            ערוך פוליגון
                        </button>
                    )}
                </div>
            )}

            {geoSource === 'new' && (
                <div className="space-y-4">
                    {(isNewGeometryCaptured || isDrawingInline) ? (
                        <div className="space-y-3">
                            <GeometryMiniMap
                                type={tempGeometryType || 'Point'}
                                coordinates={tempGeometryCoords}
                                onGeometryCaptured={(coords) => {
                                    onGeometryCaptured(tempGeometryType || 'Point', coords);
                                    if (isDrawingInline) setIsDrawingInline(false);
                                }}
                                isDrawing={isDrawingInline}
                                isEditing={isEditingInline}
                                onCancelDrawing={() => {
                                    onCancelEditing();
                                }}
                                darkMode={darkMode}
                            />

                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isEditingInline) {
                                                onCancelEditing();
                                            } else {
                                                setIsDrawingInline(!isDrawingInline);
                                            }
                                        }}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${isDrawingInline ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100'}`}
                                    >
                                        {isDrawingInline ? 'עצור שרטוט' : (isNewGeometryCaptured ? 'שרטט מחדש' : 'התחל שרטוט')}
                                    </button>

                                    {isNewGeometryCaptured && tempGeometryType === 'Polygon' && (
                                        <button
                                            type="button"
                                            onClick={onToggleEdit}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${isEditingInline ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100'}`}
                                        >
                                            {isEditingInline ? 'סיים עריכה' : 'עריכת נקודות'}
                                        </button>
                                    )}
                                </div>

                                {isEditingInline && (
                                    <button
                                        type="button"
                                        onClick={onCancelEditing}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-xl hover:bg-red-100 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        ביטול שינויים
                                    </button>
                                )}

                                {!isDrawingInline && !isEditingInline && (
                                    <button
                                        type="button"
                                        onClick={() => handleTypeChangeRequest(tempGeometryType === 'Point' ? 'Polygon' : 'Point')}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        החלף ל{tempGeometryType === 'Point' ? 'פוליגון' : 'נקודה'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    onStartDrawing('Point');
                                    setIsDrawingInline(true);
                                }}
                                className="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-400 hover:text-indigo-600 group"
                            >
                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">שרטט נקודה</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onStartDrawing('Polygon');
                                    setIsDrawingInline(true);
                                }}
                                className="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-gray-400 hover:text-indigo-600 group"
                            >
                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">שרטט פוליגון</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpatialAttachmentSection;
