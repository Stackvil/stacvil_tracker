const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const bcrypt = require('bcryptjs');
const { getISTTime } = require('./utilsController');

// @desc    Get all employees
// @route   GET /api/admin/employees
const getEmployees = async (req, res) => {
    try {
        const istTime = getISTTime();
        const today = istTime.date;

        const employees = await Employee.find({});
        const sevenPMIST = istTime.sevenPM;
        const now = new Date();
        const isPastSevenPM = now >= sevenPMIST || istTime.hour >= 19;

        // Cleanup: If past 7pm, close any active today's sessions
        if (isPastSevenPM) {
            await Attendance.updateMany(
                { date: today, logout_time: null },
                {
                    $set: {
                        logout_time: sevenPMIST.toISOString(),
                        session_status: 'Auto Logout',
                        logout_reason: 'Office hours ended'
                    }
                }
            );
        }

        const activeAttendance = isPastSevenPM
            ? []
            : await Attendance.find({ date: today, logout_time: null });
        const activeEmpNos = new Set(activeAttendance.map(a => a.emp_no));

        const result = employees.map(e => ({
            id: e._id,
            emp_no: e.emp_no,
            name: e.name,
            full_name: e.full_name,
            profile_picture: e.profile_picture,
            email: e.email,
            role: e.role,
            status: activeEmpNos.has(e.emp_no) ? 'active' : 'inactive'
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get daily reports
// @route   GET /api/admin/reports/daily
const getDailyReports = async (req, res) => {
    const { date } = req.query;
    const istTime = getISTTime();
    const filterDate = date || istTime.date;
    const isFilterToday = filterDate === istTime.date;

    const sevenPMIST = istTime.sevenPM;
    const now = new Date();
    const isPastSevenPM = now >= sevenPMIST || istTime.hour >= 19;

    try {
        // Silent cleanup: If it's past 7 PM, close any active sessions in the background
        if (isFilterToday && isPastSevenPM) {
            await Attendance.updateMany(
                { date: filterDate, logout_time: null },
                {
                    $set: {
                        logout_time: sevenPMIST.toISOString(),
                        session_status: 'Auto Logout',
                        logout_reason: 'Office hours ended'
                    }
                }
            );
        }

        const employees = await Employee.find({ role: 'employee' }).sort({ emp_no: 1 });
        const attendances = await Attendance.find({ date: filterDate });
        const tasksQuery = isFilterToday
            ? {
                $or: [
                    { due_date: filterDate },
                    { assigned_date: filterDate },
                    {
                        due_date: { $lt: filterDate },
                        status: { $in: ['pending', 'in_progress'] }
                    }
                ]
            }
            : {
                $or: [
                    { due_date: filterDate },
                    { assigned_date: filterDate }
                ]
            };
        const tasks = await Task.find(tasksQuery);

        const reports = employees.map(e => {
            const empAttendances = attendances.filter(a => a.emp_no === e.emp_no);
            const empTasks = tasks.filter(t => t.emp_no === e.emp_no);

            const t = empTasks[0] || {};
            const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB') : 'N/A';

            let totalMs = 0;
            const sessions = empAttendances.map(att => {
                let loginTime = new Date(att.login_time);
                let logoutTime = att.logout_time ? new Date(att.logout_time) : (isFilterToday && isPastSevenPM ? sevenPMIST : null);

                let durationMs = 0;
                if (loginTime && logoutTime) {
                    // Cap duration at 7 PM
                    const effectiveLogout = logoutTime > sevenPMIST && isFilterToday ? sevenPMIST : logoutTime;
                    durationMs = effectiveLogout - loginTime;
                    if (durationMs < 0) durationMs = 0;
                    totalMs += durationMs;
                }

                return {
                    login: formatTime(att.login_time),
                    logout: att.logout_time ? formatTime(att.logout_time) : (isFilterToday && isPastSevenPM ? formatTime(sevenPMIST) : 'N/A'),
                    is_active: !att.logout_time && !(isFilterToday && isPastSevenPM)
                };
            });

            let working_hours = 'N/A';
            let is_half_day = false;
            if (empAttendances.length > 0) {
                const hasActive = empAttendances.some(a => !a.logout_time && !(isFilterToday && isPastSevenPM));

                if (totalMs > 0 || !hasActive) {
                    const hrs = Math.floor(totalMs / 3600000);
                    const mins = Math.floor((totalMs % 3600000) / 60000);
                    is_half_day = totalMs > 0 && totalMs < 5 * 3600000;

                    working_hours = `${hrs}:${mins.toString().padStart(2, '0')}:00`;
                    if (is_half_day) working_hours += ' (Half Day)';
                    if (hasActive) working_hours += ' (Active)';
                } else if (hasActive) {
                    working_hours = 'Running';
                } else {
                    working_hours = '0:00:00';
                }
            }
            // ... rest of mapping

            return {
                emp_no: e.emp_no,
                name: e.name,
                full_name: e.full_name,
                profile_picture: e.profile_picture,
                login_time: sessions.length > 0 ? sessions[0].login : 'N/A',
                logout_time: sessions.length > 0 ? sessions[sessions.length - 1].logout : 'N/A',
                sessions, // Added sessions list
                title: t.title || 'No Task',
                status: t.status || 'N/A',
                completion_percentage: t.completion_percentage || 0,
                assigned_date: t.assigned_date || 'N/A',
                due_date: t.due_date || 'N/A',
                completed_date: t.completed_date || 'N/A',
                is_self_assigned: t.is_self_assigned || false,
                working_hours,
                is_half_day // Added half-day flag
            };
        });

        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
const getAnalytics = async (req, res) => {
    try {
        const tasks = await Task.find({});
        const attendances = await Attendance.find({ logout_time: { $ne: null } });

        const avgCompletion = tasks.length > 0
            ? tasks.reduce((acc, t) => acc + t.completion_percentage, 0) / tasks.length
            : 0;

        const empWorkingHours = {};
        attendances.forEach(a => {
            const diffHrs = (new Date(a.logout_time) - new Date(a.login_time)) / 3600000;
            empWorkingHours[a.emp_no] = (empWorkingHours[a.emp_no] || 0) + diffHrs;
        });

        const workingHoursArray = Object.keys(empWorkingHours).map(emp_no => ({
            emp_no,
            total_hours: empWorkingHours[emp_no].toFixed(2)
        }));

        const statusCounts = {};
        tasks.forEach(t => {
            statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        });

        const taskStats = Object.keys(statusCounts).map(status => ({
            status,
            count: statusCounts[status]
        }));

        res.json({
            avgCompletion,
            workingHours: workingHoursArray,
            taskStats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create employee (Admin only)
const createEmployee = async (req, res) => {
    const { emp_no, name, email, password, role } = req.body;

    try {
        if (!emp_no || !name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingEmp = await Employee.findOne({ $or: [{ emp_no }, { email }] });
        if (existingEmp) {
            return res.status(400).json({ message: 'Employee ID or email already exists' });
        }

        const employee = new Employee({ emp_no, name, email, password, role: role || 'employee' });
        await employee.save();

        res.status(201).json({ message: 'Employee created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign task to employee (Admin only)
const assignTask = async (req, res) => {
    const { emp_no, title, description, task_type, due_date } = req.body;

    try {
        if (!emp_no || !title || !task_type) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const istTime = getISTTime();
        const today = istTime.date;
        const finalDueDate = task_type === 'daily' ? today : due_date;

        if (task_type === 'custom' && finalDueDate < today) {
            return res.status(400).json({ message: 'Due date cannot be in the past' });
        }

        const employee = await Employee.findOne({ emp_no });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const task = new Task({
            emp_no,
            task_type,
            assigned_date: today,
            due_date: finalDueDate,
            title,
            description: description || '',
            completion_percentage: 0,
            status: 'pending'
        });

        await task.save();
        res.status(201).json({ message: 'Task assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all tasks assigned by admin
const getAdminTasks = async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        if (date) {
            const isToday = (date === getISTTime().date);
            query = {
                $or: [
                    { due_date: date },
                    { assigned_date: date },
                    { completed_date: date }
                ]
            };
            if (isToday) {
                query.$or.push({
                    due_date: { $lt: date },
                    status: { $in: ['pending', 'in_progress'] }
                });
            }
        }

        const tasks = await Task.find(query).sort({ createdAt: -1 });
        const employees = await Employee.find({});
        const empMap = employees.reduce((acc, e) => {
            acc[e.emp_no] = {
                name: e.name,
                full_name: e.full_name,
                profile_picture: e.profile_picture
            };
            return acc;
        }, {});

        const result = tasks.map(t => {
            const empInfo = empMap[t.emp_no] || {};
            return {
                id: t._id,
                emp_no: t.emp_no,
                emp_name: empInfo.full_name || empInfo.name || 'Unknown',
                profile_picture: empInfo.profile_picture,
                task_type: t.task_type,
                title: t.title,
                description: t.description,
                status: t.status,
                completion_percentage: t.completion_percentage,
                reason: t.reason,
                assigned_date: t.assigned_date,
                due_date: t.due_date,
                completed_date: t.completed_date,
                is_self_assigned: t.is_self_assigned,
                created_at: t.createdAt
            };
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin responds to employee's decline (approve or reject)
const respondToDecline = async (req, res) => {
    const { id } = req.params;
    const { action, note } = req.body;

    try {
        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (action === 'approve') {
            await Task.findByIdAndDelete(id);
            return res.json({ message: 'Task removed successfully' });
        } else if (action === 'reject') {
            task.status = 'pending';
            task.admin_note = note || 'Decline rejected by admin. Please complete the task.';
            // Keep the employee's original reason in 'reason' but clear it from being "declined"
            await task.save();
            return res.json({ message: 'Decline rejected. Task sent back to employee.', task });
        } else {
            return res.status(400).json({ message: 'Invalid action. Use approve or reject.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete employee (Admin only)
const deleteEmployee = async (req, res) => {
    const { emp_no } = req.params;
    try {
        const employee = await Employee.findOne({ emp_no });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (employee.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin accounts' });
        }

        await Employee.deleteOne({ emp_no });
        // Optionally delete tasks and attendance too
        await Task.deleteMany({ emp_no });
        await Attendance.deleteMany({ emp_no });

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete task (Admin only)
const deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        await Task.findByIdAndDelete(id);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all login requests (Admin only)
const getLoginRequests = async (req, res) => {
    try {
        const LoginRequest = require('../models/LoginRequest');
        const employees = await Employee.find({});
        const empMap = employees.reduce((acc, e) => {
            acc[e.emp_no] = {
                name: e.name,
                full_name: e.full_name,
                profile_picture: e.profile_picture
            };
            return acc;
        }, {});

        const requests = await LoginRequest.find({}).sort({ createdAt: -1 });

        const result = requests.map(r => ({
            id: r._id,
            emp_no: r.emp_no,
            emp_name: empMap[r.emp_no]?.full_name || empMap[r.emp_no]?.name || 'Unknown',
            request_time: r.request_time,
            reason: r.reason,
            status: r.status,
            device_info: r.device_info,
            approved_by: r.approved_by,
            approval_time: r.approval_time,
            expiry_time: r.expiry_time
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Approve or reject login request (Admin only)
const handleLoginRequest = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'Approved' or 'Rejected'
    const admin_emp_no = req.user.emp_no;

    try {
        const LoginRequest = require('../models/LoginRequest');
        const request = await LoginRequest.findById(id);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (action === 'Approved') {
            request.status = 'Approved';
            request.approved_by = admin_emp_no;
            request.approval_time = new Date();
            // Approval valid for 1 hour
            request.expiry_time = new Date(Date.now() + 60 * 60 * 1000);
        } else if (action === 'Rejected') {
            request.status = 'Rejected';
            request.approved_by = admin_emp_no;
            request.approval_time = new Date();
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await request.save();

        // Notify employee via socket
        const io = req.app.get('io');
        if (io) {
            io.to(request.emp_no).emit('login_request_result', {
                status: action,
                message: action === 'Approved' ? 'Your login request has been approved.' : 'Your login request has been rejected.'
            });
        }

        res.json({ message: `Login request ${action.toLowerCase()} successfully`, request });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Force logout all active employees
const forceLogoutAll = async (req, res) => {
    try {
        const Session = require('../models/Session');
        const istTime = getISTTime();
        const now = istTime.datetime;

        // 1. Find and close ALL active attendance records (even if from previous days)
        const activeRecords = await Attendance.find({
            logout_time: null
        });

        for (const record of activeRecords) {
            // If it's today's record and it's past 7 PM, use 7 PM as logout time
            // Otherwise use current IST time
            record.logout_time = (record.date === istTime.date && new Date() > istTime.sevenPM)
                ? istTime.sevenPM.toISOString()
                : now;
            record.session_status = 'Forced Logout';
            record.logout_reason = 'Terminated by Admin';
            await record.save();
        }

        // 2. Deactivate all active sessions in the database
        await Session.updateMany({ is_active: true }, { is_active: false });

        // 3. Notify all employees via socket
        const io = req.app.get('io');
        if (io) {
            io.emit('force_logout', {
                message: 'Administrator has ended all active working sessions.'
            });
        }

        res.json({ message: 'All active sessions have been terminated successfully.' });
    } catch (error) {
        console.error('Force logout all failed:', error);
        res.status(500).json({ message: 'Server error while terminating sessions' });
    }
};

// @desc    Force logout a specific employee
const forceLogoutEmployee = async (req, res) => {
    const { emp_no } = req.params;
    try {
        const Session = require('../models/Session');
        const istTime = getISTTime();
        const now = istTime.datetime;
        const today = istTime.date;

        // 1. Find and close any active attendance record for this employee (any date)
        const record = await Attendance.findOne({
            emp_no,
            logout_time: null
        }).sort({ login_time: -1 });

        if (record) {
            const isToday = record.date === istTime.date;
            const pastSeven = new Date() > istTime.sevenPM;

            record.logout_time = (isToday && pastSeven) ? istTime.sevenPM.toISOString() : now;
            record.session_status = 'Forced Logout';
            record.logout_reason = 'Terminated by Admin';
            await record.save();
        }

        // 2. Deactivate active sessions for this employee
        await Session.updateMany({ emp_no, is_active: true }, { is_active: false });

        // 3. Notify the employee via specific socket room
        const io = req.app.get('io');
        if (io) {
            io.to(emp_no).emit('force_logout', {
                message: 'Administrator has ended your active working session.'
            });
        }

        res.json({ success: true, message: `Session for employee #${emp_no} has been terminated.` });
    } catch (error) {
        console.error(`Force logout for ${emp_no} failed:`, error);
        res.status(500).json({ message: 'Server error while terminating session' });
    }
};

module.exports = {
    getEmployees,
    getDailyReports,
    getAnalytics,
    createEmployee,
    assignTask,
    getAdminTasks,
    respondToDecline,
    deleteEmployee,
    deleteTask,
    getLoginRequests,
    handleLoginRequest,
    forceLogoutAll,
    forceLogoutEmployee
};

