import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const LoginPage = () => {
    const [empNo, setEmpNo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestStatus, setRequestStatus] = useState(null);
    const { login, user, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const reason = searchParams.get('reason');
        if (reason === 'concurrent_login') {
            setError('Your account has been logged in from another device.');
        }

        // AUTO-REDIRECT IF ALREADY LOGGED IN (Persistent Session)
        if (!loading && user) {
            if (user.role === 'admin') {
                navigate('/admin', { replace: true });
            } else if (user.isRestricted) {
                navigate('/restricted-access', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [searchParams, user, loading, navigate]);

    // Handle Socket for Login Request
    useEffect(() => {
        if (showRequestModal && empNo) {
            const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

            newSocket.emit('join_room', empNo.trim().toUpperCase());

            newSocket.on('login_request_result', (data) => {
                if (data.status === 'Approved') {
                    setRequestStatus({ type: 'success', message: 'Request approved! You can now log in.' });
                    // Optional: auto-login
                    // handleSubmit({ preventDefault: () => { } });
                } else if (data.status === 'Rejected') {
                    setRequestStatus({ type: 'error', message: 'Your login request was rejected by admin.' });
                }
            });

            return () => newSocket.disconnect();
        }
    }, [showRequestModal, empNo]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await login(empNo, password);

        if (result.success) {
            if (result.role === 'admin') {
                navigate('/admin');
            } else if (result.isRestricted) {
                navigate('/restricted-access');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.message);
            if (result.data?.restricted) {
                setShowRequestModal(true);
            }
        }
        setIsSubmitting(false);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        setRequestStatus({ type: 'loading', message: 'Submitting request...' });
        try {
            const api = (await import('../services/api')).default;
            await api.post('/auth/login-request', { emp_no: empNo, reason: requestReason });
            setRequestStatus({ type: 'success', message: 'Request submitted successfully. Please wait for admin approval.' });
        } catch (err) {
            setRequestStatus({ type: 'error', message: err.response?.data?.message || 'Failed to submit request' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-8">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-4">
                            <LogIn className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800">Welcome Back</h1>
                        <p className="text-gray-500 mt-2">Sign in to monitor your work</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Employee ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={empNo}
                                    onChange={(e) => setEmpNo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800"
                                    placeholder="Enter your ID (e.g., EMP001)"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                        Forgot your password? <a href="#" className="text-indigo-600 font-semibold hover:underline">Contact Admin</a>
                    </p>
                </div>
            </motion.div>

            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Office Hours Restricted</h2>
                            <p className="text-gray-600 mt-2">Login is restricted after 7:00 PM IST. Please request admin approval to continue.</p>
                        </div>

                        {requestStatus?.message ? (
                            <div className={`p-4 rounded-xl mb-6 text-sm ${requestStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                                requestStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                                    'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                {requestStatus.message}
                                {requestStatus.type === 'success' && (
                                    <p className="mt-2 font-bold animate-pulse">Waiting for admin approval...</p>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleRequestSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Reason for late login</label>
                                    <textarea
                                        required
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="e.g., Urgent task completion"
                                        rows="3"
                                        value={requestReason}
                                        onChange={(e) => setRequestReason(e.target.value)}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                                >
                                    Submit Request
                                </button>
                            </form>
                        )}

                        <button
                            onClick={() => {
                                setShowRequestModal(false);
                                setRequestStatus(null);
                            }}
                            className="w-full mt-4 py-3 text-gray-500 font-semibold hover:text-gray-700 transition-all font-medium"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </div>
            )}
        </div>

    );
};

export default LoginPage;
