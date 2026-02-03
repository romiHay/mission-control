
import React from 'react';

interface GenericFormFieldProps {
    label: string;
    children: React.ReactNode;
    fullWidth?: boolean;
}

const GenericFormField: React.FC<GenericFormFieldProps> = ({ label, children, fullWidth = false }) => {
    return (
        <div className={fullWidth ? "col-span-full" : ""}>
            <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-[0.2em]">
                {label}
            </label>
            {children}
        </div>
    );
};

export default GenericFormField;
