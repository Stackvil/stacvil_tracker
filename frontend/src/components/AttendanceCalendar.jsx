import React, { useState } from 'react';
import {
    Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, startOfWeek,
    endOfWeek, eachDayOfInterval, isSameDay,
    isSameMonth, addMonths, subMonths, isToday
} from 'date-fns';

const AttendanceCalendar = ({ attendanceHistory = [], tasks = [] }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Calendar logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Helper to parse YYYY-MM-DD as local date (not UTC)
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return new Date();
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const getAttendanceForDay = (day) => {
        return attendanceHistory.filter(record =>
            isSameDay(parseLocalDate(record.date), day)
        );
    };

    const getTasksForDay = (day) => {
        return tasks.filter(task =>
            isSameDay(parseLocalDate(task.assigned_date), day)
        );
    };

    const dayAttendance = getAttendanceForDay(selectedDate);
    const dayTasks = getTasksForDay(selectedDate);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-indigo-600" />
                        {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-3 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-all">
                            Today
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase py-2">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const getDayContent = (day) => {
                                const attendanceRecords = getAttendanceForDay(day);
                                const dayTasks = getTasksForDay(day);

                                // Calculate total duration for the day
                                let totalMs = 0;
                                attendanceRecords.forEach(record => {
                                    if (record.login_time && record.logout_time) {
                                        const diff = new Date(record.logout_time) - new Date(record.login_time);
                                        if (diff > 0) totalMs += diff;
                                    } else if (record.login_time && !record.logout_time && isSameDay(new Date(), day)) {
                                        // For today's open session, we could optionally show "Running" or add current duration
                                        // But for calendar history, usually we just show completed or specific status
                                        // Let's just track closed sessions for history totals to be safe,
                                        // or if it's today, we might want to skip adding "running" time here to avoid confusion
                                        // as it updates live elsewhere.
                                        // Let's stick to closed sessions for the total to avoid "future" math issues.
                                    }
                                });

                                const hours = Math.floor(totalMs / 3600000);
                                const minutes = Math.floor((totalMs % 3600000) / 60000);
                                const durationString = totalMs > 0 ? `${hours}h ${minutes}m` : null;

                                const isTodayDay = isSameDay(day, new Date()); // Renamed to avoid conflict with isToday from date-fns
                                const isSelected = isSameDay(day, selectedDate);

                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                        <span className={`text-sm font-medium ${isSelected ? 'text-white' :
                                            isTodayDay ? 'text-indigo-600' : 'text-gray-700'
                                            }`}>
                                            {format(day, 'd')}
                                        </span>

                                        <div className="flex gap-1">
                                            {attendanceRecords.length > 0 && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-green-500'
                                                    }`} />
                                            )}
                                            {dayTasks.length > 0 && (
                                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-purple-500'
                                                    }`} />
                                            )}
                                        </div>

                                        {durationString && (
                                            <span className={`text-[9px] font-bold ${isSelected ? 'text-indigo-200' : 'text-gray-400'
                                                }`}>
                                                {durationString}
                                            </span>
                                        )}
                                    </div>
                                );
                            };

                            const hasAttendance = getAttendanceForDay(day).length > 0; // Kept for potential external use or if the dot logic is separate
                            const hasTasks = getTasksForDay(day).length > 0; // Kept for potential external use
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        relative h-14 rounded-xl flex flex-col items-center justify-center transition-all
                                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                                        ${isSelected ? 'bg-indigo-600 shadow-md scale-105 z-10' : 'hover:bg-indigo-50'}
                                        ${isToday(day) && !isSelected ? 'border-2 border-indigo-200' : ''}
                                    `}
                                >
                                    {dayTasks.slice(0, 4).map((task, i) => {
                                        const statusColor =
                                            task.status === 'completed' ? 'bg-green-500' :
                                                task.status === 'in_progress' ? 'bg-blue-500' :
                                                    task.status === 'declined' ? 'bg-red-500' : 'bg-gray-400';
                                        return (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${statusColor}`}
                                                title={`${task.title} - ${task.status}`}
                                            />
                                        );
                                    })}
                                    {dayTasks.length > 4 && (
                                        <span className="text-[8px] font-bold text-gray-400">+{dayTasks.length - 4}</span>
                                    )}
                                </div>

                                    {/* Attendance Dot */ }
                            {
                                hasAttendance && (
                                    <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`}></div>
                                )
                            }
                                </button>
                    );
                        })}
                </div>
            </div>
        </div>

            {/* Day Details */ }
    <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Details: {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                {dayAttendance.length > 0 && (
                    <div className="px-3 py-1 bg-indigo-600 text-white rounded-lg shadow-sm flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase tracking-tighter leading-none opacity-80">Total Duration</span>
                        <span className="text-sm font-black font-mono leading-tight">
                            {(() => {
                                let totalMs = 0;
                                dayAttendance.forEach(r => {
                                    if (r.login_time && r.logout_time) {
                                        totalMs += new Date(r.logout_time) - new Date(r.login_time);
                                    } else if (r.login_time && isToday(selectedDate)) {
                                        totalMs += new Date() - new Date(r.login_time);
                                    }
                                });
                                const h = Math.floor(totalMs / 3600000);
                                const m = Math.floor((totalMs % 3600000) / 60000);
                                return `${h}h ${m}m`;
                            })()}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Attendance Section */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Sessions</h4>
                    {dayAttendance.length > 0 ? (
                        dayAttendance.map((record, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Login</span>
                                    <span className="font-bold text-indigo-600">{format(new Date(record.login_time), 'hh:mm a')}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Logout</span>
                                    <span className="font-bold text-purple-600">
                                        {record.logout_time ? format(new Date(record.logout_time), 'hh:mm a') : 'Active Session'}
                                    </span>
                                </div>
                                {record.duration && (
                                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400">DURATION</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
                                            {record.duration}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-gray-400 italic py-2">No attendance records.</div>
                    )}
                </div>

                {/* Tasks Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tasks Performance</h4>
                    {dayTasks.length > 0 ? (
                        dayTasks.map((task, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-indigo-50/30 border border-indigo-50 space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-gray-800 truncate block">{task.title}</span>
                                        {/* Source Badge */}
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${task.is_self_assigned ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'} inline-block mt-1`}>
                                            {task.is_self_assigned ? 'Self Added' : 'Admin Assigned'}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${task.completion_percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-600">{task.completion_percentage}%</span>
                                </div>
                                {task.reason && (
                                    <div className="text-[10px] text-amber-700 italic bg-amber-50 p-1.5 rounded border border-amber-100">
                                        Note: {task.reason}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-gray-400 italic py-2">No tasks recorded.</div>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-md p-6 text-white">
            <h4 className="font-bold text-indigo-100 text-sm uppercase tracking-wider mb-2">Month Summary</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-2xl font-bold">
                        {attendanceHistory.filter(r => isSameMonth(parseLocalDate(r.date), currentMonth)).length}
                    </div>
                    <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-tight">Sessions</p>
                </div>
                <div>
                    <div className="text-2xl font-bold">
                        {tasks.filter(t => isSameMonth(parseLocalDate(t.assigned_date), currentMonth)).length}
                    </div>
                    <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-tight">Tasks</p>
                </div>
            </div>
        </div>
    </div>
        </div >
    );
};

export default AttendanceCalendar;
