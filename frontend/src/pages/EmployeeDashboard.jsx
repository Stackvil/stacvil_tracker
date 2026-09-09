import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    CheckCircle2, Clock, AlertCircle, Plus, Check, RefreshCw,
    X, FileText, ChevronDown, ChevronUp, Layers, TrendingUp,
    Calendar, ArrowRight, ShieldCheck, Zap, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { getNextWorksheetMilestone } from '../utils/milestones';

const EmployeeDashboard = () => {
    const { user } = useContext(AuthContext);
    const isSupervisor = user?.emp_no === '202601' || user?.emp_no === '202602' || user?.role === 'manager' || user?.role === 'hr';
    const [groupedTasks, setGroupedTasks] = useState({
        today: [], pending: [], overdue: [], declined: [], completed: []
    });
    const [loading, setLoading] = useState(true);

    // Dynamic milestone info (10 AM, 1 PM, 4 PM, 7 PM)
    const [milestoneInfo, setMilestoneInfo] = useState(getNextWorksheetMilestone);

    // Modals & Forms
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [addTaskLoading, setAddTaskLoading] = useState(false);
    const [addTaskError, setAddTaskError] = useState('');

    const [collapsedSections, setCollapsedSections] = useState({ completed: true, declined: false });
    const [declineModal, setDeclineModal] = useState(null);
    const [declineReason, setDeclineReason] = useState('');
    const [declineError, setDeclineError] = useState('');

    useEffect(() => {
        fetchTasks();

        const timer = setInterval(() => {
            setMilestoneInfo(getNextWorksheetMilestone());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await api.get('/tasks/employee');
            const tasks = res.data || [];

            const grouped = {
                today: [],
                pending: [],
                overdue: [],
                declined: [],
                completed: []
            };

            tasks.forEach(task => {
                if (task.status === 'completed') {
                    grouped.completed.push(task);
                } else if (task.status === 'declined') {
                    grouped.declined.push(task);
                } else if (task.is_overdue) {
                    grouped.overdue.push(task);
                } else if (task.is_today) {
                    grouped.today.push(task);
                } else {
                    grouped.pending.push(task);
                }
            });

            setGroupedTasks(grouped);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            await api.put(`/tasks/${taskId}`, {
                action: 'complete',
                completion_percentage: 100
            });
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to complete task');
        }
    };

    const handleDeclineTask = async () => {
        if (!declineReason.trim()) {
            setDeclineError('Please provide a reason for declining.');
            return;
        }

        try {
            await api.put(`/tasks/${declineModal._id}`, {
                action: 'decline',
                reason: declineReason
            });
            setDeclineModal(null);
            fetchTasks();
        } catch (error) {
            setDeclineError(error.response?.data?.message || 'Failed to decline task');
        }
    };

    const handleSelfAssignTask = async (e) => {
        e.preventDefault();
        if (!newTask.title.trim()) {
            setAddTaskError('Task title is required');
            return;
        }

        setAddTaskLoading(true);
        setAddTaskError('');

        try {
            await api.post('/tasks/self-assign', newTask);
            setNewTask({ title: '', description: '' });
            setShowAddTaskModal(false);
            fetchTasks();
        } catch (error) {
            setAddTaskError(error.response?.data?.message || 'Failed to create task');
        } finally {
            setAddTaskLoading(false);
        }
    };

    const formatTimer = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Sleek Enterprise Top Bar (No cheap gradient banner) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Work Session</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {user?.full_name || user?.name || 'Engineer'}'s Workspace
                    </h1>
                    <p className="text-xs text-gray-500">
                        Manage your active sprint tasks, track progress milestones, and log 3-hour worksheet deliverables.
                    </p>
                </div>

                {/* Quick 3-Hour Cycle Status Pill */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block leading-tight">Next Update ({milestoneInfo.slotTime})</span>
                            <span className="font-mono text-xs font-black text-gray-800">{milestoneInfo.formatted}</span>
                        </div>
                    </div>

                    <Link
                        to="/worksheets"
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Worksheets Hub</span>
                    </Link>

                    {isSupervisor && (
                        <Link
                            to="/worksheets?tab=team"
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            <span>Monitor Team Work</span>
                        </Link>
                    )}

                    <button
                        onClick={() => setShowAddTaskModal(true)}
                        className="px-4 py-2.5 bg-gray-900 hover:bg-black active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Self-Assign Task</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today's Tasks</span>
                    <h3 className="text-2xl font-black text-gray-900">{groupedTasks.today.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</span>
                    <h3 className="text-2xl font-black text-emerald-600">{groupedTasks.completed.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending / Queue</span>
                    <h3 className="text-2xl font-black text-indigo-600">{groupedTasks.pending.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overdue</span>
                    <h3 className="text-2xl font-black text-rose-600">{groupedTasks.overdue.length}</h3>
                </div>
            </div>

            {/* Tasks Content */}
            <div className="space-y-6">
                {/* Active Today Tasks */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            <span>Today's Active Tasks ({groupedTasks.today.length})</span>
                        </h2>
                    </div>

                    {groupedTasks.today.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-gray-200/80 text-center text-gray-400 text-xs italic">
                            No active tasks assigned for today. Click "Self-Assign Task" to start a new work deliverable.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupedTasks.today.map(task => (
                                <div key={task._id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 hover:border-indigo-200 transition-all flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-gray-900 text-sm">{task.title}</h3>
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                {task.status || 'Active'}
                                            </span>
                                        </div>
                                        {task.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{task.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                                        <span className="font-mono text-gray-400 text-[10px]">Due: {task.due_date || 'Today'}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleCompleteTask(task._id)}
                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Mark Done</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Overdue Tasks if any */}
                {groupedTasks.overdue.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Overdue Tasks ({groupedTasks.overdue.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupedTasks.overdue.map(task => (
                                <div key={task._id} className="bg-rose-50/40 p-5 rounded-2xl border border-rose-200 shadow-sm space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-rose-900 text-sm">{task.title}</h3>
                                        <p className="text-xs text-rose-700 line-clamp-2">{task.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-rose-100">
                                        <span className="font-mono text-rose-600 text-[10px]">Overdue Date: {task.due_date}</span>
                                        <button
                                            onClick={() => handleCompleteTask(task._id)}
                                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                                        >
                                            Complete Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed Tasks Accordion */}
                <div className="space-y-2">
                    <button
                        onClick={() => setCollapsedSections(prev => ({ ...prev, completed: !prev.completed }))}
                        className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl text-xs font-bold text-gray-700 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Completed Tasks ({groupedTasks.completed.length})</span>
                        </div>
                        {collapsedSections.completed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>

                    {!collapsedSections.completed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {groupedTasks.completed.map(task => (
                                <div key={task._id} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-1 opacity-75">
                                    <h4 className="font-bold text-gray-800 text-xs line-through">{task.title}</h4>
                                    <span className="text-[10px] text-emerald-600 font-semibold">Completed Successfully</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SELF ASSIGN TASK MODAL */}
            <AnimatePresence>
                {showAddTaskModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-gray-100"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <h3 className="text-base font-bold text-gray-900">Self-Assign Task</h3>
                                <button onClick={() => setShowAddTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {addTaskError && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
                                    {addTaskError}
                                </div>
                            )}

                            <form onSubmit={handleSelfAssignTask} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Task Title *</label>
                                    <input
                                        type="text"
                                        placeholder="What deliverable are you tackling?"
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Description / Notes</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Add scope, requirements, or links..."
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddTaskModal(false)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addTaskLoading}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                                    >
                                        {addTaskLoading ? 'Saving...' : 'Add to Workspace'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmployeeDashboard;
