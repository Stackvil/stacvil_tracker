import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, Title,
    Tooltip as ChartTooltip, Legend, ArcElement
} from 'chart.js';
import { Bar as BarChart, Pie as PieChart } from 'react-chartjs-2';
import {
    Calendar, Download, Clock, CheckCircle2, AlertCircle,
    XCircle, User, TrendingUp, Users, ClipboardList, RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

const STATUS_COLORS = {
    completed: { bg: 'bg-green-100', text: 'text-green-700', hex: '#10b981' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', hex: '#6366f1' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', hex: '#9ca3af' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', hex: '#ef4444' },
    declined: { bg: 'bg-orange-100', text: 'text-orange-700', hex: '#f97316' },
    'N/A': { bg: 'bg-gray-50', text: 'text-gray-400', hex: '#e5e7eb' },
};

const Reports = () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const [selectedDate, setSelectedDate] = useState(today);
    const [reports, setReports] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('table'); // 'table' | 'charts'

    useEffect(() => {
        fetchAll();
        let interval;
        if (selectedDate === today) {
            interval = setInterval(fetchAll, 30000); // Poll today's report
        }
        return () => interval && clearInterval(interval);
    }, [selectedDate]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [repRes, anaRes] = await Promise.all([
                api.get(`/admin/reports/daily?date=${selectedDate}`),
                api.get('/admin/analytics'),
            ]);
            setReports(repRes.data);
            setAnalytics(anaRes.data);
        } catch (e) {
            console.error('Failed to fetch reports:', e);
        } finally {
            setLoading(false);
        }
    };

    // ── CSV Export ──────────────────────────────────────────────────────────
    const exportCSV = () => {
        const headers = ['Emp No', 'Name', 'Login', 'Logout', 'Working Hours', 'Task', 'Status', 'Progress%', 'Due Date'];
        const rows = reports.map(r => [
            r.emp_no, r.name,
            r.login_time !== 'N/A' ? r.login_time : '',
            r.logout_time !== 'N/A' ? r.logout_time : '',
            r.working_hours !== 'Running' ? r.working_hours : 'Still Active',
            r.title !== 'No Task' ? r.title : '',
            r.status !== 'N/A' ? r.status : '',
            r.completion_percentage,
            r.due_date !== 'N/A' ? r.due_date : '',
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${selectedDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Summary stats ────────────────────────────────────────────────────────
    const presentCount = reports.filter(r => r.login_time !== 'N/A').length;
    const absentCount = reports.filter(r => r.login_time === 'N/A').length;
    const activeCount = reports.filter(r => r.login_time !== 'N/A' && r.logout_time === 'N/A').length;
    const completedTasks = reports.filter(r => r.status === 'completed').length;

    // ── Chart data ───────────────────────────────────────────────────────────
    const taskStatusCounts = {};
    reports.forEach(r => {
        if (r.status && r.status !== 'N/A') {
            taskStatusCounts[r.status] = (taskStatusCounts[r.status] || 0) + 1;
        }
    });
    const pieData = {
        labels: Object.keys(taskStatusCounts).map(s => s.replace('_', ' ')),
        datasets: [{
            data: Object.values(taskStatusCounts),
            backgroundColor: Object.keys(taskStatusCounts).map(s => STATUS_COLORS[s]?.hex || '#9ca3af'),
            borderWidth: 2,
            borderColor: '#fff',
        }]
    };

    const barData = {
        labels: reports.filter(r => r.login_time !== 'N/A').map(r => r.name),
        datasets: [{
            label: 'Task Progress (%)',
            data: reports.filter(r => r.login_time !== 'N/A').map(r => r.completion_percentage || 0),
            backgroundColor: '#6366f1',
            borderRadius: 8,
        }]
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
                    <p className="text-sm text-gray-500 mt-1">Attendance & task productivity by date</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Date picker */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            max={today}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700"
                        />
                    </div>
                    {/* View toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button onClick={() => setActiveView('table')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Table</button>
                        <button onClick={() => setActiveView('charts')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>Charts</button>
                    </div>
                    <button onClick={fetchAll} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard icon={Users} color="bg-blue-500" label="Present Today" value={presentCount} />
                <SummaryCard icon={User} color="bg-red-400" label="Absent Today" value={absentCount} />
                <SummaryCard icon={Clock} color="bg-amber-500" label="Currently Active" value={activeCount} />
                <SummaryCard icon={CheckCircle2} color="bg-green-500" label="Tasks Completed" value={completedTasks} />
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100 shadow-sm">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
                    Loading report for {selectedDate}...
                </div>
            ) : reports.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100 shadow-sm">
                    No data available for {selectedDate}
                </div>
            ) : activeView === 'table' ? (
                <ReportTable reports={reports} />
            ) : (
                <ChartsView pieData={pieData} barData={barData} analytics={analytics} />
            )}
        </div>
    );
};

// ── Report Table ─────────────────────────────────────────────────────────────
const ReportTable = ({ reports }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        {['Employee', 'Login', 'Logout', 'Hours', 'Task', 'Status', 'Progress'].map(h => (
                            <th key={h} className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {reports.map((r, i) => {
                        const s = STATUS_COLORS[r.status] || STATUS_COLORS['N/A'];
                        const isAbsent = r.login_time === 'N/A';
                        return (
                            <tr key={i} className={`hover:bg-indigo-50/20 transition-colors ${isAbsent ? 'opacity-60' : ''}`}>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        {r.profile_picture ? (
                                            <img src={r.profile_picture} alt={r.name} className="w-8 h-8 rounded-lg shrink-0 object-cover shadow-sm" />
                                        ) : (
                                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                                {r.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm whitespace-nowrap">{r.full_name || r.name}</p>
                                            <p className="text-[10px] text-gray-400">#{r.emp_no}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-sm font-medium text-gray-700">
                                    {r.login_time !== 'N/A' ? r.login_time : <span className="text-red-400 text-xs font-semibold">Absent</span>}
                                </td>
                                <td className="px-5 py-4 text-sm font-medium text-gray-700">
                                    {r.logout_time !== 'N/A' ? r.logout_time : r.login_time !== 'N/A' ? <span className="text-amber-500 text-xs font-semibold">Active</span> : '-'}
                                </td>
                                <td className="px-5 py-4 text-sm font-medium text-gray-700">
                                    {r.working_hours === 'Running' ? <span className="text-amber-500 font-semibold text-xs">Running</span> : r.working_hours !== 'N/A' ? r.working_hours : '-'}
                                </td>
                                <td className="px-5 py-4 text-sm text-gray-700 max-w-[160px] truncate" title={r.title}>
                                    {r.title !== 'No Task' ? r.title : <span className="text-gray-400 text-xs">No Task</span>}
                                </td>
                                <td className="px-5 py-4">
                                    {r.status !== 'N/A' ? (
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${s.bg} ${s.text}`}>
                                            {r.status.replace('_', ' ')}
                                        </span>
                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 min-w-[80px]">
                                        <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all"
                                                style={{ width: `${r.completion_percentage || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 w-8 text-right">{r.completion_percentage || 0}%</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

// ── Charts View ───────────────────────────────────────────────────────────────
const ChartsView = ({ pieData, barData, analytics }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Task Status Breakdown (Today)</h3>
            {pieData.labels.length > 0 ? (
                <div className="h-[280px] flex items-center justify-center">
                    <PieChart data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                </div>
            ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-400">No task data</div>
            )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Employee Task Progress (Today)</h3>
            {barData.labels.length > 0 ? (
                <div className="h-[280px]">
                    <BarChart data={barData} options={{
                        maintainAspectRatio: false,
                        scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } },
                        plugins: { legend: { display: false } }
                    }} />
                </div>
            ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-400">No attendance data</div>
            )}
        </div>

        {analytics && (
            <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">All-Time Task Distribution</h3>
                    <div className="h-[280px] flex items-center justify-center">
                        <PieChart
                            data={{
                                labels: (analytics.taskStats || []).map(s => s.status.replace('_', ' ')),
                                datasets: [{
                                    data: (analytics.taskStats || []).map(s => s.count),
                                    backgroundColor: (analytics.taskStats || []).map(s => STATUS_COLORS[s.status]?.hex || '#9ca3af'),
                                    borderWidth: 2, borderColor: '#fff'
                                }]
                            }}
                            options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Total Working Hours (All Time)</h3>
                    <div className="h-[280px]">
                        <BarChart
                            data={{
                                labels: (analytics.workingHours || []).map(w => `EMP ${w.emp_no}`),
                                datasets: [{
                                    label: 'Hours',
                                    data: (analytics.workingHours || []).map(w => parseFloat(w.total_hours) || 0),
                                    backgroundColor: '#8b5cf6',
                                    borderRadius: 8,
                                }]
                            }}
                            options={{
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { ticks: { callback: v => v + 'h' } } }
                            }}
                        />
                    </div>
                </div>
            </>
        )}
    </div>
);

// ── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, color, label, value }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className={`w-11 h-11 ${color} text-white rounded-xl flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
        </div>
    </div>
);

export default Reports;
