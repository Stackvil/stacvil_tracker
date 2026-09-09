import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    CalendarDays, Clock, CheckCircle2, AlertCircle, RefreshCw,
    TrendingUp, Calendar as CalendarIcon, UserCheck, Shield
} from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';

const AttendanceHistoryPage = () => {
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [taskHistory, setTaskHistory] = useState([]);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const [attRes, leaveRes] = await Promise.all([
                api.get('/attendance/my-history'),
                api.get('/leaves/my-leaves')
            ]);
            setAttendanceHistory(attRes.data.attendance || []);
            setTaskHistory(attRes.data.tasks || []);
            setLeaveHistory(leaveRes.data || []);
        } catch (error) {
            console.error('Failed to fetch attendance history:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-indigo-600" />
                        <span>Attendance Logs & Monthly Calendar</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Track shift login times, logout times, session duration, and leave records.
                    </p>
                </div>
                <button
                    onClick={fetchHistory}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                </button>
            </div>

            {loading ? (
                <div className="py-16 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                </div>
            ) : (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
                    <AttendanceCalendar
                        attendanceHistory={attendanceHistory}
                        taskHistory={taskHistory}
                        leaveHistory={leaveHistory}
                    />
                </div>
            )}
        </div>
    );
};

export default AttendanceHistoryPage;
