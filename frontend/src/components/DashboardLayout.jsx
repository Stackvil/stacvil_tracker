import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, FileText, LogOut, Moon, Sun, Bell } from 'lucide-react';
import LiveClock from './LiveClock';

const DashboardLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();

    const navItems = user?.role === 'admin' ? [
        { name: 'Overview', path: '/admin', icon: LayoutDashboard },
        { name: 'Employees', path: '/admin/employees', icon: Users },
        { name: 'Reports', path: '/admin/reports', icon: FileText },
    ] : [
        { name: 'My Tasks', path: '/dashboard', icon: LayoutDashboard },
    ];

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
                        onClick={logout}
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
                                    <p className="text-sm font-bold text-gray-800">{user?.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                                </div>
                                <div className="w-10 h-10 bg-indigo-100 border-2 border-indigo-200 rounded-full flex items-center justify-center text-indigo-600 font-bold shadow-inner">
                                    {user?.name?.charAt(0)}
                                </div>
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
                <button onClick={logout} className="flex flex-col items-center justify-center text-red-400">
                    <LogOut className="w-6 h-6" />
                    <span className="text-[10px] mt-1 font-bold">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default DashboardLayout;
