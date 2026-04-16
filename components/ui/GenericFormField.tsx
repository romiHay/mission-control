
import React from 'react';

interface GenericFormFieldProps {
    label: string;
    children: React.ReactNode;
    fullWidth?: boolean;
    required?: boolean;
}

const GenericFormField: React.FC<GenericFormFieldProps> = ({ label, children, fullWidth = false, required = false }) => {
    return (
        <div className={fullWidth ? "col-span-full" : ""}>
            <label className="flex items-center gap-1 block text-[10px] font-black text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-[0.2em] w-fit">
                {label}
                {required && (
                    <span title="שדה חובה" className="text-red-500 hover:text-red-600 transition-colors cursor-help flex items-center" aria-label="שדה חובה">
                        <img src="/icons/warning.png" className="w-3.5 h-3.5" />
                        {/* <svg className="w-3.5 h-3.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg> */}
                    </span>
                )}
            </label>
            {children}
        </div>
    );
};

export default GenericFormField;
