import React from 'react';

export const GenericInput: React.FC<{
    value?: any;
    defaultValue?: any;
    onChange?: (val: any) => void;
    onBlur?: (e: any) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    min?: number;
    max?: number;
}> = ({ value, defaultValue, onChange, onBlur, placeholder, type = "text", required = false, min, max }) => {
    // Local state for blazing fast uncontrolled typing
    const [localVal, setLocalVal] = React.useState(() => (value !== undefined && value !== null) ? value : (defaultValue ?? ''));

    React.useEffect(() => {
        if (value !== undefined && value !== null) {
            setLocalVal(value);
        }
    }, [value]);

    return (
        <input
            required={required}
            type={type}
            value={(localVal !== undefined && localVal !== null) ? localVal : ''}
            min={min}
            max={max}
            onChange={e => {
                let val: any = e.target.value;
                if (type === 'number' && val !== '') {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                        val = parsed;
                        if (min !== undefined && val < min) val = min;
                        if (max !== undefined && val > max) val = max;
                    }
                }
                setLocalVal(val);
                if (onChange) onChange(val);
            }}
            onBlur={e => {
                if (onBlur) onBlur(e);
            }}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-slate-500 text-right selection:bg-indigo-100 dark:selection:bg-indigo-900/40 font-heebo"
            placeholder={placeholder}
            spellCheck={false}
        />
    );
};

export const GenericSelect: React.FC<{
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder: string;
    required?: boolean;
}> = ({ value, onChange, options, placeholder, required = false }) => (
    <select
        required={required}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right font-heebo ${!value ? 'text-gray-500 dark:text-slate-500' : ''}`}
    >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map(opt => (
            <option key={opt} value={opt} className="text-gray-900 dark:text-white">{opt}</option>
        ))}
    </select>
);
