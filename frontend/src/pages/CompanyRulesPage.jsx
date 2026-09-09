import React, { useState } from 'react';
import {
    ShieldCheck, Clock, Laptop, Lock, AlertTriangle, CheckCircle2,
    Briefcase, FileText, UserCheck, Smartphone, EyeOff, BookOpen
} from 'lucide-react';

const RULES_DATA = [
    {
        category: 'Working Hours & Attendance Policy',
        icon: Clock,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        rules: [
            {
                title: 'Official Working Schedule: 10:00 AM – 07:00 PM IST',
                desc: 'Standard office hours for Stackvil Technologies are 10:00 AM to 07:00 PM IST. Employees must clock-in on time through the workforce portal.'
            },
            {
                title: 'Mandatory 3-Hour Worksheet Updates',
                desc: 'All active employees must submit structured 3-hour worksheet progress updates with valid proof attachments (screenshots, repository commits, test artifacts, or spreadsheets).'
            },
            {
                title: 'After-Hours Access Policy (Past 7:00 PM)',
                desc: 'Working past 07:00 PM requires submitting a formal login permission request through the portal for Admin approval.'
            }
        ]
    },
    {
        category: 'IT Security, Device & Wi-Fi Protocols',
        icon: ShieldCheck,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rules: [
            {
                title: 'Authorized Single-Device Enforcement',
                desc: 'Employees are restricted to a single active login session at any time. Simultaneous logins from other devices will automatically terminate existing sessions.'
            },
            {
                title: 'Office Network Compliance',
                desc: 'When office Wi-Fi restriction is enabled by Admin, employee logins are restricted exclusively to authorized company network gateways.'
            },
            {
                title: 'Source Code & Client Data Confidentiality',
                desc: 'All proprietary software, repositories, API keys, client documents, and database records are strictly confidential. Unauthorized copying or external transfer is forbidden.'
            }
        ]
    },
    {
        category: 'Leave & Holiday Entitlements 2026',
        icon: Briefcase,
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        rules: [
            {
                title: '8 Standard Paid Holidays',
                desc: 'Auto-assigned in attendance: New Year’s Day, Republic Day, Holi, Maharashtra Day/Labour Day, Independence Day, Ganesh Chaturthi, Gandhi Jayanti, and Dussehra.'
            },
            {
                title: '2 Optional Holidays Quota',
                desc: 'Employees can choose 2 optional holidays per calendar year from the approved list of 19 regional festivals, employee birthday, or wedding anniversary (apply 1 week prior).'
            },
            {
                title: 'Planned Leave Prior Notice (EL/PL & CL)',
                desc: 'Planned leaves must be submitted via the portal at least 48 hours in advance for managerial review and approval.'
            }
        ]
    },
    {
        category: 'Workplace Code of Conduct',
        icon: UserCheck,
        color: 'text-purple-600 bg-purple-50 border-purple-100',
        rules: [
            {
                title: 'Professional Collaboration & Integrity',
                desc: 'Maintain mutual respect, timely communication on Slack/teams, and professional engineering ethics.'
            },
            {
                title: 'Issue & Blocker Escalation',
                desc: 'Any technical dependencies, hardware blockers, or grievances should be documented promptly in 3-hour worksheet logs or escalated to Administration.'
            }
        ]
    }
];

const CompanyRulesPage = () => {
    const [activeCategory, setActiveCategory] = useState('all');

    const filteredSections = activeCategory === 'all'
        ? RULES_DATA
        : RULES_DATA.filter(s => s.category === activeCategory);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <span>Company Rules, Regulations & Guidelines</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Official workplace guidelines, 10:00 AM – 7:00 PM shift schedule, IT security protocols, and employee code of conduct.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                        Shift: 10:00 AM - 07:00 PM IST
                    </span>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeCategory === 'all'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    All Sections
                </button>
                {RULES_DATA.map(s => (
                    <button
                        key={s.category}
                        onClick={() => setActiveCategory(s.category)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            activeCategory === s.category
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        {s.category}
                    </button>
                ))}
            </div>

            {/* Rules Content Sections */}
            <div className="space-y-6">
                {filteredSections.map((section, idx) => {
                    const Icon = section.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <div className={`p-2.5 rounded-xl border ${section.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">{section.category}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                                {section.rules.map((rule, rIdx) => (
                                    <div key={rIdx} className="p-4 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                            <h3 className="text-xs font-bold text-gray-900">{rule.title}</h3>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed pl-6">
                                            {rule.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Compliance Notice */}
            <div className="bg-gray-100 p-4 rounded-xl text-center text-xs text-gray-600 font-medium border border-gray-200">
                Stackvil Technologies Private Limited • Policy Owner: Human Resources & Management
            </div>
        </div>
    );
};

export default CompanyRulesPage;
