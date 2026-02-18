const pool = require('../config/db');

// @desc    Get attendance history for logged-in employee
// @route   GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
    const { emp_no } = req.user;

    try {
        const [attendanceRows] = await pool.execute(
            'SELECT id, login_time, logout_time, date FROM attendance WHERE emp_no = ? ORDER BY date DESC, login_time DESC',
            [emp_no]
        );

        const [taskRows] = await pool.execute(
            'SELECT id, assigned_date, due_date, completed_date, title, description, completion_percentage, status, reason FROM tasks WHERE emp_no = ? ORDER BY assigned_date DESC',
            [emp_no]
        );

        const records = attendanceRows.map(record => {
            let duration = null;
            if (record.login_time && record.logout_time) {
                const login = new Date(record.login_time);
                const logout = new Date(record.logout_time);
                const diffMs = logout - login;
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                duration = `${diffHrs}h ${diffMins}m`;
            }
            return { ...record, duration };
        });

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
        const [attendanceRows] = await pool.execute(
            'SELECT id, login_time, logout_time, date FROM attendance WHERE emp_no = ? ORDER BY date DESC, login_time DESC',
            [emp_no]
        );

        const [taskRows] = await pool.execute(
            'SELECT id, assigned_date, due_date, completed_date, title, description, completion_percentage, status, reason FROM tasks WHERE emp_no = ? ORDER BY assigned_date DESC',
            [emp_no]
        );

        const records = attendanceRows.map(record => {
            let duration = null;
            if (record.login_time && record.logout_time) {
                const login = new Date(record.login_time);
                const logout = new Date(record.logout_time);
                const diffMs = logout - login;
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                duration = `${diffHrs}h ${diffMins}m`;
            }
            return { ...record, duration };
        });

        res.json({ attendance: records, tasks: taskRows });
    } catch (error) {
        console.error('Error fetching employee attendance history for admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getAttendanceHistory, getEmployeeAttendanceForAdmin };
