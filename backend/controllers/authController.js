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
        // Only set login_time if it doesn't exist for today ($setOnInsert), 
        // but always ensure logout_time is null for the active session.
        try {
            await Attendance.findOneAndUpdate(
                { emp_no: employee.emp_no, date: today },
                {
                    $setOnInsert: { login_time: now },
                    $set: { logout_time: null }
                },
                { upsert: true, new: true }
            );
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

    try {
        const istTime = getISTTime();
        const nowStr = istTime.datetime;
        const today = istTime.date;

        const record = await Attendance.findOne({
            emp_no,
            date: today,
            logout_time: null
        }).sort({ login_time: -1 });

        let duration = null;
        if (record) {
            record.logout_time = nowStr;
            await record.save();

            // Calculate duration correctly using the new ISO timestamps
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
