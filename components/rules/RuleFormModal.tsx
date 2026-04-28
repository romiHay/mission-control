import React from 'react';

/**
 * Props for the RuleFormModal wrapper.
 * @property {string} title - The main title at the top of the modal.
 * @property {string} [subtitle] - Optional sub-text above the main title.
 * @property {function} onClose - Closes the modal.
 * @property {ReactNode} children - Form content injected dynamically.
 * @property {ReactNode} footer - Action buttons at the bottom of the modal.
 * @property {string} [maxWidth] - Adjusts the max-width tailwind class.
 */
interface RuleFormModalProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
    maxWidth?: string;
    darkMode?: boolean;
}

/**
 * @component RuleFormModal
 * @description A generic UI shell (Wrapper Pattern) that provides consistent modal styling, 
 * the dark background overlay, animations, and the scrollable form area.
 */
const RuleFormModal: React.FC<RuleFormModalProps> = ({
    title,
    subtitle,
    onClose,
    children, // Using children lets us put any JSX inside <RuleFormModal> ... </RuleFormModal>
    footer,
    maxWidth = "max-w-5xl",
    darkMode
}) => {
    const dialogRef = React.useRef<HTMLDialogElement>(null);

    React.useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    }, []);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className="fixed inset-0 w-full h-full m-0 p-0 bg-transparent border-none flex items-center justify-center outline-none backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm animate-fadeIn"
            dir="rtl"
        >
            {/* MODAL CONTAINER: Using w-[82vw] h-[82vh] for balanced gaps */}
            <div className={`relative w-[78vw] h-[84vh] ${maxWidth} bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 animate-slideUp font-heebo`}>

                {/* 1. HEADER SECTION: Sticky top section containing title and X button */}
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
                    {/* Close ('X') button */}
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90 text-gray-400 group">
                        <img src="/icons/close.png" className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" alt="close" />
                    </button>
                </header>

                {/* 2. MAIN CONTENT SECTION: Here we render whatever form components you put inside the Wrapper */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {children}
                </div>

                {/* 3. FOOTER SECTION: Here we render any buttons passed to the 'footer' prop */}
                <footer className="p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex gap-4 shrink-0 transition-colors duration-300">
                    {footer}
                </footer>
            </div>
        </dialog>
    );
};

export default RuleFormModal;
