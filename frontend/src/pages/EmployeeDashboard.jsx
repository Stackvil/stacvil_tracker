import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    CheckCircle2, Clock, AlertCircle, Lock, X, Calendar as CalendarIcon,
    ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import AttendanceCalendar from '../components/AttendanceCalendar';

const EmployeeDashboard = () => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('tasks');
    const [groupedTasks, setGroupedTasks] = useState({
        today: [], pending: [], overdue: [], declined: [], completed: []
    });
    const [loading, setLoading] = useState(true);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [collapsedSections, setCollapsedSections] = useState({ completed: true, declined: false });

    // Decline modal state
    const [declineModal, setDeclineModal] = useState(null); // task object
    const [declineReason, setDeclineReason] = useState('');
    const [declineError, setDeclineError] = useState('');

    // Attendance states
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [taskHistory, setTaskHistory] = useState([]);

    useEffect(() => {
        let interval;
        if (activeTab === 'tasks') {
            fetchTasks();
            interval = setInterval(fetchTasks, 30000); // auto-refresh tasks every 30s
        } else {
            fetchAttendanceHistory();
            interval = setInterval(fetchAttendanceHistory, 30000); // auto-refresh attendance every 30s
        }
        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tasks/employee');
            setGroupedTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/history');
            setAttendanceHistory(response.data.attendance);
            setTaskHistory(response.data.tasks);
        } catch (error) {
            console.error('Failed to fetch attendance history:', error);
        } finally {
            setLoading(false);
        }
    };

    // Accept task
    const handleAcceptTask = async (taskId) => {
        try {
            await api.put(`/tasks/${taskId}`, { action: 'accept' });
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to accept task');
        }
    };

    // Open decline modal
    const openDeclineModal = (task) => {
        setDeclineModal(task);
        setDeclineReason('');
        setDeclineError('');
    };

    // Submit decline
    const handleDeclineTask = async () => {
        if (!declineReason.trim()) {
            setDeclineError('Please provide a reason for declining');
            return;
        }
        try {
            await api.put(`/tasks/${declineModal.id}`, { action: 'decline', reason: declineReason });
            setDeclineModal(null);
            setDeclineReason('');
            fetchTasks();
        } catch (error) {
            setDeclineError(error.response?.data?.message || 'Failed to decline task');
        }
    };

    // Update progress (slider)
    const handleUpdateProgress = async (taskId, percentage) => {
        try {
            await api.put(`/tasks/${taskId}`, { action: 'update_progress', completion_percentage: percentage });
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update progress');
        }
    };

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (loading && Object.values(groupedTasks).every(arr => arr.length === 0)) {
        return <div className="flex justify-center p-20"><Clock className="animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Hello, {user?.name}! 👋</h1>
                    <p className="text-gray-500">Track and manage your tasks.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-200 transition-all"
                    >
                        <Lock className="w-4 h-4" />
                        Change Password
                    </button>
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Today Login: {user?.login_time ? new Intl.DateTimeFormat('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                        }).format(new Date(user.login_time)) : 'N/A'}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-gray-200/50 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-8 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    My Tasks
                </button>
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`px-8 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Attendance History
                </button>
            </div>

            {activeTab === 'tasks' ? (
                <div className="space-y-6">
                    {/* Today's Tasks */}
                    <TaskSection
                        title="Today's Tasks"
                        tasks={groupedTasks.today}
                        icon={<CalendarIcon className="w-5 h-5" />}
                        emptyMessage="No tasks due today"
                        onAccept={handleAcceptTask}
                        onDecline={openDeclineModal}
                        onUpdateProgress={handleUpdateProgress}
                        variant="primary"
                    />

                    {/* Overdue Tasks */}
                    {groupedTasks.overdue.length > 0 && (
                        <TaskSection
                            title="Overdue Tasks"
                            tasks={groupedTasks.overdue}
                            icon={<AlertCircle className="w-5 h-5" />}
                            emptyMessage="No overdue tasks"
                            onAccept={handleAcceptTask}
                            onDecline={openDeclineModal}
                            onUpdateProgress={handleUpdateProgress}
                            variant="danger"
                        />
                    )}

                    {/* Pending Tasks */}
                    {groupedTasks.pending.length > 0 && (
                        <TaskSection
                            title="Upcoming Tasks"
                            tasks={groupedTasks.pending}
                            icon={<Clock className="w-5 h-5" />}
                            emptyMessage="No upcoming tasks"
                            onAccept={handleAcceptTask}
                            onDecline={openDeclineModal}
                            onUpdateProgress={handleUpdateProgress}
                            variant="secondary"
                        />
                    )}

                    {/* Declined Tasks */}
                    {groupedTasks.declined.length > 0 && (
                        <TaskSection
                            title="Declined Tasks"
                            tasks={groupedTasks.declined}
                            icon={<XCircle className="w-5 h-5" />}
                            emptyMessage="No declined tasks"
                            onAccept={handleAcceptTask}
                            onDecline={openDeclineModal}
                            onUpdateProgress={handleUpdateProgress}
                            variant="warning"
                            collapsible
                            collapsed={collapsedSections.declined}
                            onToggle={() => toggleSection('declined')}
                        />
                    )}

                    {/* Completed Tasks */}
                    <TaskSection
                        title="Completed Tasks"
                        tasks={groupedTasks.completed}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        emptyMessage="No completed tasks yet"
                        onAccept={handleAcceptTask}
                        onDecline={openDeclineModal}
                        onUpdateProgress={handleUpdateProgress}
                        variant="success"
                        collapsible
                        collapsed={collapsedSections.completed}
                        onToggle={() => toggleSection('completed')}
                    />
                </div>
            ) : (
                <AttendanceCalendar attendanceHistory={attendanceHistory} tasks={taskHistory} />
            )}

            {/* Decline Reason Modal */}
            <AnimatePresence>
                {declineModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setDeclineModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-500" />
                                    Decline Task
                                </h2>
                                <button onClick={() => setDeclineModal(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">
                                You are declining: <strong className="text-gray-800">{declineModal.title}</strong>
                            </p>
                            {declineError && (
                                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">{declineError}</div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Reason for declining <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none"
                                    placeholder="Please explain why you are declining this task..."
                                    rows={4}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setDeclineModal(null)}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeclineTask}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
                                >
                                    Confirm Decline
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Password Change Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <PasswordModal
                        passwordForm={passwordForm}
                        setPasswordForm={setPasswordForm}
                        passwordError={passwordError}
                        setPasswordError={setPasswordError}
                        passwordSuccess={passwordSuccess}
                        setPasswordSuccess={setPasswordSuccess}
                        onClose={() => {
                            setShowPasswordModal(false);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPasswordError('');
                            setPasswordSuccess('');
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Task Section Component
const TaskSection = ({ title, tasks, icon, emptyMessage, onAccept, onDecline, onUpdateProgress, variant = 'primary', collapsible = false, collapsed = false, onToggle }) => {
    const variantStyles = {
        primary: 'border-indigo-200 bg-indigo-50',
        danger: 'border-red-200 bg-red-50',
        secondary: 'border-gray-200 bg-gray-50',
        success: 'border-green-200 bg-green-50',
        warning: 'border-orange-200 bg-orange-50',
    };
    const titleColors = {
        primary: 'text-indigo-700',
        danger: 'text-red-700',
        secondary: 'text-gray-700',
        success: 'text-green-700',
        warning: 'text-orange-700',
    };

    return (
        <div className={`bg-white rounded-2xl border-2 ${variantStyles[variant]} overflow-hidden`}>
            <div
                className={`p-4 flex justify-between items-center ${collapsible ? 'cursor-pointer' : ''}`}
                onClick={collapsible ? onToggle : undefined}
            >
                <div className="flex items-center gap-3">
                    <div className={`${titleColors[variant]}`}>{icon}</div>
                    <h3 className={`font-bold ${titleColors[variant]}`}>{title} ({tasks.length})</h3>
                </div>
                {collapsible && (
                    <button className={`${titleColors[variant]}`}>
                        {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                )}
            </div>

            {!collapsed && (
                <div className="p-4 pt-0 space-y-3">
                    {tasks.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">{emptyMessage}</div>
                    ) : (
                        tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onAccept={onAccept}
                                onDecline={onDecline}
                                onUpdateProgress={onUpdateProgress}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// Task Card Component
const TaskCard = ({ task, onAccept, onDecline, onUpdateProgress }) => {
    const [localPct, setLocalPct] = useState(task.completion_percentage);
    const [isDragging, setIsDragging] = useState(false);

    // Sync if task updates externally
    useEffect(() => {
        if (!isDragging) setLocalPct(task.completion_percentage);
    }, [task.completion_percentage, isDragging]);

    const getStatusBadge = () => {
        const badges = {
            pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
            in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
            completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
            overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
            declined: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Declined' },
        };
        return badges[task.calculated_status || task.status] || badges.pending;
    };

    const badge = getStatusBadge();
    const isCompleted = task.calculated_status === 'completed' || task.status === 'completed';
    const isDeclined = task.calculated_status === 'declined' || task.status === 'declined';
    const isInProgress = task.status === 'in_progress' && !isCompleted;
    const isPending = (task.status === 'pending' || task.calculated_status === 'pending') && !isCompleted && !isDeclined;

    const handleSliderRelease = () => {
        setIsDragging(false);
        onUpdateProgress(task.id, localPct);
    };

    return (
        <motion.div layout className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${badge.bg} ${badge.text}`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                        isDeclined ? <XCircle className="w-5 h-5" /> :
                            <Clock className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-gray-800">{task.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge.bg} ${badge.text}`}>
                            {badge.label}
                        </span>
                        {task.task_type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-600">
                                {task.task_type === 'daily' ? 'Daily' : 'Custom'}
                            </span>
                        )}
                    </div>

                    {task.description && (
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Assigned: {task.assigned_date ? format(parseISO(task.assigned_date), 'MMM dd, yyyy') : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Due: {task.due_date ? format(parseISO(task.due_date), 'MMM dd, yyyy') : 'N/A'}</span>
                        </div>
                        {task.completed_date && (
                            <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed: {format(parseISO(task.completed_date), 'MMM dd, yyyy')}</span>
                            </div>
                        )}
                    </div>

                    {/* Decline reason shown on declined tasks */}
                    {isDeclined && task.reason && (
                        <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                            <p className="text-xs text-orange-700 font-medium">
                                Your reason: <span className="font-normal">{task.reason}</span>
                            </p>
                            <p className="text-xs text-orange-500 mt-0.5">Waiting for admin to review your decline.</p>
                        </div>
                    )}

                    {/* Admin rejection note shown if decline was rejected */}
                    {task.admin_note && !isDeclined && !isCompleted && (
                        <div className="mt-3 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-indigo-700">
                                <span className="font-bold">Admin Feedback:</span> {task.admin_note}
                            </p>
                        </div>
                    )}

                    {/* Progress slider — only for in_progress tasks */}
                    {isInProgress && (
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-gray-600">Your Progress</span>
                                <span className="text-xs font-bold text-indigo-600">{localPct}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={localPct}
                                onChange={(e) => { setIsDragging(true); setLocalPct(parseInt(e.target.value)); }}
                                onMouseUp={handleSliderRelease}
                                onTouchEnd={handleSliderRelease}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: completion bar + action buttons */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* Completion bar (read-only display) */}
                    <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : isDeclined ? 'bg-orange-400' : 'bg-indigo-500'}`}
                            style={{ width: `${task.completion_percentage}%` }}
                        />
                    </div>
                    <span className="font-bold text-sm text-gray-700">{task.completion_percentage}%</span>

                    {/* Accept / Decline buttons for pending tasks */}
                    {isPending && (
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={() => onAccept(task.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
                                title="Accept Task"
                            >
                                <ThumbsUp className="w-3 h-3" />
                                Accept
                            </button>
                            <button
                                onClick={() => onDecline(task)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all font-semibold"
                                title="Decline Task"
                            >
                                <ThumbsDown className="w-3 h-3" />
                                Decline
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Password Modal Component
const PasswordModal = ({ passwordForm, setPasswordForm, passwordError, setPasswordError, passwordSuccess, setPasswordSuccess, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Lock className="w-6 h-6" />
                        Change Password
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {passwordSuccess && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">{passwordSuccess}</div>
                )}
                {passwordError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{passwordError}</div>
                )}

                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setPasswordError('');
                        setPasswordSuccess('');
                        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                            setPasswordError('New passwords do not match');
                            return;
                        }
                        if (passwordForm.newPassword.length < 6) {
                            setPasswordError('Password must be at least 6 characters long');
                            return;
                        }
                        try {
                            await api.put('/auth/password', {
                                currentPassword: passwordForm.currentPassword,
                                newPassword: passwordForm.newPassword
                            });
                            setPasswordSuccess('Password changed successfully!');
                            setTimeout(() => { onClose(); }, 2000);
                        } catch (err) {
                            setPasswordError(err.response?.data?.message || 'Failed to change password');
                        }
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                        <input type="password" required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter current password" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                        <input type="password" required value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Minimum 6 characters" minLength={6} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" required value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Confirm new password" minLength={6} />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all">Change Password</button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default EmployeeDashboard;
