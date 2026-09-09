import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    LayoutDashboard, Users, FileText, LogOut, Bell, X, RefreshCw,
    CalendarPlus, CalendarDays, Settings, FileCheck2, Calendar,
    BookOpen, ShieldCheck, User, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import LiveClock from './LiveClock';

const LogoutModal = ({ isOpen, onClose, onConfirm, user }) => {
    const [tasks, setTasks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [taskUpdates, setTaskUpdates] = React.useState({});

    React.useEffect(() => {
        if (isOpen && user?.role === 'employee') {
            fetchTasks();
        }
    }, [isOpen]);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/tasks/employee');
            const activeTasks = Array.isArray(res.data) ? res.data : [];
            setTasks(activeTasks);

            const initialUpdates = {};
            activeTasks.forEach(t => {
                initialUpdates[t._id || t.id] = { pct: t.completion_percentage || 0, reason: t.reason || '' };
            });
            setTaskUpdates(initialUpdates);
        } catch (e) {
            console.error('Failed to fetch tasks for logout', e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (taskId, field, value) => {
        setTaskUpdates(prev => ({
            ...prev,
            [taskId]: { ...prev[taskId], [field]: value }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
            >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Clock Out & Sign Off</h3>
                        <p className="text-xs text-gray-500">Confirm your final task progress before logging off</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="py-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
                    ) : tasks.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-xs italic">No active tasks pending update.</div>
                    ) : (
                        tasks.map(task => {
                            const tId = task._id || task.id;
                            return (
                                <div key={tId} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-gray-800 text-xs">{task.title}</h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                            {taskUpdates[tId]?.pct || 0}% Done
                                        </span>
                                    </div>

                                    <div>
                                        <input
                                            type="range" min="0" max="100"
                                            value={taskUpdates[tId]?.pct || 0}
                                            onChange={(e) => handleUpdate(tId, 'pct', parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Status note or achievements..."
                                            value={taskUpdates[tId]?.reason || ''}
                                            onChange={(e) => handleUpdate(tId, 'reason', e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-200 bg-white border border-gray-200 transition-all"
                    >
                        Keep Working
                    </button>
                    <button
                        onClick={() => {
                            const updates = Object.entries(taskUpdates).map(([id, data]) => ({
                                taskId: id,
                                completion_percentage: data.pct,
                                reason: data.reason
                            }));
                            onConfirm(updates);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Confirm Logout</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const DashboardLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogoutClick = () => {
        if (user?.role === 'employee') {
            setIsLogoutModalOpen(true);
        } else {
            logout();
        }
    };

    const handleConfirmLogout = (statusUpdates) => {
        logout(statusUpdates);
        setIsLogoutModalOpen(false);
    };

    // Management / Supervisor sections
    const isSupervisor = user?.emp_no === '202601' || user?.emp_no === '202602' || user?.role === 'manager' || user?.role === 'hr';

    // Employee Categorized Nav
    const employeeSections = [
        ...(isSupervisor ? [{
            heading: user?.emp_no === '202601' ? 'ENGINEERING SUPERVISION' : 'HR SUPERVISION',
            items: [
                { name: 'Team Worksheets & Progress', path: '/worksheets?tab=team', icon: Users },
                { name: 'Team Attendance Sheet', path: '/admin/monthly-attendance', icon: CalendarDays },
            ]
        }] : []),
        {
            heading: 'WORKSPACE',
            items: [
                { name: 'My Tasks', path: '/dashboard', icon: LayoutDashboard },
                { name: '3-Hour Worksheets', path: '/worksheets', icon: FileCheck2 },
                { name: 'Company Documents', path: '/documents', icon: FileText },
                { name: 'Holiday Calendar', path: '/holidays', icon: Calendar },
                { name: 'Rules & Regulations', path: '/company-rules', icon: BookOpen },
            ]
        },
        {
            heading: 'TIME & REQUESTS',
            items: [
                { name: 'Attendance History', path: '/attendance', icon: CalendarDays },
                { name: 'Apply for Leave', path: '/leaves', icon: CalendarPlus },
            ]
        }
    ];

    // Admin Nav
    const adminSections = [
        {
            heading: 'ADMINISTRATION',
            items: [
                { name: 'Overview', path: '/admin', icon: LayoutDashboard },
                { name: 'Employees', path: '/admin/employees', icon: Users },
                { name: 'Leave Management', path: '/admin/leaves', icon: CalendarPlus },
                { name: 'Attendance Logs', path: '/admin/monthly-attendance', icon: CalendarDays },
                { name: 'Reports & Analytics', path: '/admin/reports', icon: FileText },
                { name: 'System Settings', path: '/admin/settings', icon: Settings },
            ]
        }
    ];

    const currentSections = user?.role === 'admin' ? adminSections : employeeSections;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
            {/* Sidebar - Desktop */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                {/* Brand */}
                <div className="p-5 h-20 flex items-center border-b border-gray-100">
                    <img src="/stackvil-logo.jpeg" alt="Stackvil" className="h-9 w-9 rounded-xl object-cover mr-3 border border-gray-100 shadow-sm" />
                    <div>
                        <span className="text-base font-black tracking-tight text-gray-900 block leading-tight">Stackvil</span>
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Workforce Portal</span>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto">
                    {currentSections.map((sec, sIdx) => (
                        <div key={sIdx} className="space-y-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase px-3 tracking-wider">
                                {sec.heading}
                            </div>
                            {sec.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            isActive
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer User Info & Logout */}
                <div className="p-3.5 border-t border-gray-100 space-y-2">
                    <button
                        onClick={handleLogoutClick}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 md:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shadow-sm gap-4">
                    {/* Mobile Logo */}
                    <div className="flex items-center md:hidden gap-2">
                        <img src="/stackvil-logo.jpeg" alt="Stackvil" className="h-7 w-7 rounded-lg object-cover" />
                        <span className="text-sm font-bold text-gray-900">Stackvil</span>
                    </div>

                    {/* Desktop Current Location Title */}
                    <div className="hidden md:block">
                        <h2 className="text-base font-bold text-gray-900">
                            {location.pathname === '/profile'
                                ? 'My Profile & Scorecard'
                                : currentSections.flatMap(s => s.items).find(i => i.path === location.pathname)?.name || 'Dashboard'}
                        </h2>
                    </div>

                    {/* Right Header: Clock, Notifications, Clickable Profile Avatar */}
                    <div className="flex items-center justify-end gap-3 sm:gap-4 flex-1">
                        <LiveClock />

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        {/* Top Navbar Profile Click Action: Direct navigation to Profile */}
                        <div
                            onClick={() => navigate(user?.role === 'admin' ? '/admin/settings' : '/profile')}
                            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-gray-100 transition-all cursor-pointer group border border-transparent hover:border-gray-200"
                            title="Click to view & manage your Profile"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                    {user?.full_name || user?.name}
                                </p>
                                <p className="text-[10px] text-gray-400 capitalize font-medium">{user?.role || 'Employee'}</p>
                            </div>

                            {user?.profile_photo || user?.profile_picture ? (
                                <img
                                    src={user.profile_photo || user.profile_picture}
                                    alt={user.name}
                                    className="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-indigo-200 object-cover shadow-sm"
                                />
                            ) : (
                                <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center text-indigo-700 text-xs font-bold shadow-inner">
                                    {(user?.full_name || user?.name)?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gray-50/70">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-around sticky bottom-0 z-20 shadow-lg">
                <Link to="/dashboard" className={`flex flex-col items-center p-1 ${location.pathname === '/dashboard' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-[9px] mt-0.5">Tasks</span>
                </Link>
                <Link to="/worksheets" className={`flex flex-col items-center p-1 ${location.pathname === '/worksheets' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                    <FileCheck2 className="w-5 h-5" />
                    <span className="text-[9px] mt-0.5">Worksheets</span>
                </Link>
                <Link to="/documents" className={`flex flex-col items-center p-1 ${location.pathname === '/documents' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                    <FileText className="w-5 h-5" />
                    <span className="text-[9px] mt-0.5">Docs</span>
                </Link>
                <Link to="/profile" className={`flex flex-col items-center p-1 ${location.pathname === '/profile' ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                    <User className="w-5 h-5" />
                    <span className="text-[9px] mt-0.5">Profile</span>
                </Link>
                <button onClick={handleLogoutClick} className="flex flex-col items-center p-1 text-red-500">
                    <LogOut className="w-5 h-5" />
                    <span className="text-[9px] mt-0.5">Logout</span>
                </button>
            </div>

            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleConfirmLogout}
                user={user}
            />
        </div>
    );
};

export default DashboardLayout;
