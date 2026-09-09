import React, { useState } from 'react';
import {
    Calendar as CalendarIcon, Clock, Sparkles, CheckCircle2,
    Briefcase, FileText, ShieldCheck, Heart, Gift, Award, Info,
    ChevronRight, BookOpen, AlertCircle
} from 'lucide-react';

const STANDARD_HOLIDAYS = [
    { sn: 1, name: "New Year's Day", date: "01.01.2026", isoDate: "2026-01-01", day: "Thursday", type: "Standard Mandatory" },
    { sn: 2, name: "Republic Day", date: "26.01.2026", isoDate: "2026-01-26", day: "Monday", type: "Standard Mandatory" },
    { sn: 3, name: "Holi", date: "03.03.2026", isoDate: "2026-03-03", day: "Tuesday", type: "Standard Mandatory" },
    { sn: 4, name: "Maharashtra Day / International Labour Day", date: "01.05.2026", isoDate: "2026-05-01", day: "Friday", type: "Standard Mandatory" },
    { sn: 5, name: "Independence Day", date: "15.08.2026", isoDate: "2026-08-15", day: "Saturday", type: "Standard Mandatory" },
    { sn: 6, name: "Ganesh Chaturthi", date: "14.09.2026", isoDate: "2026-09-14", day: "Monday", type: "Standard Mandatory" },
    { sn: 7, name: "Gandhi Jayanti", date: "02.10.2026", isoDate: "2026-10-02", day: "Friday", type: "Standard Mandatory" },
    { sn: 8, name: "Dussehra", date: "20.10.2026", isoDate: "2026-10-20", day: "Tuesday", type: "Standard Mandatory" }
];

const OPTIONAL_HOLIDAYS = [
    { sn: 1, name: "Makar Sankranti / Uttarayan", date: "14.01.2026", day: "Wednesday" },
    { sn: 2, name: "Pongal", date: "15.01.2026", day: "Thursday" },
    { sn: 3, name: "Shivaji Jayanti", date: "19.02.2026", day: "Thursday" },
    { sn: 4, name: "Gudi Padwa / Ugadi", date: "19.03.2026", day: "Thursday" },
    { sn: 5, name: "Ramzan Id / Eid-ul-Fitr", date: "21.03.2026", day: "Saturday" },
    { sn: 6, name: "Rama Navami", date: "26.03.2026", day: "Thursday" },
    { sn: 7, name: "Mahavir Jayanti", date: "31.03.2026", day: "Tuesday" },
    { sn: 8, name: "Good Friday", date: "03.04.2026", day: "Friday" },
    { sn: 9, name: "Vaishaki / Ambedkar Jayanti", date: "14.04.2026", day: "Tuesday" },
    { sn: 10, name: "Bakri Eid", date: "27.05.2026", day: "Wednesday" },
    { sn: 11, name: "Onam / Milad un-Nabi", date: "26.08.2026", day: "Wednesday" },
    { sn: 12, name: "Raksha Bandhan (Rakhi)", date: "28.08.2026", day: "Friday" },
    { sn: 13, name: "Janmashtami", date: "04.09.2026", day: "Friday" },
    { sn: 14, name: "Diwali - Gowardhan Puja", date: "09.11.2026", day: "Monday" },
    { sn: 15, name: "Diwali – Bali Pratipada", date: "10.11.2026", day: "Tuesday" },
    { sn: 16, name: "Guru Nanak Jayanti", date: "24.11.2026", day: "Tuesday" },
    { sn: 17, name: "Christmas", date: "25.12.2026", day: "Friday" },
    { sn: 18, name: "Employee Birthday", date: "Self Date", day: "As Applicable", isSpecial: true },
    { sn: 19, name: "Wedding Anniversary", date: "Self Date", day: "As Applicable", isSpecial: true }
];

const LEAVE_CLAUSES = [
    {
        title: "4. Earned Leave (EL / PL)",
        desc: "Earned Leave is administered in accordance with applicable law and employee eligibility. Unused Earned Leave may be carried forward and accumulated subject to statutory limits. Intended for planned vacation, travel, and personal leave."
    },
    {
        title: "5. Sick Leave (SL)",
        desc: "Administered for health recovery. Employees should inform their manager and HR as soon as reasonably possible when absent due to sickness."
    },
    {
        title: "6. Casual Leave (CL)",
        desc: "Intended for short-duration personal requirements and should normally be requested in advance through the employee portal."
    },
    {
        title: "7. Leave Application & Prior Approval",
        desc: "Planned leave must be applied through the designated HR portal and approved before leave begins. Optional holidays must be requested at least 1 week prior."
    },
    {
        title: "8. Weekly Holiday & Working Hours",
        desc: "Standard office timings are 10:00 AM – 07:00 PM IST. Weekly off is provided in accordance with the company schedule."
    },
    {
        title: "9. Leave Without Pay (LOP) & 10. Comp-Off",
        desc: "Leave beyond eligible quota is treated as LOP upon approval. Authorized work on non-working days entitles compensatory time off."
    }
];

const HolidayCalendarPage = () => {
    const [activeTab, setActiveTab] = useState('standard'); // 'standard' | 'optional' | 'policy'

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Policy Title Banner */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                Official Company Policy 2026
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">Effective: 01 Jan 2026</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                            Stackvil Technologies Private Limited
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Employee Holiday & Leave Policy — Policy Owner: Human Resources / Management
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-left">
                            <span className="text-[9px] uppercase font-bold text-emerald-600 block">Standard Holidays</span>
                            <span className="text-sm font-black text-emerald-800">8 Paid Days</span>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-left">
                            <span className="text-[9px] uppercase font-bold text-purple-600 block">Optional Holidays</span>
                            <span className="text-sm font-black text-purple-800">Choose 2 Days</span>
                        </div>
                    </div>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab('standard')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'standard'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        Standard Holidays (8 Days)
                    </button>
                    <button
                        onClick={() => setActiveTab('optional')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'optional'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        Optional Holidays (Choose 2 of 19)
                    </button>
                    <button
                        onClick={() => setActiveTab('policy')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'policy'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        Full Leave Policy & Rules
                    </button>
                </div>
            </div>

            {/* TAB 1: 8 STANDARD (MANDATORY) HOLIDAYS */}
            {activeTab === 'standard' && (
                <div className="space-y-4">
                    <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <p>
                            <strong>Standard Holidays (Mandatory):</strong> These eight official holidays are auto-assigned as paid non-working days in the attendance and payroll system.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {STANDARD_HOLIDAYS.map(h => (
                            <div key={h.sn} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 hover:border-indigo-300 transition-all flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                            #{h.sn}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-indigo-600">{h.day}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 leading-snug">{h.name}</h3>
                                </div>
                                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                    <span className="font-mono font-black text-gray-800">{h.date}</span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        Auto-Assigned
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: 19 OPTIONAL HOLIDAYS (CHOOSE 2) */}
            {activeTab === 'optional' && (
                <div className="space-y-4">
                    <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
                        <Gift className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <p>
                            <strong>Optional Holidays:</strong> Drawn from national, state, and cultural festivals. Employee Birthday & Wedding Anniversary are also included. Each employee can select <strong>Two Optional Holidays</strong> per calendar year. Apply at least 1 week in advance.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {OPTIONAL_HOLIDAYS.map(h => (
                            <div key={h.sn} className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between gap-3 hover:border-purple-300 transition-all">
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono font-bold text-gray-400">#{h.sn}</span>
                                        <h4 className="text-xs font-bold text-gray-900 truncate">{h.name}</h4>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono">{h.day}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg ${
                                        h.isSpecial ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {h.date}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: FULL LEAVE POLICY & RULES */}
            {activeTab === 'policy' && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <span>Leave Policy Guidelines & Statutory Entitlements</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {LEAVE_CLAUSES.map((clause, idx) => (
                            <div key={idx} className="p-4 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-1.5">
                                <h3 className="text-xs font-bold text-gray-900">{clause.title}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">{clause.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-100 rounded-xl text-xs text-gray-600 space-y-1">
                        <p className="font-bold text-gray-800">15. Non-Compliance Notice:</p>
                        <p>Unauthorized absence, repeated failure to follow leave procedures, or falsification of records may result in disciplinary action and Loss of Pay (LOP).</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidayCalendarPage;
