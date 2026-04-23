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
    const dialogRef = React.useRef<HTMLDialogElement>(null);

    React.useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    if (!isOpen) return null;
    return (
        <dialog
            ref={dialogRef}
            onClose={onCancel}
            className="m-auto p-0 bg-transparent outline-none backdrop:bg-slate-900/60 backdrop:backdrop-blur-[2px] animate-fadeIn"
        >
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full min-w-[280px] max-w-sm border border-gray-100 dark:border-slate-800 animate-slideUp">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${iconColorClass}`}>
                        {icon || (
                            <img src="/icons/delete_forever.png" className="w-6 h-6" alt="confirm" />
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
        </dialog>
    );
};

export default ConfirmModal;
