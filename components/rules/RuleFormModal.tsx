import React from 'react';

interface RuleFormModalProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
    maxWidth?: string;
    darkMode?: boolean;
}

const RuleFormModal: React.FC<RuleFormModalProps> = ({
    title,
    subtitle,
    onClose,
    children,
    footer,
    maxWidth = "max-w-5xl",
    darkMode
}) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10 animate-fadeIn" dir="rtl">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className={`relative w-full ${maxWidth} max-h-[90vh] bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 animate-slideUp font-heebo`}>

                <header className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300">
                    <div className="flex flex-col">
                        {subtitle && (
                            <label className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">
                                {subtitle}
                            </label>
                        )}
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white leading-none">
                            {title}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90 text-gray-400 group">
                        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {children}
                </div>

                <footer className="p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex gap-4 shrink-0 transition-colors duration-300">
                    {footer}
                </footer>
            </div>
        </div>
    );
};

export default RuleFormModal;
