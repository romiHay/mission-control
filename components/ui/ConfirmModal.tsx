import React from 'react';

export interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    icon?: React.ReactNode;
    iconColorClass?: string;
    confirmButtonClass?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen, title, description, confirmText = 'מחק', cancelText = 'ביטול',
    iconColorClass = 'text-red-500 bg-red-50 dark:bg-red-900/20',
    confirmButtonClass = 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
    icon, onConfirm, onCancel
}) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[5000] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full max-w-[280px] border border-gray-100 dark:border-slate-800 animate-slideUp">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${iconColorClass}`}>
                        {icon || (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight">{title}</h4>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed mt-1 px-2">
                            {description}
                        </div>
                    </div>
                    <div className="flex gap-2 w-full pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${confirmButtonClass}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
