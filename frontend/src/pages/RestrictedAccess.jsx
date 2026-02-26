import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Clock, Calendar, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const RestrictedAccess = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
            >
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10" />
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">Working hours are over</h1>
                <p className="text-gray-600 mb-8">
                    You can only submit a leave request at this time. Working sessions cannot be started after 7:00 PM IST.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/leaves')}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Calendar className="w-5 h-5" />
                        Apply Leave
                    </button>

                    <button
                        onClick={() => logout()}
                        className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default RestrictedAccess;
