import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { API_URL, SOCKET_URL } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    Clock, Plus, FileCheck2, Paperclip, Download, ExternalLink,
    Star, RefreshCw, X, Send, CheckCheck, TrendingUp, AlertCircle,
    Calendar, Filter, FileText, Check, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { getNextWorksheetMilestone } from '../utils/milestones';

const WorksheetsPage = () => {
    const { user } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const [worksheets, setWorksheets] = useState([]);
    const [loading, setLoading] = useState(true);

    const [milestoneInfo, setMilestoneInfo] = useState(getNextWorksheetMilestone);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    // Worksheet Form
    const [form, setForm] = useState({
        task_title: '',
        hours_spent: 3,
        work_done: '',
        deliverables: '',
        blockers: '',
        next_plan: '',
        proof_link: ''
    });
    const [proofFile, setProofFile] = useState(null);
    const fileInputRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const isSupervisor = user?.emp_no === '202601' || user?.emp_no === '202602' || user?.role === 'manager' || user?.role === 'hr' || user?.emp_no?.startsWith('ADMIN');
    const isManager = user?.emp_no === '202601' || user?.role === 'manager';
    const isHR = user?.emp_no === '202602' || user?.role === 'hr';
    const initialTab = (searchParams.get('tab') === 'team' && isSupervisor) ? 'team_supervision' : 'my_worksheets';
    const [activeTab, setActiveTab] = useState(initialTab); // 'my_worksheets' | 'team_supervision'
    const [teamWorksheets, setTeamWorksheets] = useState([]);
    const [teamLoading, setTeamLoading] = useState(false);
    
    // Team Rating Modal
    const [ratingModalItem, setRatingModalItem] = useState(null);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingFeedback, setRatingFeedback] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);

    useEffect(() => {
        fetchWorksheets();
        if (isSupervisor) {
            fetchTeamWorksheets();
        }

        const timer = setInterval(() => {
            const nextInfo = getNextWorksheetMilestone();
            setMilestoneInfo(nextInfo);
            if (nextInfo.totalSeconds === 0) {
                setShowSubmitModal(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isSupervisor]);

    // Real-time socket for ratings & team updates
    useEffect(() => {
        if (!user?.emp_no) return;
        const socket = io(SOCKET_URL);
        socket.emit('join_room', user.emp_no.trim().toUpperCase());

        socket.on('worksheet_rated', () => {
            fetchWorksheets();
        });

        socket.on('work_update_received', () => {
            if (isSupervisor) fetchTeamWorksheets();
        });

        return () => {
            socket.off('worksheet_rated');
            socket.off('work_update_received');
            socket.disconnect();
        };
    }, [user, isSupervisor]);

    const fetchWorksheets = async () => {
        try {
            setLoading(true);
            const res = await api.get('/tasks/interval-updates?date=all');
            setWorksheets(res.data || []);
        } catch (e) {
            console.error('Failed to fetch worksheets:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamWorksheets = async () => {
        try {
            setTeamLoading(true);
            const res = await api.get('/admin/interval-updates?date=all');
            setTeamWorksheets(res.data || []);
        } catch (e) {
            console.error('Failed to fetch team worksheets:', e);
        } finally {
            setTeamLoading(false);
        }
    };

    const handleRateWorksheet = async (e) => {
        e.preventDefault();
        if (!ratingModalItem) return;

        setRatingSubmitting(true);
        try {
            await api.put(`/admin/interval-updates/${ratingModalItem._id}/rate`, {
                rating: Number(ratingValue),
                feedback: ratingFeedback
            });
            setRatingModalItem(null);
            setRatingFeedback('');
            fetchTeamWorksheets();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit rating');
        } finally {
            setRatingSubmitting(false);
        }
    };

    const handleSubmitWorksheet = async (e) => {
        e.preventDefault();
        if (!form.work_done.trim()) {
            setErrorMsg('Please describe the work completed in this 3-hour session.');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const formData = new FormData();
            formData.append('task_title', form.task_title || '3-Hour Milestone Progress');
            formData.append('hours_spent', form.hours_spent || 3);
            formData.append('work_done', form.work_done);
            formData.append('deliverables', form.deliverables || '');
            formData.append('blockers', form.blockers || '');
            formData.append('next_plan', form.next_plan || '');
            formData.append('proof_link', form.proof_link || '');
            formData.append('interval_type', '3hour');

            if (proofFile) {
                formData.append('proof_attachment', proofFile);
            }

            await api.post('/tasks/interval-update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccessMsg('3-Hour Worksheet update & proof submitted successfully!');
            setSecondsLeft(THREE_HOURS_SECONDS);
            fetchWorksheets();

            setTimeout(() => {
                setShowSubmitModal(false);
                setForm({
                    task_title: '',
                    hours_spent: 3,
                    work_done: '',
                    deliverables: '',
                    blockers: '',
                    next_plan: '',
                    proof_link: ''
                });
                setProofFile(null);
                setSuccessMsg('');
            }, 1200);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Failed to submit worksheet');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTimer = (totalSecs) => {
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Clean Professional Header with 3-Hour Cycle Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span>3-Hour Worksheets & Performance Hub</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Submit periodic milestone updates every 3 hours with attached proof files. Admin reviews and evaluates your progress.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <div className="text-left">
                            <span className="text-[9px] uppercase font-bold text-gray-400 block leading-tight">Next Update ({milestoneInfo.slotTime})</span>
                            <span className="font-mono text-xs font-black text-gray-800">{milestoneInfo.formatted}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSubmitModal(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Submit Worksheet</span>
                    </button>
                </div>
            </div>

            {/* Tabs for Managers / HR / Leadership */}
            {isSupervisor && (
                <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                    <button
                        onClick={() => setActiveTab('my_worksheets')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'my_worksheets'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>My Worksheets ({worksheets.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('team_supervision')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'team_supervision'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Star className="w-4 h-4" />
                        <span>Team Supervision & Reviews ({teamWorksheets.length})</span>
                    </button>
                </div>
            )}

            {/* Note for Manager / HR */}
            {user?.emp_no === '202601' && activeTab === 'my_worksheets' && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>Manager Accountability:</strong> Your 3-hour worksheets and milestones are evaluated exclusively by Super Admin / Management.</span>
                </div>
            )}

            {user?.emp_no === '202602' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>HR Operations Portal:</strong> HR performance is monitored directly by Super Admin / Management.</span>
                </div>
            )}

            {/* Active Tab Content */}
            {activeTab === 'team_supervision' ? (
                /* TEAM SUPERVISION VIEW FOR MANAGER */
                teamLoading ? (
                    <div className="py-16 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                    </div>
                ) : teamWorksheets.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-gray-200/80 text-center text-gray-400 space-y-3">
                        <Clock className="w-12 h-12 mx-auto text-gray-300" />
                        <h3 className="text-base font-bold text-gray-700">No Team Submissions Yet</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            Team members will appear here as they submit their 3-hour worksheet logs.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {teamWorksheets.map(item => (
                            <div key={item._id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4 hover:border-indigo-200 transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="font-bold text-xs text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                                            👤 {item.employeeName} (#{item.emp_no})
                                        </span>
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                            ⏱️ {item.hours_spent || 3} Hours Logged
                                        </span>
                                        <span className="text-xs font-mono text-gray-400">
                                            {item.date} • {item.time || item.timestamp}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {item.admin_rating ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                <span>Rated: {item.admin_rating} / 5</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setRatingModalItem(item);
                                                    setRatingValue(5);
                                                    setRatingFeedback('');
                                                }}
                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                                            >
                                                <Star className="w-3.5 h-3.5" />
                                                <span>Rate Work</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-base font-bold text-gray-900">{item.task_title || '3-Hour Milestone Progress'}</h3>
                                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                        {item.work_done}
                                    </p>
                                </div>

                                {(item.deliverables || item.next_plan) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {item.deliverables && (
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCheck className="w-3 h-3 text-emerald-600" /> Key Outputs:
                                                </span>
                                                <p className="text-xs text-gray-700">{item.deliverables}</p>
                                            </div>
                                        )}
                                        {item.next_plan && (
                                            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3 text-indigo-600" /> Next Plan:
                                                </span>
                                                <p className="text-xs text-indigo-900">{item.next_plan}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(item.proof_attachment_url || item.proof_link) && (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Paperclip className="w-4 h-4 text-indigo-600" />
                                            <span className="text-xs font-bold text-gray-800 truncate">
                                                {item.proof_attachment_name || item.proof_link}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.proof_attachment_url && (
                                                <a
                                                    href={item.proof_attachment_url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                                                >
                                                    Download Proof
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* MY WORKSHEETS FEED */
                loading ? (
                    <div className="py-16 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                    </div>
                ) : worksheets.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-gray-200/80 text-center text-gray-400 space-y-3">
                        <Clock className="w-12 h-12 mx-auto text-gray-300" />
                        <h3 className="text-base font-bold text-gray-700">No 3-Hour Worksheets Logged Yet</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            Click the "Submit Worksheet" button to record your first 3-hour work progress with proof attachments.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {worksheets.map(item => (
                            <div key={item._id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4 hover:border-indigo-200 transition-all">
                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                            ⏱️ {item.hours_spent || 3} Hours Logged
                                        </span>
                                        <span className="text-xs font-mono text-gray-400">
                                            {item.date} • {item.time || item.timestamp}
                                        </span>
                                    </div>

                                    {/* Evaluation Header */}
                                    {item.admin_rating ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            <span>Rated: {item.admin_rating} / 5 Stars</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                            ⏳ Review Pending
                                        </span>
                                    )}
                                </div>

                                {/* Work Summary */}
                                <div className="space-y-2">
                                    <h3 className="text-base font-bold text-gray-900">{item.task_title || '3-Hour Milestone Progress'}</h3>
                                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                        {item.work_done}
                                    </p>
                                </div>

                                {/* Deliverables & Next Action Plan */}
                                {(item.deliverables || item.next_plan) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {item.deliverables && (
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCheck className="w-3 h-3 text-emerald-600" /> Key Outputs / Deliverables:
                                                </span>
                                                <p className="text-xs text-gray-700">{item.deliverables}</p>
                                            </div>
                                        )}
                                        {item.next_plan && (
                                            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3 text-indigo-600" /> Next Plan:
                                                </span>
                                                <p className="text-xs text-indigo-900">{item.next_plan}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Proof Attachments */}
                                {(item.proof_attachment_url || item.proof_link) && (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                                                <Paperclip className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Work Proof File</span>
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {item.proof_attachment_name || item.proof_link}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {item.proof_attachment_url && (
                                                <a
                                                    href={item.proof_attachment_url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Download Proof</span>
                                                </a>
                                            )}
                                            {item.proof_link && (
                                                <a
                                                    href={item.proof_link.startsWith('http') ? item.proof_link : `https://${item.proof_link}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>Open Link</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Secure Admin Rating & Feedback */}
                                {item.admin_rating && (
                                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star
                                                            key={star}
                                                            className={`w-4 h-4 ${
                                                                star <= item.admin_rating
                                                                    ? 'text-amber-400 fill-amber-400'
                                                                    : 'text-gray-300'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold text-amber-900">
                                                    {item.admin_rating === 5 ? '🌟 Outstanding Work' :
                                                     item.admin_rating === 4 ? '⭐ Exceeds Expectations' :
                                                     item.admin_rating === 3 ? '👍 Good Progress' : 'Needs Attention'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                Evaluated by {item.admin_rated_by || 'Admin'}
                                            </span>
                                        </div>

                                        {item.admin_feedback && (
                                            <p className="text-xs text-gray-800 font-medium italic bg-white p-2.5 rounded-lg border border-amber-100">
                                                "{item.admin_feedback}"
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* SUBMIT MODAL */}
            <AnimatePresence>
                {showSubmitModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 my-8 border border-gray-100"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <h3 className="text-base font-bold text-gray-900">Submit 3-Hour Worksheet</h3>
                                <button onClick={() => setShowSubmitModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {successMsg && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <Check className="w-4 h-4" /> {successMsg}
                                </div>
                            )}
                            {errorMsg && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSubmitWorksheet} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Session / Milestone Title *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Feature Implementation & Bug Fixes"
                                        value={form.task_title}
                                        onChange={(e) => setForm({ ...form, task_title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Work Description (Summary of achievements) *</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Describe what was accomplished in this 3-hour period..."
                                        value={form.work_done}
                                        onChange={(e) => setForm({ ...form, work_done: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Key Outputs / Deliverables</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 3 endpoints deployed, UI polished"
                                        value={form.deliverables}
                                        onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Attach Work Proof File (PDF, Image, Excel, ZIP)</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-3.5 border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl text-center cursor-pointer bg-gray-50/50"
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setProofFile(e.target.files[0]);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        {proofFile ? (
                                            <div className="flex items-center justify-between text-xs font-bold text-indigo-700">
                                                <span>{proofFile.name}</span>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setProofFile(null); }} className="text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500 font-medium">Click to select proof attachment file</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">External Proof URL (Optional)</label>
                                    <input
                                        type="url"
                                        placeholder="https://github.com/... or https://figma.com/..."
                                        value={form.proof_link}
                                        onChange={(e) => setForm({ ...form, proof_link: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Blockers (if any)</label>
                                        <input
                                            type="text"
                                            placeholder="None"
                                            value={form.blockers}
                                            onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Next 3-Hour Plan</label>
                                        <input
                                            type="text"
                                            placeholder="Continue backend tests"
                                            value={form.next_plan}
                                            onChange={(e) => setForm({ ...form, next_plan: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSubmitModal(false)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        <span>Submit Worksheet</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TEAM WORKSHEET RATING MODAL (FOR MANAGER / LEADERSHIP) */}
            <AnimatePresence>
                {ratingModalItem && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 my-8 border border-gray-100"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Evaluate 3-Hour Worksheet</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {ratingModalItem.employeeName} (#{ratingModalItem.emp_no})
                                    </p>
                                </div>
                                <button onClick={() => setRatingModalItem(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleRateWorksheet} className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-700 space-y-1">
                                    <span className="font-bold text-gray-900 block">{ratingModalItem.task_title || 'Work Milestone'}</span>
                                    <p className="line-clamp-3 text-gray-600 italic">"{ratingModalItem.work_done}"</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Score / Performance Rating</label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setRatingValue(star)}
                                                className="p-1.5 transition-transform hover:scale-110 active:scale-95"
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
                                        <span className="text-xs font-bold text-gray-700 ml-2">{ratingValue} / 5 Stars</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Supervisor Feedback & Guidance</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Excellent execution on this sprint task. Deliverables confirmed."
                                        value={ratingFeedback}
                                        onChange={(e) => setRatingFeedback(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRatingModalItem(null)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={ratingSubmitting}
                                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                                    >
                                        {ratingSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-white" />}
                                        <span>Submit Evaluation</span>
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

export default WorksheetsPage;
