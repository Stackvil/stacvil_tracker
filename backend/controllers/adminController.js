const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { getISTTime } = require('./utilsController');

// @desc    Get all employees
// @route   GET /api/admin/employees
const getEmployees = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                e.id, 
                e.emp_no, 
                e.name, 
                e.email, 
                e.role,
                CASE 
                    WHEN a.login_time IS NOT NULL AND a.logout_time IS NULL THEN 'active'
                    ELSE 'inactive'
                END as status
            FROM employees e
            LEFT JOIN attendance a ON e.emp_no = a.emp_no AND a.date = ?
        `;

        const [employees] = await pool.execute(query, [today]);
        res.json(employees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get daily reports
// @route   GET /api/admin/reports/daily
const getDailyReports = async (req, res) => {
    const { date } = req.query;
    const filterDate = date || new Date().toISOString().split('T')[0];

    try {
        const query = `
      SELECT 
        e.emp_no, e.name, 
        COALESCE(DATE_FORMAT(a.login_time, '%H:%i:%s'), 'N/A') as login_time, 
        COALESCE(DATE_FORMAT(a.logout_time, '%H:%i:%s'), 'N/A') as logout_time, 
        COALESCE(t.title, 'No Task') as title, 
        COALESCE(t.status, 'N/A') as status, 
        COALESCE(t.completion_percentage, 0) as completion_percentage,
        COALESCE(DATE_FORMAT(t.assigned_date, '%Y-%m-%d'), 'N/A') as assigned_date,
        COALESCE(DATE_FORMAT(t.due_date, '%Y-%m-%d'), 'N/A') as due_date,
        COALESCE(DATE_FORMAT(t.completed_date, '%Y-%m-%d'), 'N/A') as completed_date,
        CASE 
          WHEN a.logout_time IS NOT NULL THEN TIMEDIFF(a.logout_time, a.login_time)
          ELSE 'Running'
        END as working_hours
      FROM employees e
      LEFT JOIN attendance a ON e.emp_no = a.emp_no AND a.date = ?
      LEFT JOIN tasks t ON e.emp_no = t.emp_no AND (t.due_date = ? OR t.assigned_date = ?)
      WHERE e.role = 'employee'
      ORDER BY e.emp_no ASC
    `;
        const [reports] = await pool.execute(query, [filterDate, filterDate, filterDate]);
        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get analytics (Weekly/Monthly)
// @route   GET /api/admin/analytics
const getAnalytics = async (req, res) => {
    try {
        const [avgCompletion] = await pool.execute(
            'SELECT AVG(completion_percentage) as avg_completion FROM tasks'
        );

        const [workingHours] = await pool.execute(`
      SELECT emp_no, SUM(TIMESTAMPDIFF(HOUR, login_time, logout_time)) as total_hours
      FROM attendance
      WHERE logout_time IS NOT NULL
      GROUP BY emp_no
    `);

        const [taskStats] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);

        res.json({
            avgCompletion: avgCompletion[0]?.avg_completion || 0,
            workingHours: workingHours || [],
            taskStats: taskStats || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create employee (Admin only)
// @route   POST /api/admin/employees
const createEmployee = async (req, res) => {
    const { emp_no, name, email, password, role } = req.body;

    try {
        if (!emp_no || !name || !email || !password) {
            return res.status(400).json({ message: 'Employee ID, name, email, and password are required' });
        }

        const [existingEmp] = await pool.execute('SELECT * FROM employees WHERE emp_no = ? OR email = ?', [emp_no, email]);

        if (existingEmp.length > 0) {
            return res.status(400).json({ message: 'Employee with this ID or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.execute(
            'INSERT INTO employees (emp_no, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [emp_no, name, email, hashedPassword, role || 'employee']
        );

        res.status(201).json({ message: 'Employee created successfully' });
    } catch (error) {
        console.error('Error creating employee:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Employee ID or email already exists' });
        }
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'Database connection failed. Please try again later.' });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ message: 'Database tables not found. Please run: npm run setup-db' });
        }
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Assign task to employee (Admin only)
// @route   POST /api/admin/tasks/assign
// Admin only provides: emp_no, title, description, task_type ('daily' or 'custom'), due_date (only for custom)
// No dates or completion % set by admin — those are auto-set or employee-controlled
const assignTask = async (req, res) => {
    const { emp_no, title, description, task_type, due_date } = req.body;

    try {
        if (!emp_no || !title || !task_type) {
            return res.status(400).json({ message: 'Employee ID, title, and task type are required' });
        }

        if (!['daily', 'custom'].includes(task_type)) {
            return res.status(400).json({ message: 'Task type must be "daily" or "custom"' });
        }

        if (task_type === 'custom' && !due_date) {
            return res.status(400).json({ message: 'Due date is required for custom tasks' });
        }

        // Get today's date in IST
        const istTime = getISTTime();
        const today = istTime.date;

        // For daily tasks, due_date = today; for custom, use provided due_date
        const finalDueDate = task_type === 'daily' ? today : due_date;

        // Validate custom due date is not in the past
        if (task_type === 'custom' && finalDueDate < today) {
            return res.status(400).json({ message: 'Due date cannot be in the past' });
        }

        // Verify employee exists
        const [employee] = await pool.execute('SELECT * FROM employees WHERE emp_no = ?', [emp_no]);
        if (employee.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Create task — completion always 0, status always pending, employee controls progress
        await pool.execute(
            'INSERT INTO tasks (emp_no, task_type, assigned_date, due_date, title, description, completion_percentage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [emp_no, task_type, today, finalDueDate, title, description || '', 0, 'pending']
        );

        res.status(201).json({ message: 'Task assigned successfully' });
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all tasks assigned by admin (with employee info and status)
// @route   GET /api/admin/tasks
const getAdminTasks = async (req, res) => {
    try {
        const query = `
            SELECT 
                t.id,
                t.emp_no,
                e.name as emp_name,
                t.task_type,
                t.title,
                t.description,
                t.status,
                t.completion_percentage,
                t.reason,
                DATE_FORMAT(t.assigned_date, '%Y-%m-%d') as assigned_date,
                DATE_FORMAT(t.due_date, '%Y-%m-%d') as due_date,
                DATE_FORMAT(t.completed_date, '%Y-%m-%d') as completed_date,
                t.created_at
            FROM tasks t
            JOIN employees e ON t.emp_no = e.emp_no
            ORDER BY t.created_at DESC
        `;
        const [tasks] = await pool.execute(query);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching admin tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin accepts employee's decline → task is deleted
// @route   DELETE /api/admin/tasks/:id
const respondToDecline = async (req, res) => {
    const { id } = req.params;

    try {
        // Verify task exists and is declined
        const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Delete the task (admin accepts the decline)
        await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);

        res.json({ message: 'Task removed successfully' });
    } catch (error) {
        console.error('Error removing task:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete employee (Admin only)
// @route   DELETE /api/admin/employees/:emp_no
const deleteEmployee = async (req, res) => {
    const { emp_no } = req.params;

    try {
        const [employee] = await pool.execute('SELECT * FROM employees WHERE emp_no = ?', [emp_no]);

        if (employee.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (employee[0].role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin accounts' });
        }

        await pool.execute('DELETE FROM employees WHERE emp_no = ?', [emp_no]);

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getEmployees, getDailyReports, getAnalytics, createEmployee, assignTask, getAdminTasks, respondToDecline, deleteEmployee };
