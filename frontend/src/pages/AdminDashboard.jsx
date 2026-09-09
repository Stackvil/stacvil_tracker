import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api, { SOCKET_URL, API_URL } from '../services/api';
import { Link } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, Title,
    Tooltip as ChartTooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import { Bar as BarComponent, Pie as PieComponent } from 'react-chartjs-2';
import {
    Users, CheckCircle, Clock, TrendingUp, ArrowRight,
    CheckCircle2, XCircle, AlertCircle, ClipboardList, LogOut, Wifi, WifiOff,
    FileText, Plus, Send, RefreshCw, X, MessageSquare, ShieldCheck, Upload,
    Download, Paperclip, User, Globe, File, Star, FileSpreadsheet,
    CheckCheck, ExternalLink, Award, Sparkles, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [employeesList, setEmployeesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminating, setTerminating] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 3-Hour Interval / Worksheet Updates
    const [intervalUpdates, setIntervalUpdates] = useState([]);
    const [worksheetFilterEmp, setWorksheetFilterEmp] = useState('all');
    const [latestUpdateNotification, setLatestUpdateNotification] = useState(null);

    // Worksheet Rating Modal States
    const [ratingModalItem, setRatingModalItem] = useState(null);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingFeedback, setRatingFeedback] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingSuccess, setRatingSuccess] = useState('');

    // Company Documents Management
    const [documents, setDocuments] = useState([]);
    const [showDocModal, setShowDocModal] = useState(false);
    const [docForm, setDocForm] = useState({
        title: '',
        category: 'Company Policy',
        content: '',
        target_type: 'all',
        target_emp_no: '',
        target_employee_name: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [docSubmitting, setDocSubmitting] = useState(false);
    const [docSuccess, setDocSuccess] = useState('');
    const fileInputRef = useRef(null);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    useEffect(() => {
        fetchAll();
        fetchDocuments();
        fetchIntervalUpdates();
        fetchEmployees();

        const socket = io(SOCKET_URL);
        socket.emit('join_room', 'ADMIN001');

        socket.on('attendance_updated', () => {
            fetchAll();
        });

        socket.on('task_updated', () => {
            fetchAll();
        });

        socket.on('work_update_received', (data) => {
            fetchIntervalUpdates();
            setLatestUpdateNotification(data);
            setTimeout(() => setLatestUpdateNotification(null), 8000);
        });

        socket.on('document_updated', () => {
            fetchDocuments();
        });

        const interval = setInterval(() => {
            fetchAll();
            fetchIntervalUpdates();
        }, 15000);

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, []);

    const fetchAll = async () => {
        try {
            const [reportRes, analyticsRes, leavesRes] = await Promise.all([
                api.get(`/admin/reports/daily?date=${today}`),
                api.get('/admin/analytics'),
                api.get('/leaves/admin/all')
            ]);

            setTodayReport(reportRes.data.attendance_logs || []);
            setStats(analyticsRes.data);

            const pending = (leavesRes.data || []).filter(l => l.status === 'Pending');
            setLeavesToday(pending);
        } catch (error) {
            console.error('Failed to fetch admin dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/admin/employees');
            setEmployeesList(res.data || []);
        } catch (e) {
            console.error('Failed to fetch employees list:', e);
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/admin/documents');
            setDocuments(res.data || []);
        } catch (e) {
            console.error('Failed to fetch documents:', e);
        }
    };

    const fetchIntervalUpdates = async () => {
        try {
            const res = await api.get('/admin/interval-updates?date=all');
            setIntervalUpdates(res.data || []);
        } catch (e) {
            console.error('Failed to fetch interval updates:', e);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleCreateDocument = async (e) => {
        e.preventDefault();
        if (!docForm.title.trim()) {
            alert('Please enter a document title');
            return;
        }

        setDocSubmitting(true);
        setDocSuccess('');

        try {
            const formData = new FormData();
            formData.append('title', docForm.title);
            formData.append('category', docForm.category);
            formData.append('content', docForm.content);
            formData.append('target_type', docForm.target_type);
            formData.append('target_emp_no', docForm.target_emp_no || '');
            formData.append('target_employee_name', docForm.target_employee_name || '');
            
            if (selectedFile) {
                formData.append('attachment', selectedFile);
            }

            await api.post('/admin/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setDocSuccess(
                docForm.target_type === 'specific'
                    ? `Document sent specifically to ${docForm.target_employee_name || docForm.target_emp_no}!`
                    : 'Document published and broadcast to all employees!'
            );

            fetchDocuments();
            setTimeout(() => {
                setShowDocModal(false);
                setDocForm({
                    title: '',
                    category: 'Company Policy',
                    content: '',
                    target_type: 'all',
                    target_emp_no: '',
                    target_employee_name: ''
                });
                setSelectedFile(null);
                setDocSuccess('');
            }, 1200);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to publish document');
        } finally {
            setDocSubmitting(false);
        }
    };

    const handleDeleteDocument = async (id) => {
        if (!window.confirm('Delete this company document?')) return;
        try {
            await api.delete(`/admin/documents/${id}`);
            fetchDocuments();
        } catch (err) {
            alert('Failed to delete document');
        }
    };

    const handleDownloadDocument = async (doc) => {
        try {
            const token = localStorage.getItem('token');
            const downloadUrl = `${API_URL}/documents/download/${doc._id || doc.id}?token=${token || ''}`;
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', doc.attachment_name || `${doc.title}.txt`);
            link.setAttribute('target', '_blank');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('Failed to start download');
        }
    };

    // Open Rating Modal for a Worksheet
    const handleOpenRatingModal = (updateItem) => {
        setRatingModalItem(updateItem);
        setRatingValue(updateItem.admin_rating || 5);
        setRatingFeedback(updateItem.admin_feedback || '');
        setRatingSuccess('');
    };

    // Submit Worksheet Rating & Feedback
    const handleSubmitRating = async (e) => {
        e.preventDefault();
        if (!ratingModalItem) return;

        setRatingSubmitting(true);
        setRatingSuccess('');

        try {
            await api.put(`/admin/interval-updates/${ratingModalItem._id}/rate`, {
                rating: Number(ratingValue),
                feedback: ratingFeedback
            });

            setRatingSuccess(`Rated ${ratingValue} Stars and sent feedback privately to ${ratingModalItem.employeeName}!`);
            fetchIntervalUpdates();

            setTimeout(() => {
                setRatingModalItem(null);
                setRatingSuccess('');
            }, 1200);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit rating');
        } finally {
            setRatingSubmitting(false);
        }
    };

    // 1-Click Export Worksheets to Excel (.xlsx / .csv)
    const handleExportWorksheets = () => {
        const token = localStorage.getItem('token');
        const empQuery = worksheetFilterEmp !== 'all' ? `&emp_no=${worksheetFilterEmp}` : '';
        const exportUrl = `${API_URL}/admin/worksheets/export?date=all${empQuery}&token=${token || ''}`;
        
        const link = document.createElement('a');
        link.href = exportUrl;
        link.setAttribute('download', `Stackvil_Worksheets_${Date.now()}.csv`);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to end session');
        }
    };

    const handlePillClick = (category) => {
        let list = [];
        let title = '';

        switch (category) {
            case 'Online':
                list = todayReport.filter(r => r.presence_status === 'online');
                title = 'Currently Online Employees';
                break;
            case 'Present':
                list = todayReport.filter(r => r.session_status === 'Active' || r.session_status === 'Completed');
                title = 'Present Employees Today';
                break;
            case 'On Leave':
                list = leavesToday.map(l => ({ name: l.name, emp_no: l.emp_no, login_time: `Applied for ${l.leave_type}` }));
                title = 'Employees on Leave Today';
                break;
            case 'Absent':
                list = todayReport.filter(r => r.session_status === 'Absent');
                title = 'Absent Employees Today';
                break;
            case 'Active Now':
                list = todayReport.filter(r => r.session_status === 'Active');
                title = 'Currently Active Working Sessions';
                break;
            case 'Tasks Done':
                list = todayReport.filter(r => r.status === 'completed');
                title = 'Employees Completed Tasks Today';
                break;
            default:
                break;
        }

        setSelectedCategory({ title, list });
        setIsModalOpen(true);
    };

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isHR = currentUser.emp_no === 'ADMIN002' || currentUser.emp_no === '202602' || currentUser.role === 'hr';
    const visibleWorksheetEmployees = isHR 
        ? employeesList.filter(emp => emp.emp_no !== '202601')
        : employeesList;

    // Filtered worksheets
    const filteredWorksheets = worksheetFilterEmp === 'all'
        ? (isHR ? intervalUpdates.filter(u => u.emp_no !== '202601') : intervalUpdates)
        : intervalUpdates.filter(u => u.emp_no === worksheetFilterEmp);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const activeNow = todayReport.filter(r => r.session_status === 'Active').length;
    const presentToday = todayReport.filter(r => r.session_status === 'Active' || r.session_status === 'Completed').length;
    const completedToday = todayReport.filter(r => r.status === 'completed').length;
    const totalEmployees = employeesList.length || 1;
    const absentTodayCount = Math.max(0, totalEmployees - presentToday - leavesToday.length);

    return (
        <div className="space-y-8">
            {/* LIVE NOTIFICATION BANNER */}
            <AnimatePresence>
                {latestUpdateNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-indigo-900 text-white rounded-2xl shadow-xl flex items-center justify-between border border-indigo-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Sparkles className="w-5 h-5 text-amber-300" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-amber-300 uppercase">New 3-Hour Worksheet Received</h4>
                                <p className="text-sm font-medium">{latestUpdateNotification.message}</p>
                            </div>
                        </div>
                        <button onClick={() => setLatestUpdateNotification(null)} className="text-white/60 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOP STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Active Working" value={activeNow} icon={Users} color="bg-indigo-600" />
                <StatCard title="Present Today" value={presentToday} icon={CheckCircle} color="bg-green-600" />
                <StatCard title="Worksheets Logged" value={intervalUpdates.length} icon={Clock} color="bg-purple-600" />
                <StatCard title="Published Documents" value={documents.length} icon={FileText} color="bg-amber-600" />
            </div>

            {/* SECTION 1: 3-HOUR WORKSHEETS, PROOFS & RATINGS HUB (WITH EXCEL EXPORT) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">3-Hour Worksheets & Performance Evaluations</h2>
                            <p className="text-xs text-gray-400">Review employee proof files, rate performance (1-5 ⭐), and export to Excel spreadsheet</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Employee Filter */}
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                            <select
                                value={worksheetFilterEmp}
                                onChange={(e) => setWorksheetFilterEmp(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-700 outline-none"
                            >
                                <option value="all">
                                    {isHR ? 'All Monitored Staff' : 'All Employees'} ({isHR ? intervalUpdates.filter(u => u.emp_no !== '202601').length : intervalUpdates.length})
                                </option>
                                {visibleWorksheetEmployees.map(emp => (
                                    <option key={emp.emp_no} value={emp.emp_no}>
                                        {emp.full_name || emp.name} (#{emp.emp_no})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isHR && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                🛡️ HR Access (Manager Monitored by Super Admin)
                            </span>
                        )}

                        {/* 1-Click Excel Export Button */}
                        <button
                            onClick={handleExportWorksheets}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition-all"
                            title="Export all worksheets to Excel format"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Export to Excel (.xlsx)</span>
                        </button>
                    </div>
                </div>

                {filteredWorksheets.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-400 font-medium italic">
                        No 3-hour worksheets logged yet for the selected filter.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredWorksheets.map(item => (
                            <div key={item._id} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3 hover:border-indigo-200 transition-all flex flex-col justify-between">
                                <div className="space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="font-black text-xs text-gray-800">{item.employeeName}</span>
                                            <span className="text-[10px] font-mono text-gray-400 block">ID: #{item.emp_no} • {item.department || 'Engineering'}</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                            {item.date} {item.time}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-indigo-900">{item.task_title || '3-Hour Milestone Progress'}</h4>
                                        <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">{item.work_done}</p>
                                    </div>

                                    {item.deliverables && (
                                        <div className="text-[10px] text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                                            <strong className="text-green-700">Deliverables:</strong> {item.deliverables}
                                        </div>
                                    )}

                                    {/* Proof File Attachment Badge */}
                                    {(item.proof_attachment_url || item.proof_link) && (
                                        <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                <span className="text-xs font-semibold text-gray-700 truncate">
                                                    {item.proof_attachment_name || 'Proof Link Attached'}
                                                </span>
                                            </div>
                                            {item.proof_attachment_url && (
                                                <a
                                                    href={item.proof_attachment_url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 text-indigo-600 hover:text-indigo-800 rounded"
                                                    title="Download Proof File"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            )}
                                            {item.proof_link && (
                                                <a
                                                    href={item.proof_link.startsWith('http') ? item.proof_link : `https://${item.proof_link}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 text-gray-500 hover:text-indigo-600 rounded"
                                                    title="Open Proof Link"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Evaluation / Rating Section */}
                                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-2">
                                    {item.admin_rating ? (
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star
                                                        key={s}
                                                        className={`w-3.5 h-3.5 ${
                                                            s <= item.admin_rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-900">({item.admin_rating}/5)</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-400">Not Evaluated</span>
                                    )}

                                    <button
                                        onClick={() => handleOpenRatingModal(item)}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                            item.admin_rating
                                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                        }`}
                                    >
                                        {item.admin_rating ? 'Edit Rating' : '⭐ Rate Work'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 2: COMPANY DOCUMENTS & NOTICES (WITH ATTACHMENT & TARGET BADGES) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-800">Company Documents & Downloads</h2>
                            <p className="text-xs text-gray-400">Manage files, attachments, and specific employee notices</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDocModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Document</span>
                    </button>
                </div>

                {documents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 font-medium italic">
                        No company documents published. Click "Add Document" to upload an attachment or broadcast a notice.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map(doc => (
                            <div key={doc._id} className="p-5 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-3 relative group hover:border-indigo-200 transition-all">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                                                {doc.category}
                                            </span>
                                            {doc.target_type === 'specific' ? (
                                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <User className="w-2.5 h-2.5" />
                                                    <span>{doc.target_employee_name || doc.target_emp_no}</span>
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Globe className="w-2.5 h-2.5" />
                                                    <span>All Employees</span>
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-800 mt-2">{doc.title}</h4>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteDocument(doc._id)}
                                        className="text-gray-300 hover:text-red-600 p-1 transition-colors"
                                        title="Delete Document"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {doc.content && (
                                    <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap">{doc.content}</p>
                                )}

                                {/* Attachment Card & Download Button */}
                                <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <File className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">
                                                {doc.attachment_name || `${doc.title}.txt`}
                                            </p>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                {doc.attachment_size || 'Text Document'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadDocument(doc)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download</span>
                                    </button>
                                </div>

                                <div className="text-[10px] text-gray-400 font-mono pt-1">
                                    Published: {doc.date || doc.updatedAt} • By {doc.created_by || 'Admin'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 3: TODAY'S REPORT & ATTENDANCE TABLE */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-indigo-500" />
                            Today's Live Attendance
                            <span className="text-xs font-normal text-gray-400 ml-1">({today})</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Real-time attendance & session status for all employees</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/admin/reports" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                            Full Reports <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Summary Pills */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                    <Pill color="bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-100" label={`${todayReport.filter(r => r.presence_status === 'online').length} Online`} onClick={() => handlePillClick('Online')} />
                    <Pill color="bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100" label={`${presentToday} Present`} onClick={() => handlePillClick('Present')} />
                    <Pill color="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100" label={`${leavesToday.length} On Leave`} onClick={() => handlePillClick('On Leave')} />
                    <Pill color="bg-red-50 text-red-600 border-red-200 cursor-pointer hover:bg-red-100" label={`${absentTodayCount} Absent`} onClick={() => handlePillClick('Absent')} />
                    <Pill color="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100" label={`${activeNow} Active Now`} onClick={() => handlePillClick('Active Now')} />
                    <Pill color="bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer hover:bg-indigo-100" label={`${completedToday} Tasks Done`} onClick={() => handlePillClick('Tasks Done')} />
                </div>

                {/* Action Card for Ending All Active Sessions */}
                <div className={`mb-6 p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${activeNow > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${activeNow > 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400 shadow-none'}`}>
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className={`font-extrabold text-base ${activeNow > 0 ? 'text-red-900' : 'text-gray-500'}`}>{activeNow} Active Sessions</h4>
                            <p className={`text-xs font-bold uppercase tracking-wide ${activeNow > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {activeNow > 0 ? 'Emergency Session Controls' : 'No active sessions currently'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleForceLogoutAll}
                        disabled={terminating || activeNow === 0}
                        className={`w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${terminating || activeNow === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-md active:scale-95'
                            }`}
                    >
                        <LogOut className={`w-4 h-4 ${terminating ? 'animate-spin' : ''}`} />
                        <span>{terminating ? 'Processing...' : 'End All Sessions'}</span>
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {['Employee', 'Login', 'Logout', 'Task', 'Status', 'Progress', 'Action'].map(h => (
                                    <th key={h} className="pb-3 px-2">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                            {todayReport.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-2 font-semibold text-gray-800">{r.name} (#{r.emp_no})</td>
                                    <td className="py-3 px-2 font-mono text-gray-600">{r.login_time}</td>
                                    <td className="py-3 px-2 font-mono text-gray-400">{r.logout_time}</td>
                                    <td className="py-3 px-2 text-gray-700 truncate max-w-xs">{r.task_title || 'N/A'}</td>
                                    <td className="py-3 px-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[r.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[r.status]?.text || 'text-gray-600'}`}>
                                            {r.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 font-bold text-gray-700">
                                        {r.completion_percentage !== null ? `${r.completion_percentage}%` : '-'}
                                    </td>
                                    <td className="py-3 px-2">
                                        {r.session_status === 'Active' && (
                                            <button
                                                onClick={() => handleForceLogoutEmployee(r.emp_no)}
                                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold transition-all"
                                            >
                                                End Session
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 4: LOGIN REQUESTS & CONTROLS */}
            <LoginRequestsList />

            {/* STAR RATING & EVALUATION MODAL */}
            <AnimatePresence>
                {ratingModalItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800">Evaluate 3-Hour Worksheet</h3>
                                        <p className="text-xs text-gray-400">For {ratingModalItem.employeeName} (#{ratingModalItem.emp_no})</p>
                                    </div>
                                </div>
                                <button onClick={() => setRatingModalItem(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {ratingSuccess && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold">
                                    {ratingSuccess}
                                </div>
                            )}

                            <form onSubmit={handleSubmitRating} className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Worksheet Overview:</span>
                                    <p className="text-xs font-bold text-gray-800">{ratingModalItem.task_title}</p>
                                    <p className="text-xs text-gray-600 line-clamp-2">"{ratingModalItem.work_done}"</p>
                                </div>

                                {/* Star Rating Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Performance Rating (1 to 5 Stars) *</label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setRatingValue(star)}
                                                className="p-2 rounded-xl hover:bg-amber-50 transition-transform active:scale-125"
                                            >
                                                <Star
                                                    className={`w-7 h-7 ${
                                                        star <= ratingValue
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-gray-200'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-amber-900 mt-1 block">
                                        {ratingValue === 5 && '🌟 Outstanding Performance'}
                                        {ratingValue === 4 && '⭐ Exceeds Expectations'}
                                        {ratingValue === 3 && '👍 Good / Satisfactory'}
                                        {ratingValue === 2 && '⚠️ Needs Improvement'}
                                        {ratingValue === 1 && '❌ Unsatisfactory'}
                                    </span>
                                </div>

                                {/* Feedback textarea */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Private Feedback Notes for Employee
                                    </label>
                                    <textarea
                                        rows="3"
                                        placeholder="Add praise, recommendations, or instructions visible to this employee..."
                                        value={ratingFeedback}
                                        onChange={(e) => setRatingFeedback(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRatingModalItem(null)}
                                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={ratingSubmitting}
                                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {ratingSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-white" />}
                                        <span>Save & Notify</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PUBLISH DOCUMENT MODAL */}
            <AnimatePresence>
                {showDocModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 my-8"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">Publish Company Document</h3>
                                        <p className="text-xs text-gray-500">Upload attachments and select target audience</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {docSuccess && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold">
                                    {docSuccess}
                                </div>
                            )}

                            <form onSubmit={handleCreateDocument} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Document Title *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Appointment Letter / Q3 Remote Policy"
                                        value={docForm.title}
                                        onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                                        <select
                                            value={docForm.category}
                                            onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="Company Policy">Company Policy</option>
                                            <option value="General Announcement">General Announcement</option>
                                            <option value="Confidential Circular">Confidential Circular</option>
                                            <option value="Standard Operating Procedure">Standard Operating Procedure</option>
                                            <option value="Personal Appointment">Personal Document</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience *</label>
                                        <select
                                            value={docForm.target_type}
                                            onChange={(e) => {
                                                const tType = e.target.value;
                                                setDocForm({
                                                    ...docForm,
                                                    target_type: tType,
                                                    target_emp_no: tType === 'all' ? '' : (employeesList[0]?.emp_no || ''),
                                                    target_employee_name: tType === 'all' ? 'All Employees' : (employeesList[0]?.full_name || employeesList[0]?.name || '')
                                                });
                                            }}
                                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-indigo-700"
                                        >
                                            <option value="all">🌐 All Employees</option>
                                            <option value="specific">👤 Specific Employee</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Specific Employee Selector (Conditional) */}
                                {docForm.target_type === 'specific' && (
                                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                                        <label className="block text-xs font-bold text-indigo-900">Select Recipient Employee *</label>
                                        <select
                                            value={docForm.target_emp_no}
                                            onChange={(e) => {
                                                const emp = employeesList.find(x => x.emp_no === e.target.value);
                                                setDocForm({
                                                    ...docForm,
                                                    target_emp_no: e.target.value,
                                                    target_employee_name: emp ? (emp.full_name || emp.name) : ''
                                                });
                                            }}
                                            className="w-full px-3.5 py-2 border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                                        >
                                            {employeesList.map(emp => (
                                                <option key={emp.emp_no} value={emp.emp_no}>
                                                    {emp.full_name || emp.name} (#{emp.emp_no})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* File Attachment Upload Area */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Attach File / Document (PDF, Word, Excel, Image, etc.)
                                    </label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                                            selectedFile 
                                                ? 'border-indigo-400 bg-indigo-50/40' 
                                                : 'border-gray-200 hover:border-indigo-300 bg-gray-50/50 hover:bg-indigo-50/20'
                                        }`}
                                    >
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            onChange={handleFileChange}
                                            className="hidden" 
                                        />
                                        
                                        {selectedFile ? (
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Paperclip className="w-5 h-5 text-indigo-600 shrink-0" />
                                                    <div className="text-left min-w-0">
                                                        <p className="text-xs font-bold text-gray-800 truncate">{selectedFile.name}</p>
                                                        <span className="text-[10px] text-gray-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFile(null);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                                                <p className="text-xs font-bold text-gray-700">Click to upload document attachment</p>
                                                <p className="text-[10px] text-gray-400 font-mono">Supports PDF, DOCX, XLSX, TXT, PNG, JPG (up to 25MB)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Document Description / Notes</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Enter instructions, notes, or full text for employees..."
                                        value={docForm.content}
                                        onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowDocModal(false)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={docSubmitting}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {docSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        <span>Publish & Broadcast</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CATEGORY DRILLDOWN MODAL */}
            {isModalOpen && selectedCategory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{selectedCategory.title}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{selectedCategory.list.length} employee(s) in this state</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 divide-y divide-gray-50">
                            {selectedCategory.list.map((emp, i) => (
                                <div key={i} className="py-3 flex items-center justify-between">
                                    <div className="font-semibold text-xs text-gray-800">{emp.name} (#{emp.emp_no})</div>
                                    <div className="text-xs font-mono text-indigo-600">{emp.login_time}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-xs text-gray-400 font-semibold">{title}</p>
            <h4 className="text-2xl font-black text-gray-800 mt-0.5">{value}</h4>
        </div>
    </div>
);

const Pill = ({ color, label, onClick }) => (
    <button
        onClick={onClick}
        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95 ${color}`}
    >
        {label}
    </button>
);

export default AdminDashboard;
