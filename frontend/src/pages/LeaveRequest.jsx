import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    Calendar, Clock, AlertCircle, CheckCircle2, XCircle,
    Send, CalendarPlus, ChevronRight, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';

const LeaveRequest = () => {
    const { user, logout } = useContext(AuthContext);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        type: 'single',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        fetchMyLeaves();
    }, []);

    const fetchMyLeaves = async () => {
        try {
            const response = await api.get('/leaves/my-leaves');
            setLeaves(response.data);
        } catch (error) {
            console.error('Failed to fetch leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        // Basic validation
        if (!formData.start_date || !formData.reason) {
            setError('Please fill in all required fields');
            setSubmitting(false);
            return;
        }

        if (formData.type === 'multiple' && !formData.end_date) {
            setError('Please select an end date for multiple days leave');
            setSubmitting(false);
            return;
        }

        if (formData.type === 'multiple' && isAfter(parseISO(formData.start_date), parseISO(formData.end_date))) {
            setError('End date cannot be before start date');
            setSubmitting(false);
            return;
        }

        try {
            await api.post('/leaves/apply', formData);
            setSuccess('Leave application submitted successfully!');
            setFormData({ type: 'single', start_date: '', end_date: '', reason: '' });

            if (user.isRestricted) {
                setTimeout(() => {
                    logout();
                }, 2000);
            } else {
                fetchMyLeaves();
                setTimeout(() => setSuccess(''), 5000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit leave application');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <header className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarPlus className="w-7 h-7 text-indigo-600" />
                        Leave Management
                    </h1>
                    <p className="text-gray-500">Apply for leaves and track your requests.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Apply for Leave Form */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-500" />
                        New Leave Request
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> {success}
                            </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Leave Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="single">Single Day</option>
                                    <option value="multiple">Multiple Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    {formData.type === 'single' ? 'Date' : 'Start Date'}
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    required
                                    value={formData.start_date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            {formData.type === 'multiple' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        required
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Leave</label>
                            <textarea
                                name="reason"
                                required
                                value={formData.reason}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Please provide a brief reason..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Submit Application
                        </button>
                    </form>
                </section>

                {/* Status and History */}
                <section className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Application History
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-12"><Clock className="animate-spin text-indigo-600" /></div>
                        ) : leaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Calendar className="w-12 h-12 mb-2 opacity-20" />
                                <p className="italic font-medium">No leave records found</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {leaves.map((leave) => (
                                    <div key={leave._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-indigo-100 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    leave.status === 'declined' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {leave.status}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-wider">
                                                    {leave.type === 'single' ? 'Single' : 'Range'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">ID: {leave._id.slice(-6).toUpperCase()}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                            <Calendar className="w-4 h-4 text-indigo-400" />
                                            {format(parseISO(leave.start_date), 'MMM dd, yyyy')}
                                            {leave.type === 'multiple' && (
                                                <>
                                                    <ChevronRight className="w-3 h-3 text-gray-300" />
                                                    {format(parseISO(leave.end_date), 'MMM dd, yyyy')}
                                                </>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-600 line-clamp-2 italic mb-3">"{leave.reason}"</p>

                                        {leave.admin_note && (
                                            <div className="mt-3 p-2 bg-white rounded-lg border border-gray-100 flex items-start gap-2">
                                                <Info className="w-3 h-3 text-indigo-400 mt-0.5" />
                                                <p className="text-[10px] text-indigo-700"><span className="font-bold">Admin Note:</span> {leave.admin_note}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LeaveRequest;
