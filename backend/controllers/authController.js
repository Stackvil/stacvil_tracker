const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const jwt = require('jsonwebtoken');
const { getISTTime } = require('./utilsController');

// @desc    Register a new employee
// @route   POST /api/auth/register
const registerEmployee = async (req, res) => {
    const { emp_no, name, email, password, role } = req.body;

    try {
        // Check if employee exists
        const existingEmp = await Employee.findOne({ $or: [{ emp_no }, { email }] });
        if (existingEmp) {
            return res.status(400).json({ message: 'Employee with this ID or email already exists' });
        }

        // Create employee (Mongoose middleware handles hashing)
        const employee = new Employee({
            emp_no,
            name,
            email,
            password,
            role: role || 'employee'
        });

        await employee.save();
        res.status(201).json({ message: 'Employee registered successfully' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({
            message: 'Server error during registration',
            error: error.message
        });
    }
};

// @desc    Login employee & get token
// @route   POST /api/auth/login
const loginEmployee = async (req, res) => {
    const { emp_no, password } = req.body;
    const cleanEmpNo = emp_no?.trim().toUpperCase();

    try {
        console.log(`[AUTH] Login attempt: "${emp_no}" -> "${cleanEmpNo}"`);

        const employee = await Employee.findOne({
            $or: [
                { emp_no: cleanEmpNo },
                { email: emp_no?.toLowerCase().trim() }
            ]
        });

        if (!employee) {
            console.log(`[AUTH] User not found: "${cleanEmpNo}"`);
            return res.status(401).json({ message: 'Invalid Employee ID' });
        }

        console.log(`[AUTH] Comparing password for ${employee.emp_no}...`);
        const isMatch = await employee.comparePassword(password);
        console.log(`[AUTH] Match result: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing');
        }

        const token = jwt.sign(
            { id: employee._id, emp_no: employee.emp_no, role: employee.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        const istTime = getISTTime();
        const today = istTime.date;
        const now = istTime.datetime;

        // Record login time (don't block login if this fails)
        // Create a NEW record for every login to track multiple sessions in a day
        try {
            const attendance = new Attendance({
                emp_no: employee.emp_no,
                login_time: now,
                date: today
            });
            await attendance.save();
        } catch (attErr) {
            console.error('[AUTH] Attendance log failed:', attErr.message);
        }

        res.json({
            token,
            user: {
                id: employee._id,
                emp_no: employee.emp_no,
                name: employee.name,
                role: employee.role,
                login_time: now
            }
        });
    } catch (error) {
        console.error('[AUTH] Login Error:', error);
        res.status(500).json({
            message: 'Server error during login',
            error: error.message
        });
    }
};

// @desc    Logout employee
// @route   POST /api/auth/logout
const logoutEmployee = async (req, res) => {
    const { emp_no } = req.user;
    const { statusUpdates } = req.body; // Expecting [{ taskId, completion_percentage, reason }]

    try {
        const istTime = getISTTime();
        const nowStr = istTime.datetime;
        const today = istTime.date;

        // 1. Process Task Updates if any
        if (statusUpdates && Array.isArray(statusUpdates)) {
            const Task = require('../models/Task');
            for (const update of statusUpdates) {
                const { taskId, completion_percentage, reason } = update;
                const task = await Task.findOne({ _id: taskId, emp_no });
                if (task) {
                    const pct = parseInt(completion_percentage);
                    if (!isNaN(pct)) {
                        task.completion_percentage = pct;
                        if (pct === 100) {
                            task.status = 'completed';
                            task.completed_date = today;
                        } else if (pct > 0) {
                            task.status = 'in_progress';
                        }
                    }
                    if (reason) {
                        task.reason = reason;
                    }
                    await task.save();
                }
            }
        }

        // 2. Find and close the latest active attendance record
        const record = await Attendance.findOne({
            emp_no,
            date: today,
            logout_time: null
        }).sort({ login_time: -1 });

        let duration = null;
        if (record) {
            record.logout_time = nowStr;
            await record.save();

            // Calculate duration correctly
            const loginTime = new Date(record.login_time);
            const logoutTime = new Date(nowStr);
            const diffMs = logoutTime - loginTime;

            if (diffMs > 0) {
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                duration = {
                    hours: diffHrs,
                    minutes: diffMins,
                    formatted: `${diffHrs}h ${diffMins}m`
                };
            }
        }

        res.json({
            message: 'Logged out successfully',
            duration: duration
        });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({
            message: 'Server error during logout',
            error: error.message
        });
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { emp_no } = req.user;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        const employee = await Employee.findOne({ emp_no });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const isMatch = await employee.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        employee.password = newPassword; // Mongoose middleware will hash this
        await employee.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({
            message: 'Server error during password change',
            error: error.message
        });
    }
};

module.exports = { registerEmployee, loginEmployee, logoutEmployee, changePassword };
