import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, FileText, LogOut, Moon, Sun, Bell } from 'lucide-react';
import LiveClock from './LiveClock';

const LogoutModal = ({ isOpen, onClose, onConfirm, user }) => {
    const [tasks, setTasks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [taskUpdates, setTaskUpdates] = React.useState({}); // { taskId: { pct, reason } }

    React.useEffect(() => {
        if (isOpen && user?.role === 'employee') {
            fetchTasks();
        }
    }, [isOpen]);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/tasks/employee');
            // Combine all non-finalized tasks
            const activeTasks = [...res.data.today, ...res.data.pending, ...res.data.overdue];
            setTasks(activeTasks);

            const initialUpdates = {};
            activeTasks.forEach(t => {
                initialUpdates[t.id] = { pct: t.completion_percentage, reason: t.reason || '' };
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Ready to Clock Out?</h3>
                        <p className="text-sm text-gray-500">Update your project status before leaving</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="py-10 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
                    ) : tasks.length === 0 ? (
                        <div className="py-10 text-center text-gray-400 font-medium italic">No active tasks to update.</div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-4">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-800">{task.title}</h4>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 uppercase">
                                        {task.completion_percentage}% Done
                                    </span>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                        <span>Current Progress</span>
                                        <span className="text-indigo-600">{taskUpdates[task.id]?.pct}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100"
                                        value={taskUpdates[task.id]?.pct || 0}
                                        onChange={(e) => handleUpdate(task.id, 'pct', parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">
                                        Status Note {taskUpdates[task.id]?.pct < 100 ? '/ Reason for Delay' : ''}
                                    </label>
                                    <textarea
                                        placeholder="What did you achieve? Any blockers?"
                                        value={taskUpdates[task.id]?.reason || ''}
                                        onChange={(e) => handleUpdate(task.id, 'reason', e.target.value)}
                                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 rounded-2xl font-bold text-gray-600 hover:bg-white border border-gray-200 transition-all"
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
                        className="flex-1 py-3 px-6 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        Confirm Logout
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const DashboardLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);

    const navItems = user?.role === 'admin' ? [
        { name: 'Overview', path: '/admin', icon: LayoutDashboard },
        { name: 'Employees', path: '/admin/employees', icon: Users },
        { name: 'Reports', path: '/admin/reports', icon: FileText },
    ] : [
        { name: 'My Tasks', path: '/dashboard', icon: LayoutDashboard },
    ];

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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Sidebar - Desktop */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6 h-20 flex items-center border-b border-gray-100">
                    <img src="/logo.jpg" alt="StackVil" className="h-10 w-10 rounded-xl object-cover mr-3 shadow-sm" />
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">StackVil</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2 tracking-wider">Main Menu</div>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogoutClick}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center md:hidden gap-3">
                        <img src="/logo.jpg" alt="StackVil" className="h-8 w-8 rounded-lg object-cover shadow-sm" />
                        <span className="text-lg font-bold text-gray-800">StackVil</span>
                    </div>
                    <div className="hidden md:block">
                        <h2 className="text-xl font-bold text-gray-800">
                            {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <LiveClock />
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors relative">
                                <Bell className="w-6 h-6" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <div className="h-8 w-px bg-gray-200 mx-2"></div>
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-gray-800">{user?.full_name || user?.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                                </div>
                                {user?.profile_picture ? (
                                    <img
                                        src={user.profile_picture}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full border-2 border-indigo-200 object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-indigo-100 border-2 border-indigo-200 rounded-full flex items-center justify-center text-indigo-600 font-bold shadow-inner">
                                        {(user?.full_name || user?.name)?.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Navbar */}
            <div className="md:hidden bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-around h-16 sticky bottom-0 z-10 shadow-lg">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-[10px] mt-1 font-bold">{item.name}</span>
                        </Link>
                    );
                })}
                <button onClick={handleLogoutClick} className="flex flex-col items-center justify-center text-red-400">
                    <LogOut className="w-6 h-6" />
                    <span className="text-[10px] mt-1 font-bold">Logout</span>
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
