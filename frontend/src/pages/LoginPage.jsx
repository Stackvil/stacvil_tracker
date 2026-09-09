import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import FaceCapture from '../components/FaceCapture';
import api, { SOCKET_URL } from '../services/api';

const LoginPage = () => {
    const [empNo, setEmpNo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestStatus, setRequestStatus] = useState(null);
    const [faceRequired, setFaceRequired] = useState(false);
    const [wifiSSID, setWifiSSID] = useState(null);
    const { login, user, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Check for WiFi SSID passed from Native Bridge
    useEffect(() => {
        const checkWifi = () => {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GET_WIFI_SSID' }));
            }
        };
        checkWifi();

        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'WIFI_SSID') {
                    setWifiSSID(data.ssid);
                }
            } catch (e) { }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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
            const newSocket = io(SOCKET_URL);

            newSocket.emit('join_room', empNo.trim().toUpperCase());

            newSocket.on('login_request_result', (data) => {
                if (data.status === 'Approved') {
                    setRequestStatus({ type: 'success', message: 'Request approved! You can now log in.' });
                } else if (data.status === 'Rejected') {
                    setRequestStatus({ type: 'error', message: 'Your login request was rejected by admin.' });
                }
            });

            return () => newSocket.disconnect();
        }
    }, [showRequestModal, empNo]);

    const handleSubmit = async (e, faceDescriptor = null) => {
        if (e) e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await login(empNo, password, wifiSSID, faceDescriptor);

        if (result.success) {
            if (result.role === 'admin') {
                navigate('/admin');
            } else if (result.isRestricted) {
                navigate('/restricted-access');
            } else {
                navigate('/dashboard');
            }
        } else {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
            
            const errMsg = result.message?.toLowerCase().includes('credentials') || result.message?.toLowerCase().includes('password')
                ? 'Incorrect password or employee ID. Please try again.'
                : (result.message || 'Login failed. Please try again.');
            setError(errMsg);

            if (result.data?.face_required) {
                setFaceRequired(true);
            }
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
            await api.post('/auth/login-request', { emp_no: empNo, reason: requestReason });
            setRequestStatus({ type: 'success', message: 'Request submitted successfully. Please wait for admin approval.' });
        } catch (err) {
            setRequestStatus({ type: 'error', message: err.response?.data?.message || 'Failed to submit request' });
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                    opacity: 1, 
                    y: 0,
                    x: isShaking ? [-10, 10, -8, 8, -4, 4, 0] : 0
                }}
                transition={{ duration: isShaking ? 0.5 : 0.4 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-8">
                    <div className="text-center mb-8">
                        {/* Stackvil Logo */}
                        <div className="inline-flex items-center justify-center p-1.5 bg-white rounded-2xl shadow-md border border-gray-100 mb-4">
                            <img 
                                src="/stackvil-logo.jpeg" 
                                alt="Stackvil" 
                                className="w-14 h-14 rounded-xl object-cover" 
                            />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stackvil Technologies</h1>
                        <p className="text-gray-500 mt-1.5 text-xs sm:text-sm">Workforce & Performance Management Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                                    <p className="text-xs sm:text-sm font-medium">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 ml-1">Employee ID / Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={empNo}
                                    onChange={(e) => {
                                        setEmpNo(e.target.value);
                                        if (error) setError('');
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800 text-sm"
                                    placeholder="Enter your ID (e.g. ADMIN001, EMPTEST)"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800 text-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>
                </div>

                <div className="p-5 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-500">
                        Need help logging in? <a href="mailto:admin@stackvil.com" className="text-indigo-600 font-semibold hover:underline">Contact Admin</a>
                    </p>
                </div>
            </motion.div>

            {/* Office Hours Restricted Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Office Hours Restricted</h2>
                            <p className="text-gray-600 mt-2 text-xs">Login is restricted after 7:00 PM IST. Please request admin approval to continue.</p>
                        </div>

                        {requestStatus?.message ? (
                            <div className={`p-4 rounded-xl mb-6 text-xs ${requestStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
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
                                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Reason for late login</label>
                                    <textarea
                                        required
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
                                        placeholder="e.g., Urgent task completion"
                                        rows="3"
                                        value={requestReason}
                                        onChange={(e) => setRequestReason(e.target.value)}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all"
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
                            className="w-full mt-4 py-2 text-gray-500 font-semibold hover:text-gray-700 transition-all text-xs"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </div>
            )}
            
            {/* Face Verification Modal */}
            <AnimatePresence>
                {faceRequired && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
                        >
                            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Biometric Verification</h2>
                            <p className="text-gray-600 mb-6 text-xs">Please verify your face to complete the login process.</p>
                            
                            <FaceCapture 
                                label="Verify Identity"
                                onCapture={(descriptor) => handleSubmit(null, descriptor)}
                            />
                            
                            <button
                                onClick={() => setFaceRequired(false)}
                                className="mt-6 text-gray-400 hover:text-gray-600 font-medium text-xs transition-colors"
                            >
                                Cancel Verification
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LoginPage;
