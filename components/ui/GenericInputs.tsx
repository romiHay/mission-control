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
export const GenericMultiSelect: React.FC<{
    values: string[];
    onChange: (vals: string[]) => void;
    options: { label: string; value: string }[];
    placeholder: string;
    required?: boolean;
}> = ({ values, onChange, options, placeholder, required = false }) => {
    const toggleOption = (val: string) => {
        if (values.includes(val)) {
            onChange(values.filter(v => v !== val));
        } else {
            onChange([...values, val]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl min-h-[3.25rem]">
                {values.length === 0 ? (
                    <span className="text-gray-500 dark:text-slate-500 text-sm py-1 pr-1">{placeholder}</span>
                ) : (
                    values.map(val => {
                        const opt = options.find(o => o.value === val);
                        return (
                            <span key={val} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                                {opt?.label || val}
                                <button onClick={() => toggleOption(val)} className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        );
                    })
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {options.map(opt => {
                    const isSelected = values.includes(opt.value);
                    return (
                        <button
                            key={opt.value}
                            onClick={() => toggleOption(opt.value)}
                            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-800'
                                }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
