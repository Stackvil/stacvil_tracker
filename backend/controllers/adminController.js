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
        const activeAttendance = await Attendance.find({ date: today, logout_time: null });
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

    try {
        const employees = await Employee.find({ role: 'employee' }).sort({ emp_no: 1 });
        const attendances = await Attendance.find({ date: filterDate });
        const tasksQuery = filterDate === istTime.date
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

            // For simplicity, pick the first task found for that date if multiple exist
            const t = empTasks[0] || {};

            const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB') : 'N/A';

            let totalMs = 0;
            const sessions = empAttendances.map(att => {
                let durationMs = 0;
                if (att.login_time && att.logout_time) {
                    durationMs = new Date(att.logout_time) - new Date(att.login_time);
                    totalMs += durationMs;
                }
                return {
                    login: formatTime(att.login_time),
                    logout: formatTime(att.logout_time),
                    is_active: !att.logout_time
                };
            });

            let working_hours = 'N/A';
            if (empAttendances.length > 0) {
                const hasActive = empAttendances.some(a => !a.logout_time);
                if (totalMs > 0 || !hasActive) {
                    const hrs = Math.floor(totalMs / 3600000);
                    const mins = Math.floor((totalMs % 3600000) / 60000);
                    working_hours = `${hrs}:${mins.toString().padStart(2, '0')}:00`;
                    if (hasActive) working_hours += ' (Active)';
                } else {
                    working_hours = 'Running';
                }
            }

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
                working_hours
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

module.exports = { getEmployees, getDailyReports, getAnalytics, createEmployee, assignTask, getAdminTasks, respondToDecline, deleteEmployee, deleteTask };
