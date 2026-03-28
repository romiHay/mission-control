
export const PARAM_LABELS: Record<string, string> = {
    // QA Mission fields
    code_name: 'שם קוד',
    frequency: 'תדירות',
    code_type: 'סוג קוד',
    checks_amount: 'כמות בדיקות',
    check_precent: 'אחוז בדיקה',

    // New Missions fields
    nm_values: 'ערכי NM',
    status: 'סטטוס',
    type: 'סוג',
    mpt_values: 'ערכי MPT',
    h_values: 'ערכי H',
    nm_id: 'מזהה NM'
};

export const PARAM_OPTIONS: Record<string, string[]> = {
    frequency: ['יומי', 'שבועי', 'שעתי', 'חודשי'],
    status: ['פעיל', 'ממתין', 'הושלם', 'מבוטל'],
    code_type: ['VISUAL', 'SENSOR', 'MANUAL']
};
