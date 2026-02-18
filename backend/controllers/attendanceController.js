const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const { getISTTime } = require('./utilsController');

// Helper to format attendance records
const formatAttendanceRecords = (attendanceRows) => {
    return attendanceRows.map(record => {
        let duration = null;
        if (record.login_time && record.logout_time) {
            const login = new Date(record.login_time);
            const logout = new Date(record.logout_time);
            const diffMs = logout - login;
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            duration = `${diffHrs}h ${diffMins}m`;
        }
        return {
            id: record._id,
            emp_no: record.emp_no,
            login_time: record.login_time,
            logout_time: record.logout_time,
            date: record.date,
            duration
        };
    });
};

// @desc    Get attendance history for logged-in employee
// @route   GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
    const { emp_no } = req.user;

    try {
        const attendanceRows = await Attendance.find({ emp_no }).sort({ date: -1, login_time: -1 });
        const taskRows = await Task.find({ emp_no }).sort({ assigned_date: -1 });

        const records = formatAttendanceRecords(attendanceRows);

        res.json({ attendance: records, tasks: taskRows });
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get attendance history for any employee (Admin only)
// @route   GET /api/attendance/admin/history/:emp_no
const getEmployeeAttendanceForAdmin = async (req, res) => {
    const { emp_no } = req.params;

    try {
        const attendanceRows = await Attendance.find({ emp_no }).sort({ date: -1, login_time: -1 });
        const taskRows = await Task.find({ emp_no }).sort({ assigned_date: -1 });

        const records = formatAttendanceRecords(attendanceRows);

        res.json({ attendance: records, tasks: taskRows });
    } catch (error) {
        console.error('Error fetching employee attendance history for admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getAttendanceHistory, getEmployeeAttendanceForAdmin };
