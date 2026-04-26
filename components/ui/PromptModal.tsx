import React, { useState } from 'react';

export interface PromptModalProps {
    isOpen: boolean;
    title: string;
    label: string;
    placeholder?: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    icon?: React.ReactNode;
    iconColorClass?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({
    isOpen, title, label, placeholder, initialValue = '',
    confirmText = 'שמור', cancelText = 'ביטול',
    iconColorClass = 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
    icon, onConfirm, onCancel
}) => {
    const [value, setValue] = useState(initialValue);
    const dialogRef = React.useRef<HTMLDialogElement>(null);

    React.useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    // Update internal state when opened if needed, though we can just rely on standard unmount mapping
    React.useEffect(() => {
        if (isOpen) setValue(initialValue);
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            onClose={onCancel}
            className="fixed inset-0 w-full h-full m-0 p-0 bg-transparent border-none flex items-center justify-center outline-none backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm animate-fadeIn"
        >
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-[90vw] max-w-sm border border-gray-100 dark:border-slate-800 animate-slideUp">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconColorClass}`}>
                        {icon || (
                            <img src="/icons/edit.png" className="w-8 h-8  flex items-center justify-center opacity-40 group-hover:opacity-100 dark:invert transition-opacity" alt="prompt" />
                        )}
                    </div>
                    <div className="w-full">
                        <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight mb-3">{title}</h4>
                        <div className="w-full text-right mt-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-white mb-2 block">{label}</label>
                            <input
                                type="text"
                                autoFocus
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder={placeholder}
                                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-sm font-medium outline-none focus:border-indigo-500 transition-colors dark:text-white"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onConfirm(value);
                                    if (e.key === 'Escape') onCancel();
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-slate-700"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => onConfirm(value)}
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200 dark:shadow-none"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
};

export default PromptModal;
