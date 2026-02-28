import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx-js-style/dist/xlsx.bundle.js';
import { Download, CalendarDays } from 'lucide-react';

const MonthlyAttendance = () => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingCell, setUpdatingCell] = useState(null); // tracking `${emp_no}-${day}`

    // Array of years for the dropdown (e.g. current year and 2 previous)
    const years = Array.from(new Array(3), (val, index) => today.getFullYear() - index);

    // Array of months
    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const fetchAttendance = async () => {
        setLoading(true);
        setError(null);
        try {
            const formattedMonth = selectedMonth.toString().padStart(2, '0');
            const dateStr = `${selectedYear}-${formattedMonth}`;

            const response = await api.get('/admin/reports/monthly', {
                params: { date: dateStr }
            });

            setReports(response.data);
            setFilteredReports(response.data);
        } catch (err) {
            console.error('Failed to fetch monthly attendance:', err);
            setError('Failed to load attendance data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [selectedMonth, selectedYear]);

    // Handle Search filtering
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredReports(reports);
            return;
        }
        const lowerQ = searchQuery.toLowerCase();
        const filtered = reports.filter(emp =>
            (emp.full_name && emp.full_name.toLowerCase().includes(lowerQ)) ||
            (emp.name && emp.name.toLowerCase().includes(lowerQ)) ||
            emp.emp_no.toLowerCase().includes(lowerQ)
        );
        setFilteredReports(filtered);
    }, [searchQuery, reports]);

    const handleCellChange = async (emp_no, day, newStatus) => {
        const formattedMonth = selectedMonth.toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        const dateStr = `${selectedYear}-${formattedMonth}-${dayStr}`;
        const cellId = `${emp_no}-${day}`;

        // Optimistic update
        setUpdatingCell(cellId);

        let previousReports = [...reports];

        const updateState = (statusVal) => {
            const updatedReports = reports.map(emp => {
                if (emp.emp_no === emp_no) {
                    const oldStatus = emp.attendance[day];
                    // Recalculate summary loosely (P, A, H)
                    let newSummary = { ...emp.summary };

                    if (oldStatus === 'P') newSummary.present--;
                    if (oldStatus === 'A') newSummary.absent--;
                    if (oldStatus === 'H') newSummary.halfDay--;

                    if (statusVal === 'P') newSummary.present++;
                    if (statusVal === 'A') newSummary.absent++;
                    if (statusVal === 'H') newSummary.halfDay++;

                    return {
                        ...emp,
                        attendance: { ...emp.attendance, [day]: statusVal },
                        summary: newSummary
                    };
                }
                return emp;
            });
            setReports(updatedReports);
        };

        try {
            updateState(newStatus);
            await api.put('/admin/reports/monthly', {
                emp_no,
                date: dateStr,
                status: newStatus
            });
        } catch (err) {
            console.error('Failed to update cell:', err);
            // Revert on failure
            setReports(previousReports);
            alert('Failed to save attendance change. Please try again.');
        } finally {
            setUpdatingCell(null);
        }
    };

    // Calculate number of days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const exportToExcel = () => {
        if (!filteredReports || filteredReports.length === 0) return;

        // Base styling templates
        const headerStyle = {
            font: { bold: true, color: { rgb: "a066ff" } },
            fill: { fgColor: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { auto: 1 } },
                bottom: { style: "thin", color: { auto: 1 } },
                left: { style: "thin", color: { auto: 1 } },
                right: { style: "thin", color: { auto: 1 } }
            }
        };

        const cellStyles = {
            'P': { fill: { fgColor: { rgb: "c6efce" } }, font: { color: { rgb: "006100" } } },
            'A': { fill: { fgColor: { rgb: "ffc7ce" } }, font: { color: { rgb: "9c0006" } } },
            'H': { fill: { fgColor: { rgb: "ffeb9c" } }, font: { color: { rgb: "9c5700" } } },
            'Holiday': { fill: { fgColor: { rgb: "ffffff" } }, font: { color: { rgb: "333333" } } },
            'W': { fill: { fgColor: { rgb: "f3f4f6" } }, font: { color: { rgb: "6b7280" } } },
            'default': { fill: { fgColor: { rgb: "ffffff" } }, font: { color: { rgb: "333333" } } }
        };

        const standardBorder = {
            top: { style: "thin", color: { auto: 1 } },
            bottom: { style: "thin", color: { auto: 1 } },
            left: { style: "thin", color: { auto: 1 } },
            right: { style: "thin", color: { auto: 1 } }
        };

        // Construct 2D array for the worksheet
        // Header Row
        const monthPrefix = months.find(m => m.value === selectedMonth)?.label.substring(0, 3) || 'M';
        const headers = ['Employee Name', ...daysArray.map(day => `${monthPrefix} ${day}`), 'Total Present', 'Total Absent', 'Total Half Day'];

        const wsData = [
            headers.map(h => ({ v: h, t: 's', s: headerStyle }))
        ];

        // Data Rows
        filteredReports.forEach(emp => {
            const rowData = [];

            // Name
            const empName = emp.full_name || emp.name;
            rowData.push({ v: empName, t: 's', s: { font: { bold: true, color: { rgb: "1d4ed8" } }, border: standardBorder } });

            // Days
            daysArray.forEach(day => {
                const status = emp.attendance[day];
                const displayVal = status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status === 'H' ? 'Half day' : status !== 'N/A' ? status : '';

                const styleObj = cellStyles[status] || cellStyles['default'];
                rowData.push({
                    v: displayVal,
                    t: 's',
                    s: {
                        fill: styleObj.fill,
                        font: styleObj.font,
                        alignment: { horizontal: "center", vertical: "center" },
                        border: standardBorder
                    }
                });
            });

            // Summary
            rowData.push({ v: emp.summary.present, t: 'n', s: { font: { bold: true, color: { rgb: "16a34a" } }, alignment: { horizontal: "center" }, border: standardBorder } });
            rowData.push({ v: emp.summary.absent, t: 'n', s: { font: { bold: true, color: { rgb: "dc2626" } }, alignment: { horizontal: "center" }, border: standardBorder } });
            rowData.push({ v: emp.summary.halfDay, t: 'n', s: { font: { bold: true, color: { rgb: "d97706" } }, alignment: { horizontal: "center" }, border: standardBorder } });

            wsData.push(rowData);
        });

        // Generate Worksheet from Array of Arrays of Cell Objects
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);

        // Auto-size columns
        const colWidths = [
            { wch: 25 }, // Employee Name
            ...daysArray.map(() => ({ wch: 10 })), // Days
            { wch: 14 }, // Total Present
            { wch: 14 }, // Total Absent
            { wch: 14 }, // Total Half Day
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

        const monthName = months.find(m => m.value === selectedMonth)?.label;
        XLSX.writeFile(workbook, `Attendance_${monthName}_${selectedYear}.xlsx`);
    };

    const getCellColor = (status) => {
        switch (status) {
            case 'P': return 'bg-[#c6efce] text-[#006100] border-[#c6efce]';
            case 'A': return 'bg-[#ffc7ce] text-[#9c0006] border-[#ffc7ce]';
            case 'H': return 'bg-[#ffeb9c] text-[#9c5700] border-[#ffeb9c]';
            case 'Holiday': return 'bg-white text-gray-800 border-white';
            case 'W': return 'bg-gray-100 text-gray-500 border-gray-100';
            case 'N/A':
            default:
                return 'bg-white text-gray-400 border-white';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-indigo-600" />
                        Monthly Attendance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">View and export monthly team attendance reports</p>
                </div>

                <button
                    onClick={exportToExcel}
                    disabled={loading || reports.length === 0}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Download className="h-4 w-4" />
                    Export to Excel
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Month</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50 hover:bg-white transition-colors cursor-pointer"
                        >
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50 hover:bg-white transition-colors cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1 w-full sm:w-64">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Search Employee</label>
                    <input
                        type="text"
                        placeholder="Name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative z-0">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading attendance data...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">{error}</div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No employees found.</div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[65vh] relative custom-scrollbar">
                        <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                            <thead className="text-xs text-[#a066ff] bg-black sticky top-0 z-20 shadow-sm border-b border-gray-300">
                                <tr>
                                    <th className="px-4 py-3 sticky left-0 z-30 font-medium bg-black text-[#a066ff] border-r border-[#333] w-[200px]">Employee Name</th>
                                    {daysArray.map(day => (
                                        <th key={day} className="px-2 py-3 text-center border-r border-[#333] font-medium min-w-[90px]">
                                            {months.find(m => m.value === selectedMonth)?.label.substring(0, 3)} {day}
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 text-center bg-gray-100 border-l-2 border-gray-300">P</th>
                                    <th className="px-3 py-3 text-center bg-gray-100 border-x border-gray-200">A</th>
                                    <th className="px-3 py-3 text-center bg-gray-100">H</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 relative z-0">
                                {filteredReports.map((emp) => (
                                    <tr key={emp.emp_no} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-200 shadow-[1px_0_0_0_#e5e7eb] font-medium text-blue-700 truncate max-w-[150px] sm:max-w-[200px]" title={emp.full_name || emp.name}>
                                            <div className="flex flex-col">
                                                <span className="uppercase">{emp.full_name || emp.name}</span>
                                            </div>
                                        </td>

                                        {daysArray.map(day => {
                                            const status = emp.attendance[day];
                                            const isFuture = status === 'N/A';
                                            const isWeekend = status === 'W';
                                            const isUpdating = updatingCell === `${emp.emp_no}-${day}`;

                                            return (
                                                <td key={day} className="p-0 border-r border-b border-gray-200 text-center relative group/cell min-w-[90px] h-[36px]">
                                                    {isFuture || isWeekend ? (
                                                        <div className={`w-full h-full flex items-center justify-between px-2 text-[12px] font-normal tracking-wide ${getCellColor(status)}`}>
                                                            <span>{status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status === 'H' ? 'Half day' : status !== 'N/A' ? status : ''}</span>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full h-full relative flex items-center justify-center ${getCellColor(status)} hover:ring-2 hover:ring-inset hover:ring-indigo-400 transition-all cursor-pointer`}>
                                                            {isUpdating ? (
                                                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <>
                                                                    <select
                                                                        value={status === 'Holiday' ? 'Holiday' : (['P', 'A', 'H'].includes(status) ? status : '')}
                                                                        onChange={(e) => handleCellChange(emp.emp_no, day, e.target.value)}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                        title="Change Status"
                                                                    >
                                                                        <option value="P">Present</option>
                                                                        <option value="A">Absent</option>
                                                                        <option value="H">Half day</option>
                                                                        <option value="Holiday">Holiday</option>
                                                                    </select>
                                                                    <div className="pointer-events-none flex items-center justify-between px-2 w-full h-full">
                                                                        <span className="text-[12px] font-normal tracking-wide truncate">
                                                                            {status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status === 'H' ? 'Half day' : status}
                                                                        </span>
                                                                        <div className="text-gray-500 ml-1">
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                                                <path d="M7 10l5 5 5-5z" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td className="px-3 py-3 text-center font-bold text-green-600 bg-green-50/50 border-l-2 border-gray-300">
                                            {emp.summary.present}
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-red-600 bg-red-50/50 border-x border-gray-100">
                                            {emp.summary.absent}
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-orange-600 bg-orange-50/50">
                                            {emp.summary.halfDay}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4 shadow-sm">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#c6efce] border border-[#006100]"></span> P = Present (&ge;5 hrs)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#ffc7ce] border border-[#9c0006]"></span> A = Absent</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#ffeb9c] border border-[#9c5700]"></span> H = Half day (&lt;5 hrs)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-300"></span> Hol = Holiday</span>
                <span className="flex items-center gap-1 border-l pl-4 border-gray-200 italic ml-2">Tip: Hover over cells and click the dropdown arrow to edit attendance status!</span>
            </div>
            {/* Custom scrollbar styles for this component */}
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8; 
                }
            `}</style>
        </div>
    );
};

export default MonthlyAttendance;
