import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { User, Mail, Shield, Search, Filter, Plus, Briefcase, X, Calendar, Trash2, ClipboardList, CheckCircle2, Clock, AlertCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AttendanceCalendar from '../components/AttendanceCalendar';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(null); // emp_no
    const [adminTasks, setAdminTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [showTasksSection, setShowTasksSection] = useState(true);

    const [createForm, setCreateForm] = useState({
        emp_no: '', name: '', email: '', password: '', role: 'employee'
    });

    // Simplified assign form — no dates, no percentage
    const [assignForm, setAssignForm] = useState({
        title: '',
        description: '',
        task_type: 'daily', // 'daily' or 'custom'
        due_date: ''
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAttendanceModal, setShowAttendanceModal] = useState(null);
    const [employeeAttendance, setEmployeeAttendance] = useState([]);
    const [employeeTasks, setEmployeeTasks] = useState([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(null);

    useEffect(() => {
        fetchEmployees();
        fetchAdminTasks();
        const interval = setInterval(() => {
            fetchEmployees();
            fetchAdminTasks();
        }, 30000); // auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/admin/employees');
            setEmployees(response.data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdminTasks = async () => {
        setLoadingTasks(true);
        try {
            const response = await api.get('/admin/tasks');
            setAdminTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch admin tasks:', error);
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post('/admin/employees', createForm);
            setSuccess('Employee created successfully!');
            setShowCreateModal(false);
            setCreateForm({ emp_no: '', name: '', email: '', password: '', role: 'employee' });
            fetchEmployees();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create employee');
        }
    };

    const handleAssignTask = async (e, emp_no) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (assignForm.task_type === 'custom' && !assignForm.due_date) {
            setError('Please select a due date for custom tasks');
            return;
        }

        try {
            await api.post('/admin/tasks/assign', { ...assignForm, emp_no });
            setSuccess('Task assigned successfully!');
            setShowAssignModal(null);
            setAssignForm({ title: '', description: '', task_type: 'daily', due_date: '' });
            fetchAdminTasks();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign task');
        }
    };

    const handleAcceptDecline = async (taskId) => {
        try {
            await api.delete(`/admin/tasks/${taskId}`);
            setSuccess('Task removed successfully');
            fetchAdminTasks();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove task');
        }
    };

    const fetchEmployeeAttendance = async (emp_no) => {
        setLoadingAttendance(true);
        try {
            const response = await api.get(`/attendance/admin/history/${emp_no}`);
            setEmployeeAttendance(response.data.attendance);
            setEmployeeTasks(response.data.tasks);
            setShowAttendanceModal(emp_no);
        } catch (err) {
            setError('Failed to fetch attendance records');
        } finally {
            setLoadingAttendance(false);
        }
    };

    const handleDeleteEmployee = async (emp_no) => {
        setError('');
        setSuccess('');
        try {
            await api.delete(`/admin/employees/${emp_no}`);
            setSuccess('Employee deleted successfully!');
            setShowDeleteModal(null);
            fetchEmployees();
            fetchAdminTasks();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete employee');
            setShowDeleteModal(null);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.emp_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        const map = {
            pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending', icon: Clock },
            in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: Clock },
            completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed', icon: CheckCircle2 },
            overdue: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Overdue', icon: AlertCircle },
            declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined', icon: XCircle },
        };
        return map[status] || map.pending;
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Directory...</div>;

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* Success/Error Messages */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">{success}</div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Employee
                    </button>
                    <button className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-all flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((emp) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={emp.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-14 h-14 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-bold">
                                    {emp.name.charAt(0)}
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {emp.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{emp.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">ID: {emp.emp_no}</p>
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {emp.email}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Shield className="w-4 h-4 text-gray-400" />
                                    <span className="capitalize">{emp.role}</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-50 flex justify-between gap-2">
                            <button
                                onClick={() => setShowDeleteModal(emp.emp_no)}
                                className="text-sm font-bold text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchEmployeeAttendance(emp.emp_no)}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-all flex items-center gap-1"
                                >
                                    <Calendar className="w-3 h-3" />
                                    Attendance
                                </button>
                                <button
                                    onClick={() => { setShowAssignModal(emp.emp_no); setError(''); }}
                                    className="text-sm font-bold text-gray-600 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-1"
                                >
                                    <Briefcase className="w-3 h-3" />
                                    Assign Task
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Assigned Tasks Section ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div
                    className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setShowTasksSection(v => !v)}
                >
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-gray-800">
                            Assigned Tasks
                            <span className="ml-2 text-sm font-normal text-gray-400">({adminTasks.length})</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); fetchAdminTasks(); }}
                            className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                            Refresh
                        </button>
                        {showTasksSection ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                </div>

                {showTasksSection && (
                    <div className="border-t border-gray-100">
                        {loadingTasks ? (
                            <div className="p-8 text-center text-gray-400">Loading tasks...</div>
                        ) : adminTasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">No tasks assigned yet</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {adminTasks.map(task => {
                                    const badge = getStatusBadge(task.status);
                                    const BadgeIcon = badge.icon;
                                    return (
                                        <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${badge.bg} ${badge.text}`}>
                                                <BadgeIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-gray-800 text-sm">{task.title}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge.bg} ${badge.text}`}>
                                                        {badge.label}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-600">
                                                        {task.task_type === 'daily' ? 'Daily' : 'Custom'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Employee: <span className="font-semibold text-gray-700">{task.emp_name}</span>
                                                    {' · '}Due: <span className="font-semibold">{task.due_date}</span>
                                                </p>
                                                {task.description && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                                                )}
                                                {task.status === 'declined' && task.reason && (
                                                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                        <p className="text-xs text-red-700 font-medium">
                                                            Decline reason: <span className="font-normal">{task.reason}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                {/* Completion bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${task.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${task.completion_percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-600">{task.completion_percentage}%</span>
                                                </div>
                                                {/* Accept decline button */}
                                                {task.status === 'declined' && (
                                                    <button
                                                        onClick={() => handleAcceptDecline(task.id)}
                                                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
                                                    >
                                                        Accept Decline
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Employee Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <Modal
                        title="Create New Employee"
                        onClose={() => { setShowCreateModal(false); setCreateForm({ emp_no: '', name: '', email: '', password: '', role: 'employee' }); setError(''); }}
                    >
                        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>}
                        <form onSubmit={handleCreateEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Employee ID</label>
                                <input type="text" required value={createForm.emp_no} onChange={(e) => setCreateForm({ ...createForm, emp_no: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g., EMP001" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                                <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Full Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                                <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="email@company.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                <input type="password" required value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Minimum 6 characters" minLength={6} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                                <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setShowCreateModal(false); setError(''); }} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all">Create Employee</button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Assign Task Modal — simplified, no dates/percentage */}
            <AnimatePresence>
                {showAssignModal && (
                    <Modal
                        title={`Assign Task to ${employees.find(e => e.emp_no === showAssignModal)?.name || showAssignModal}`}
                        onClose={() => { setShowAssignModal(null); setAssignForm({ title: '', description: '', task_type: 'daily', due_date: '' }); setError(''); }}
                    >
                        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>}
                        <form onSubmit={(e) => handleAssignTask(e, showAssignModal)} className="space-y-4">
                            {/* Task Type Toggle */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Task Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAssignForm({ ...assignForm, task_type: 'daily', due_date: '' })}
                                        className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${assignForm.task_type === 'daily' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        <Clock className="w-5 h-5" />
                                        Daily Task
                                        <span className="text-[10px] font-normal opacity-70">Due today</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssignForm({ ...assignForm, task_type: 'custom' })}
                                        className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1 ${assignForm.task_type === 'custom' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        <Calendar className="w-5 h-5" />
                                        Custom Date
                                        <span className="text-[10px] font-normal opacity-70">Pick a due date</span>
                                    </button>
                                </div>
                            </div>

                            {/* Due date — only for custom */}
                            {assignForm.task_type === 'custom' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={today}
                                        value={assignForm.due_date}
                                        onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    value={assignForm.title}
                                    onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter task title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                                <textarea
                                    value={assignForm.description}
                                    onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Task description..."
                                    rows={3}
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                                <strong>Note:</strong> The employee will see this task and can accept or decline it. Only the employee can update the completion percentage.
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowAssignModal(null); setError(''); }} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all">Assign Task</button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Attendance View Modal */}
            <AnimatePresence>
                {showAttendanceModal && (
                    <Modal
                        title={`Attendance History - ${showAttendanceModal}`}
                        onClose={() => { setShowAttendanceModal(null); setEmployeeAttendance([]); }}
                        wide
                    >
                        <div className="max-h-[80vh] overflow-y-auto pr-2">
                            <AttendanceCalendar attendanceHistory={employeeAttendance} tasks={employeeTasks} />
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <Modal title="Delete Employee" onClose={() => setShowDeleteModal(null)}>
                        <div className="space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-red-800 font-medium">Are you sure you want to delete employee <strong>{showDeleteModal}</strong>?</p>
                                <p className="text-red-600 text-sm mt-2">This action cannot be undone. All attendance records and tasks will be permanently deleted.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all">Cancel</button>
                                <button onClick={() => handleDeleteEmployee(showDeleteModal)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all">Delete Employee</button>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

const Modal = ({ title, children, onClose, wide }) => (
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
            className={`bg-white rounded-2xl shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-md'} w-full p-6 max-h-[90vh] overflow-y-auto`}
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

export default EmployeeManagement;
