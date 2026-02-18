const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getISTTime } = require('./utilsController');

// @desc    Register a new employee
// @route   POST /api/auth/register
const registerEmployee = async (req, res) => {
    const { emp_no, name, email, password, role } = req.body;

    try {
        // Check if employee exists
        const [existingEmp] = await pool.execute('SELECT * FROM employees WHERE emp_no = ? OR email = ?', [emp_no, email]);

        if (existingEmp.length > 0) {
            return res.status(400).json({ message: 'Employee with this ID or email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert employee
        await pool.execute(
            'INSERT INTO employees (emp_no, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [emp_no, name, email, hashedPassword, role || 'employee']
        );

        res.status(201).json({ message: 'Employee registered successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'Database connection failed. Please try again later.' });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ message: 'Database tables not found. Please run: npm run setup-db' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login employee & get token
// @route   POST /api/auth/login
const loginEmployee = async (req, res) => {
    const { emp_no, password } = req.body;

    try {
        // Check employee
        const [rows] = await pool.execute('SELECT * FROM employees WHERE emp_no = ?', [emp_no]);
        const employee = rows[0];

        if (!employee) {
            return res.status(401).json({ message: 'Invalid Employee ID' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, employee.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create JWT
        const token = jwt.sign(
            { id: employee.id, emp_no: employee.emp_no, role: employee.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // Record login time - Update if today's record exists, otherwise insert new
        // Get IST time from helper function
        const istTime = getISTTime();
        const today = istTime.date;
        const now = istTime.datetime;

        // Check if attendance record exists for today
        const [existingAttendance] = await pool.execute(
            'SELECT id FROM attendance WHERE emp_no = ? AND date = ?',
            [emp_no, today]
        );

        if (existingAttendance.length > 0) {
            // Update existing record's login_time
            await pool.execute(
                'UPDATE attendance SET login_time = ? WHERE emp_no = ? AND date = ?',
                [now, emp_no, today]
            );
        } else {
            // Insert new attendance record
            await pool.execute(
                'INSERT INTO attendance (emp_no, login_time, date) VALUES (?, ?, ?)',
                [emp_no, now, today]
            );
        }

        res.json({
            token,
            user: {
                id: employee.id,
                emp_no: employee.emp_no,
                name: employee.name,
                role: employee.role,
                login_time: now
            }
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'Database connection failed. Please try again later.' });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ message: 'Database tables not found. Please run: npm run setup-db' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Logout employee
// @route   POST /api/auth/logout
const logoutEmployee = async (req, res) => {
    const { emp_no } = req.user; // From auth middleware

    try {
        // Get IST time from helper function
        const istTime = getISTTime();
        const nowStr = istTime.datetime;
        const today = istTime.date;

        // Get the latest login time for today
        const [rows] = await pool.execute(
            'SELECT login_time FROM attendance WHERE emp_no = ? AND date = ? AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1',
            [emp_no, today]
        );

        let duration = null;
        if (rows.length > 0) {
            const loginTime = new Date(rows[0].login_time);
            const diffMs = istTime.timestamp - loginTime;
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMins = Math.floor((diffMs % 3600000) / 60000);
            duration = {
                hours: diffHrs,
                minutes: diffMins,
                formatted: `${diffHrs}h ${diffMins}m`
            };
        }

        // Update logout_time
        await pool.execute(
            'UPDATE attendance SET logout_time = ? WHERE emp_no = ? AND date = ? AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1',
            [nowStr, emp_no, today]
        );

        res.json({
            message: 'Logged out successfully',
            duration: duration
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'Database connection failed. Please try again later.' });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ message: 'Database tables not found. Please run: npm run setup-db' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const emp_no = req.user.emp_no;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        // Get current employee
        const [rows] = await pool.execute('SELECT * FROM employees WHERE emp_no = ?', [emp_no]);
        const employee = rows[0];

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, employee.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.execute(
            'UPDATE employees SET password = ? WHERE emp_no = ?',
            [hashedPassword, emp_no]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { registerEmployee, loginEmployee, logoutEmployee, changePassword };
