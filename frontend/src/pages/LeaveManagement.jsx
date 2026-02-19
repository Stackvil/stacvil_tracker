import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Calendar, Clock, CheckCircle2, XCircle, Info,
    Filter, Search, User, CalendarPlus, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';

const LeaveManagement = () => {
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for Grant Leave
    const [showGrantModal, setShowGrantModal] = useState(false);
    const [grantForm, setGrantForm] = useState({
        emp_no: '',
        type: 'single',
        start_date: '',
        end_date: '',
        reason: ''
    });
    const [grantLoading, setGrantLoading] = useState(false);
    const [grantError, setGrantError] = useState('');

    useEffect(() => {
        fetchLeaves();
        fetchEmployees();
    }, []);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const response = await api.get('/leaves/admin/all');
            setLeaves(response.data);
        } catch (error) {
            console.error('Failed to fetch leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/admin/employees');
            setEmployees(response.data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const handleUpdateStatus = async (id, status, note = '') => {
        try {
            await api.put(`/leaves/admin/update/${id}`, { status, admin_note: note });
            fetchLeaves();
        } catch (error) {
            alert('Failed to update leave status');
        }
    };

    const handleGrantLeave = async (e) => {
        e.preventDefault();
        setGrantLoading(true);
        setGrantError('');

        if (!grantForm.emp_no || !grantForm.start_date || !grantForm.reason) {
            setGrantError('Please fill in all required fields');
            setGrantLoading(false);
            return;
        }

        try {
            await api.post('/leaves/admin/grant', grantForm);
            setShowGrantModal(false);
            setGrantForm({ emp_no: '', type: 'single', start_date: '', end_date: '', reason: '' });
            fetchLeaves();
        } catch (error) {
            setGrantError(error.response?.data?.message || 'Failed to grant leave');
        } finally {
            setGrantLoading(false);
        }
    };

    const filteredLeaves = leaves.filter(leave => {
        const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;
        const matchesSearch = leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            leave.emp_no.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarPlus className="w-7 h-7 text-indigo-600" />
                        Leave Requests
                    </h1>
                    <p className="text-gray-500">Manage employee leave applications and grant leaves.</p>
                </div>
                <button
                    onClick={() => setShowGrantModal(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                >
                    <CalendarPlus className="w-5 h-5" />
                    Grant Direct Leave
                </button>
            </header>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                    />
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
                    {['pending', 'approved', 'declined', 'all'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filterStatus === status ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leave Requests Table/Cards */}
            {loading ? (
                <div className="flex justify-center py-20"><Clock className="animate-spin text-indigo-600 w-10 h-10" /></div>
            ) : filteredLeaves.length === 0 ? (
                <div className="bg-white rounded-2xl p-20 border border-gray-100 shadow-sm text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-medium italic">No leave requests matching your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredLeaves.map((leave) => (
                        <LeaveCard
                            key={leave._id}
                            leave={leave}
                            onUpdate={handleUpdateStatus}
                        />
                    ))}
                </div>
            )}

            {/* Grant Leave Modal */}
            <AnimatePresence>
                {showGrantModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
                        >
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <CalendarPlus className="w-6 h-6 text-indigo-600" />
                                Grant Direct Leave
                            </h2>

                            <form onSubmit={handleGrantLeave} className="space-y-4">
                                {grantError && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {grantError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Employee</label>
                                    <select
                                        value={grantForm.emp_no}
                                        onChange={(e) => setGrantForm({ ...grantForm, emp_no: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    >
                                        <option value="">Choose an employee...</option>
                                        {employees.map(emp => (
                                            <option key={emp.emp_no} value={emp.emp_no}>
                                                {emp.name} (#{emp.emp_no})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                                        <select
                                            value={grantForm.type}
                                            onChange={(e) => setGrantForm({ ...grantForm, type: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="single">Single Day</option>
                                            <option value="multiple">Multiple Days</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={grantForm.start_date}
                                            onChange={(e) => setGrantForm({ ...grantForm, start_date: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {grantForm.type === 'multiple' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={grantForm.end_date}
                                            onChange={(e) => setGrantForm({ ...grantForm, end_date: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Note</label>
                                    <textarea
                                        value={grantForm.reason}
                                        onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        rows={3}
                                        placeholder="Reason for granting leave..."
                                        required
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowGrantModal(false)}
                                        className="flex-1 py-3 px-6 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={grantLoading}
                                        className="flex-1 py-3 px-6 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {grantLoading ? <Clock className="w-5 h-5 animate-spin" /> : 'Grant Leave'}
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

const LeaveCard = ({ leave, onUpdate }) => {
    const [note, setNote] = useState('');
    const [showNoteField, setShowNoteField] = useState(false);

    return (
        <motion.div layout className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg">
                            {leave.employeeName.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">{leave.employeeName}</h4>
                            <p className="text-xs text-gray-400 font-medium">#{leave.emp_no}</p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                            leave.status === 'declined' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                        }`}>
                        {leave.status}
                    </span>
                </div>

                <div className="flex items-center gap-4 py-2 border-y border-gray-50">
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Leave Type</p>
                        <p className="text-sm font-bold text-gray-700 capitalize">{leave.type}</p>
                    </div>
                    <div className="flex-[2]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dates</p>
                        <p className="text-sm font-bold text-gray-700">
                            {format(parseISO(leave.start_date), 'MMM dd')}
                            {leave.type === 'multiple' && ` - ${format(parseISO(leave.end_date), 'MMM dd')}`}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reason</p>
                    <p className="text-sm text-gray-600 italic">"{leave.reason}"</p>
                </div>

                {leave.admin_note && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-50 flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                        <p className="text-xs text-indigo-700"><span className="font-bold">Admin Note:</span> {leave.admin_note}</p>
                    </div>
                )}
            </div>

            {leave.status === 'pending' && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                    {showNoteField ? (
                        <div className="space-y-2">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Add a note (optional)..."
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onUpdate(leave._id, 'approved', note)}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all"
                                >
                                    Approve with Note
                                </button>
                                <button
                                    onClick={() => onUpdate(leave._id, 'declined', note)}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                                >
                                    Decline with Note
                                </button>
                                <button
                                    onClick={() => setShowNoteField(false)}
                                    className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-300 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onUpdate(leave._id, 'approved')}
                                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-md shadow-green-100 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Approve
                            </button>
                            <button
                                onClick={() => onUpdate(leave._id, 'declined')}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-100 flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Decline
                            </button>
                            <button
                                onClick={() => setShowNoteField(true)}
                                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all"
                            >
                                Note
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default LeaveManagement;
