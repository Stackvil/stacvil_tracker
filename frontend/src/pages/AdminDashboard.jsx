import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, Title,
    Tooltip as ChartTooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import { Bar as BarComponent, Pie as PieComponent } from 'react-chartjs-2';
import {
    Users, CheckCircle, Clock, TrendingUp, ArrowRight,
    CheckCircle2, XCircle, AlertCircle, ClipboardList
} from 'lucide-react';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend,
    ArcElement, PointElement, LineElement
);

const STATUS_COLORS = {
    completed: { bg: 'bg-green-100', text: 'text-green-700', hex: '#10b981' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', hex: '#6366f1' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', hex: '#9ca3af' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', hex: '#ef4444' },
    declined: { bg: 'bg-orange-100', text: 'text-orange-700', hex: '#f97316' },
};

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [todayReport, setTodayReport] = useState([]);
    const [leavesToday, setLeavesToday] = useState([]);
    const [loading, setLoading] = useState(true);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000); // auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchAll = async () => {
        try {
            const [anaRes, repRes, leaveRes] = await Promise.all([
                api.get('/admin/analytics'),
                api.get(`/admin/reports/daily?date=${today}`),
                api.get('/leaves/admin/all')
            ]);
            setStats(anaRes.data);
            setTodayReport(repRes.data);
            setLeavesToday(leaveRes.data.filter(l =>
                l.status === 'approved' &&
                (today === l.start_date || (l.type === 'multiple' && today >= l.start_date && today <= l.end_date))
            ));
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Dashboard...</div>;
    if (!stats) return <div className="p-10 text-center text-gray-500">No analytics data available</div>;

    const taskData = {
        labels: (stats.taskStats || []).map(s => s.status.replace('_', ' ')),
        datasets: [{
            label: 'Tasks',
            data: (stats.taskStats || []).map(s => s.count),
            backgroundColor: (stats.taskStats || []).map(s => STATUS_COLORS[s.status]?.hex || '#9ca3af'),
            borderWidth: 2,
            borderColor: '#fff',
        }]
    };

    const hourData = {
        labels: (stats.workingHours || []).map(w => `EMP ${w.emp_no}`),
        datasets: [{
            label: 'Total Working Hours',
            data: (stats.workingHours || []).map(w => parseFloat(w.total_hours) || 0),
            backgroundColor: '#8b5cf6',
            borderRadius: 8,
        }]
    };

    const presentToday = todayReport.filter(r => r.login_time !== 'N/A').length;
    const absentToday = todayReport.filter(r => r.login_time === 'N/A').length;
    const activeNow = todayReport.filter(r => r.login_time !== 'N/A' && r.logout_time === 'N/A').length;
    const completedToday = todayReport.filter(r => r.status === 'completed').length;

    return (
        <div className="space-y-6">
            {/* Top stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Employees" value={stats.workingHours?.length || 0} icon={Users} color="bg-blue-500" />
                <StatCard title="Avg. Completion" value={`${Math.round(stats.avgCompletion || 0)}%`} icon={TrendingUp} color="bg-emerald-500" />
                <StatCard title="Tasks Completed" value={(stats.taskStats || []).find(s => s.status === 'completed')?.count || 0} icon={CheckCircle} color="bg-indigo-500" />
                <StatCard title="In Progress" value={(stats.taskStats || []).find(s => s.status === 'in_progress')?.count || 0} icon={Clock} color="bg-amber-500" />
            </div>

            {/* Today's Attendance Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-indigo-500" />
                            Today's Report
                            <span className="text-sm font-normal text-gray-400 ml-1">({today})</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Live attendance & task status for all employees</p>
                    </div>
                    <Link to="/admin/reports" className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        Full Reports <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Mini summary pills */}
                <div className="flex flex-wrap gap-3 mb-5">
                    <Pill color="bg-green-50 text-green-700 border-green-200" label={`${presentToday} Present`} />
                    <Pill color="bg-amber-50 text-amber-700 border-amber-200" label={`${leavesToday.length} On Leave`} />
                    <Pill color="bg-red-50 text-red-600 border-red-200" label={`${absentToday - leavesToday.length} Absent`} />
                    <Pill color="bg-blue-50 text-blue-700 border-blue-200" label={`${activeNow} Active Now`} />
                    <Pill color="bg-indigo-50 text-indigo-700 border-indigo-200" label={`${completedToday} Tasks Done`} />
                </div>

                {todayReport.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No employee data for today</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {['Employee', 'Login', 'Logout', 'Task', 'Status', 'Progress'].map(h => (
                                        <th key={h} className="pb-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {todayReport.map((r, i) => {
                                    const s = STATUS_COLORS[r.status];
                                    const isAbsent = r.login_time === 'N/A';
                                    return (
                                        <tr key={i} className={`hover:bg-gray-50 transition-colors ${isAbsent ? 'opacity-50' : ''}`}>
                                            <td className="py-3 px-2">
                                                <div className="flex items-center gap-2">
                                                    {r.profile_picture ? (
                                                        <img src={r.profile_picture} alt={r.name} className="w-7 h-7 rounded-lg shrink-0 object-cover" />
                                                    ) : (
                                                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                                            {r.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">{r.full_name || r.name}</p>
                                                        <p className="text-[10px] text-gray-400">#{r.emp_no}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-sm text-gray-600">
                                                {r.login_time !== 'N/A' ? r.login_time : <span className="text-red-400 text-xs font-semibold">Absent</span>}
                                            </td>
                                            <td className="py-3 px-2 text-sm text-gray-600">
                                                {r.logout_time !== 'N/A' ? r.logout_time : r.login_time !== 'N/A' ? <span className="text-amber-500 text-xs font-semibold">Active</span> : '-'}
                                            </td>
                                            <td className="py-3 px-2 text-sm text-gray-700 max-w-[140px] truncate">
                                                {r.title !== 'No Task' ? (
                                                    <div className="flex flex-col">
                                                        <span>{r.title}</span>
                                                        {r.is_self_assigned && (
                                                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider w-fit mt-0.5">
                                                                Employee Added
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="py-3 px-2">
                                                {s ? (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${s.bg} ${s.text}`}>
                                                        {r.status.replace('_', ' ')}
                                                    </span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="py-3 px-2">
                                                <div className="flex items-center gap-2 min-w-[70px]">
                                                    <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.completion_percentage || 0}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-600">{r.completion_percentage || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">All-Time Task Distribution</h3>
                    <div className="h-[280px] flex items-center justify-center">
                        <PieComponent data={taskData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Employee Working Hours (All Time)</h3>
                    <div className="h-[280px]">
                        <BarComponent data={hourData} options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { ticks: { callback: v => v + 'h' } } }
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className={`w-12 h-12 ${color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
        </div>
    </div>
);

const Pill = ({ color, label }) => (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${color}`}>{label}</span>
);

export default AdminDashboard;
