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
    CheckCircle2, XCircle, AlertCircle, ClipboardList, LogOut
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

import LoginRequestsList from '../components/Admin/LoginRequestsList';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [todayReport, setTodayReport] = useState([]);
    const [leavesToday, setLeavesToday] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminating, setTerminating] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleForceLogoutAll = async () => {
        if (!window.confirm("Are you sure you want to end ALL active employee sessions? This will force-logout everyone currently working.")) return;

        setTerminating(true);
        try {
            const response = await api.post('/admin/force-logout-all');
            alert(response.data.message);
            await fetchAll();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to terminate sessions');
        } finally {
            setTerminating(false);
        }
    };

    const handleForceLogoutEmployee = async (emp_no) => {
        if (!window.confirm(`Are you sure you want to end session for employee #${emp_no}?`)) return;

        try {
            const response = await api.post(`/admin/force-logout/${emp_no}`);
            alert(response.data.message);
            await fetchAll();
            // Refresh modal if active
            if (selectedCategory && selectedCategory.title === 'Active Now') {
                const refreshedReport = await api.get(`/admin/reports/daily?date=${today}`);
                const updatedActiveNow = refreshedReport.data.filter(r => r.login_time !== 'N/A' && r.logout_time === 'N/A');
                setSelectedCategory(prev => ({ ...prev, list: updatedActiveNow }));
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to terminate session');
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
    const leaveEmpNos = leavesToday.map(l => l.emp_no);
    const absentEmployees = todayReport.filter(r => r.login_time === 'N/A' && !leaveEmpNos.includes(r.emp_no));
    const absentTodayCount = absentEmployees.length;
    const activeNowList = todayReport.filter(r => r.login_time !== 'N/A' && r.logout_time === 'N/A');
    const activeNow = activeNowList.length;
    const completedToday = todayReport.filter(r => r.status === 'completed').length;

    const handlePillClick = (category) => {
        let list = [];
        let title = "";
        switch (category) {
            case 'Present':
                list = todayReport.filter(r => r.login_time !== 'N/A');
                title = "Present Employees";
                break;
            case 'On Leave':
                list = todayReport.filter(r => leaveEmpNos.includes(r.emp_no));
                title = "Employees On Leave";
                break;
            case 'Absent':
                list = absentEmployees;
                title = "Absent Employees";
                break;
            case 'Active Now':
                list = activeNowList;
                title = "Active Now";
                break;
            case 'Tasks Done':
                list = todayReport.filter(r => r.status === 'completed');
                title = "Completed Tasks Today";
                break;
            default:
                break;
        }
        setSelectedCategory({ title, list });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Top stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Employees" value={stats.workingHours?.length || 0} icon={Users} color="bg-blue-500" />
                <StatCard title="Avg. Completion" value={`${Math.round(stats.avgCompletion || 0)}%`} icon={TrendingUp} color="bg-emerald-500" />
                <StatCard title="Tasks Completed" value={(stats.taskStats || []).find(s => s.status === 'completed')?.count || 0} icon={CheckCircle} color="bg-indigo-500" />
                <StatCard title="In Progress" value={(stats.taskStats || []).find(s => s.status === 'in_progress')?.count || 0} icon={Clock} color="bg-amber-500" />
            </div>

            {/* Pending Login Requests */}
            <LoginRequestsList />

            {/* Today's Attendance Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-indigo-500" />
                            Today's Report
                            <span className="text-sm font-normal text-gray-400 ml-1">({today})</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Live attendance & task status for all employees</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/admin/reports" className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                            Full Reports <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Mini summary pills */}
                <div className="flex flex-wrap gap-3 mb-5">
                    <Pill color="bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100" label={`${presentToday} Present`} onClick={() => handlePillClick('Present')} />
                    <Pill color="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100" label={`${leavesToday.length} On Leave`} onClick={() => handlePillClick('On Leave')} />
                    <Pill color="bg-red-50 text-red-600 border-red-200 cursor-pointer hover:bg-red-100" label={`${absentTodayCount} Absent`} onClick={() => handlePillClick('Absent')} />
                    <Pill color="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100" label={`${activeNow} Active Now`} onClick={() => handlePillClick('Active Now')} />
                    <Pill color="bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer hover:bg-indigo-100" label={`${completedToday} Tasks Done`} onClick={() => handlePillClick('Tasks Done')} />
                </div>

                {/* Powerful Action Card for Ending All Sessions - Always visible in APK */}
                <div className={`mb-6 p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm transition-all ${activeNow > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${activeNow > 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400 shadow-none'}`}>
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className={`font-extrabold text-base transition-colors ${activeNow > 0 ? 'text-red-900' : 'text-gray-500'}`}>{activeNow} Active Sessions</h4>
                            <p className={`text-xs font-bold uppercase tracking-wide transition-colors ${activeNow > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {activeNow > 0 ? 'Emergency Logout Controls' : 'System Clear / No Active Sessions'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleForceLogoutAll}
                        disabled={terminating || activeNow === 0}
                        className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${terminating || activeNow === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100'
                            : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200/50 shadow-xl active:scale-95'
                            }`}
                    >
                        <LogOut className={`w-5 h-5 ${terminating ? 'animate-spin' : ''}`} />
                        {terminating ? 'Processing...' : 'End All Active Sessions'}
                    </button>
                </div>

                {todayReport.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No employee data for today</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
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
                                                <td className="py-3 px-2 text-sm text-gray-700 max-w-[140px]">
                                                    {r.title !== 'No Task' ? (
                                                        <div className="flex flex-col">
                                                            <span className="truncate">{r.title}</span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${r.assigned_date === today ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                                                                    Assigned: {r.assigned_date}
                                                                </span>
                                                                {r.is_self_assigned && (
                                                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        Self Added
                                                                    </span>
                                                                )}
                                                                {r.due_date < today && r.status !== 'completed' && (
                                                                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        Overdue
                                                                    </span>
                                                                )}
                                                            </div>
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

                        {/* Mobile Card Layout */}
                        <div className="md:hidden space-y-4">
                            {todayReport.map((r, i) => {
                                const s = STATUS_COLORS[r.status];
                                const isAbsent = r.login_time === 'N/A';
                                return (
                                    <div key={i} className={`p-4 rounded-xl border border-gray-100 ${isAbsent ? 'bg-gray-50 opacity-70' : 'bg-white shadow-sm'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {r.profile_picture ? (
                                                    <img src={r.profile_picture} alt={r.name} className="w-10 h-10 rounded-lg shrink-0 object-cover shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                                        {r.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{r.full_name || r.name}</p>
                                                    <p className="text-[10px] text-gray-400">#{r.emp_no}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {s ? (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${s.bg} ${s.text}`}>
                                                        {r.status.replace('_', ' ')}
                                                    </span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Login</p>
                                                <p className="text-xs font-semibold text-gray-700">{r.login_time !== 'N/A' ? r.login_time : 'Absent'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Logout</p>
                                                <p className="text-xs font-semibold text-gray-700">{r.logout_time !== 'N/A' ? r.logout_time : r.login_time !== 'N/A' ? 'Active' : '-'}</p>
                                            </div>
                                        </div>

                                        {r.title !== 'No Task' && (
                                            <div className="mb-3">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Current Task</p>
                                                <p className="text-xs font-bold text-gray-700">{r.title}</p>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${r.assigned_date === today ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                                                        Assigned: {r.assigned_date}
                                                    </span>
                                                    {r.is_self_assigned && (
                                                        <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                            Self Added
                                                        </span>
                                                    )}
                                                    {r.due_date < today && r.status !== 'completed' && (
                                                        <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                            Overdue
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Progress</span>
                                                <span className="text-[10px] font-bold text-indigo-600">{r.completion_percentage || 0}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.completion_percentage || 0}%` }} />
                                            </div>
                                        </div>

                                        {/* Force Logout Button for Mobile */}
                                        {r.login_time !== 'N/A' && r.logout_time === 'N/A' && (
                                            <div className="mt-4 pt-3 border-t border-gray-50">
                                                <button
                                                    onClick={() => handleForceLogoutEmployee(r.emp_no)}
                                                    disabled={terminating}
                                                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${terminating
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                                        }`}
                                                >
                                                    <LogOut className={`w-3.5 h-3.5 ${terminating ? 'animate-spin' : ''}`} />
                                                    {terminating ? 'Ending...' : 'End Session'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
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

            {/* Employee List Modal */}
            {
                isModalOpen && selectedCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all animate-in fade-in active:scale-100">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-800">{selectedCategory.title}</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                                {selectedCategory.list.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
                                        <AlertCircle className="w-10 h-10 opacity-20" />
                                        <p>No employees found in this category</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedCategory.list.map((emp, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                                {emp.profile_picture ? (
                                                    <img src={emp.profile_picture} alt={emp.name} className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                        {(emp.full_name || emp.name)?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 truncate text-sm">{emp.full_name || emp.name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">#{emp.emp_no}</p>
                                                </div>
                                                <div className="text-right shrink-0 flex items-center gap-3">
                                                    {emp.login_time !== 'N/A' ? (
                                                        <>
                                                            <div className="space-y-0.5">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Logged In</p>
                                                                <p className="text-xs font-bold text-indigo-600">{emp.login_time}</p>
                                                            </div>
                                                            {selectedCategory.title === 'Active Now' && (
                                                                <button
                                                                    onClick={() => handleForceLogoutEmployee(emp.emp_no)}
                                                                    disabled={terminating}
                                                                    className={`p-2 rounded-lg transition-colors border group ${terminating
                                                                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                                        : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100'
                                                                        }`}
                                                                    title="End Session"
                                                                >
                                                                    <LogOut className={`w-4 h-4 ${!terminating && 'group-hover:scale-110'} transition-transform`} />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold uppercase">Absent</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-200 active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
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

const Pill = ({ color, label, onClick }) => (
    <button
        onClick={onClick}
        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all active:scale-95 ${color}`}
    >
        {label}
    </button>
);

export default AdminDashboard;
