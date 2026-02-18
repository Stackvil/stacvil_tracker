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

    const getAttendanceForDay = (day) => {
        return attendanceHistory.filter(record =>
            isSameDay(new Date(record.date), day)
        );
    };

    const getTasksForDay = (day) => {
        return tasks.filter(task =>
            isSameDay(new Date(task.assigned_date), day)
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
                            const hasAttendance = getAttendanceForDay(day).length > 0;
                            const hasTasks = getTasksForDay(day).length > 0;
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        relative h-14 rounded-xl flex flex-col items-center justify-center transition-all
                                        ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                        ${isSelected ? 'bg-indigo-600 text-white shadow-md scale-105 z-10' : 'hover:bg-indigo-50'}
                                        ${isToday(day) && !isSelected ? 'border-2 border-indigo-200' : ''}
                                    `}
                                >
                                    <span className="text-sm font-bold">{format(day, 'd')}</span>

                                    {/* Task Indicators */}
                                    <div className="flex gap-1 mt-1 px-1 w-full justify-center flex-wrap">
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

                                    {/* Attendance Dot */}
                                    {hasAttendance && (
                                        <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`}></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Day Details */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Details: {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>

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
                                {attendanceHistory.filter(r => isSameMonth(new Date(r.date), currentMonth)).length}
                            </div>
                            <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-tight">Sessions</p>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {tasks.filter(t => isSameMonth(new Date(t.assigned_date), currentMonth)).length}
                            </div>
                            <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-tight">Tasks</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendar;
