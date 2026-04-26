import React from 'react';

// ============================================================================
// COMPONENT PROPERTIES (PROPS)
// ============================================================================
// Here we define the types for all the properties this component can receive.
// If you want to add a new feature (like a second button), you must add its type here first.
export interface AlertModalProps {
    isOpen: boolean;               // Controls whether the modal is visible or hidden
    title: string;                 // The main big text of the modal
    description?: React.ReactNode; // Optional smaller text underneath the title
    buttonText?: string;           // Optional custom text for the button (defaults to 'הבנתי')
    icon?: React.ReactNode;        // Optional custom icon (SVG or image)
    iconColorClass?: string;       // Optional classes to color the icon box
    onClose: () => void;           // The function that runs when the button is clicked to close it
}

// ============================================================================
// ALERT MODAL COMPONENT
// ============================================================================
// A generic, reusable Modal component for displaying styled alerts to the user.
// You can use this anywhere in the app just by passing different text/colors!
const AlertModal: React.FC<AlertModalProps> = ({
    // Destructuring our props and assigning default values if none are provided
    isOpen,
    title,
    description,
    buttonText = 'הבנתי', // Default text if the developer doesn't provide any
    iconColorClass = 'text-red-500 bg-red-50 dark:bg-red-900/20', // Default matches an "error" or "warning" style
    icon,
    onClose
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

    // If the modal isn't supposed to be open, we render absolutely nothing
    if (!isOpen) return null;

    return (
        // OVERLAY: The dark, blurred background that covers the whole screen
        // z-[5000] ensures it sits on top of everything else
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className="fixed inset-0 w-full h-full m-0 p-0 bg-transparent border-none flex items-center justify-center outline-none backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm animate-fadeIn"
        >

            {/* MODAL CONTAINER: The actual white/dark box in the center */}
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-[90vw] max-w-sm border border-gray-100 dark:border-slate-800 animate-slideUp">
                <div className="flex flex-col items-center text-center space-y-4">

                    {/* ICON SECTION: Displays the provided icon or a default "Warning/Info" icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconColorClass}`}>
                        {icon || (
                            <img src="/icons/warning.png" className="w-8 h-8" alt="warning" />
                        )}
                    </div>

                    {/* TEXT SECTION: Title and Description */}
                    <div className="w-full">
                        <h4 className="text-base font-black text-gray-800 dark:text-white uppercase tracking-tight mb-3">
                            {title}
                        </h4>

                        {/* Only render description if it was requested */}
                        {description && (
                            <div className="text-sm font-medium leading-relaxed">
                                {description}
                            </div>
                        )}
                    </div>

                    {/* ACTION SECTION: The close/confirm button */}
                    <div className="w-full pt-1">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
};

export default AlertModal;
