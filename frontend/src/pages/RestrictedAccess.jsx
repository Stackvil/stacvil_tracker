import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Clock, Calendar, LogOut, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const RestrictedAccess = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [latestLeave, setLatestLeave] = useState(null);
    const [loadingLeaves, setLoadingLeaves] = useState(true);

    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const response = await api.get('/leaves/my-leaves');
                if (response.data && response.data.length > 0) {
                    setLatestLeave(response.data[0]); // Most recent leave
                }
            } catch (err) {
                console.error('Failed to fetch leaves on restricted page:', err);
            } finally {
                setLoadingLeaves(false);
            }
        };
        fetchLeaves();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved':
                return {
                    bg: 'bg-green-50 border-green-200 text-green-800',
                    badge: 'bg-green-100 text-green-700',
                    icon: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />,
                    title: 'Leave Approved'
                };
            case 'declined':
                return {
                    bg: 'bg-red-50 border-red-200 text-red-800',
                    badge: 'bg-red-100 text-red-700',
                    icon: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
                    title: 'Leave Declined'
                };
            default:
                return {
                    bg: 'bg-amber-50 border-amber-200 text-amber-800',
                    badge: 'bg-amber-100 text-amber-700',
                    icon: <Clock className="w-5 h-5 text-amber-600 shrink-0" />,
                    title: 'Leave Pending Approval'
                };
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-10 h-10" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">Working hours are over</h1>
                    <p className="text-gray-500 text-sm">
                        Working sessions cannot be started after 7:00 PM IST unless enabled by Admin. You can manage or submit leave requests below.
                    </p>
                </div>

                {/* Latest Leave Status Card */}
                {!loadingLeaves && latestLeave && (
                    <div className={`p-4 rounded-2xl border text-left space-y-2 ${getStatusStyle(latestLeave.status).bg}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {getStatusStyle(latestLeave.status).icon}
                                <span className="font-bold text-sm">{getStatusStyle(latestLeave.status).title}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${getStatusStyle(latestLeave.status).badge}`}>
                                {latestLeave.status}
                            </span>
                        </div>
                        <div className="text-xs space-y-1 pt-1">
                            <p className="font-semibold text-gray-700">Date: {latestLeave.start_date} {latestLeave.end_date !== latestLeave.start_date ? `to ${latestLeave.end_date}` : ''}</p>
                            <p className="italic text-gray-600">"{latestLeave.reason}"</p>
                            {latestLeave.admin_note && (
                                <div className="mt-2 p-2 bg-white/80 rounded-xl border border-gray-100 text-[11px] text-gray-700 flex items-start gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                    <span><strong>Admin Note:</strong> {latestLeave.admin_note}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-3 pt-2">
                    <button
                        onClick={() => navigate('/leaves')}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Calendar className="w-5 h-5" />
                        View All Leaves / Apply Leave
                    </button>

                    <button
                        onClick={() => logout()}
                        className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-base hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5 text-gray-400" />
                        Logout
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default RestrictedAccess;
