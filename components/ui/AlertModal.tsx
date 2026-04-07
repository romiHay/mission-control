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
    // If the modal isn't supposed to be open, we render absolutely nothing
    if (!isOpen) return null;

    return (
        // OVERLAY: The dark, blurred background that covers the whole screen
        // z-[5000] ensures it sits on top of everything else
        <div className="absolute inset-0 z-[5000] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-fadeIn">
            
            {/* MODAL CONTAINER: The actual white/dark box in the center */}
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 w-full max-w-sm border border-gray-100 dark:border-slate-800 animate-slideUp">
                <div className="flex flex-col items-center text-center space-y-4">
                    
                    {/* ICON SECTION: Displays the provided icon or a default "Warning/Info" icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconColorClass}`}>
                        {icon || (
                            // Default SVG icon (Exclamation mark style)
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
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
                            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
