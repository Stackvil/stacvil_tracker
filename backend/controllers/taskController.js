const Task = require('../models/Task');
const { getISTTime } = require('./utilsController');

// @desc    Get employee tasks grouped by status
// @route   GET /api/tasks/employee
const getEmployeeTasks = async (req, res) => {
    const { emp_no } = req.user;

    try {
        const istTime = getISTTime();
        const today = istTime.date;
        const now = new Date();
        const istOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false };
        const currentISTTime = new Intl.DateTimeFormat('en-GB', istOptions).format(now);

        const tasks = await Task.find({ emp_no }).sort({ due_date: 1 });

        const normalizedTasks = tasks.map(t => {
            let calculated_status = t.status;
            if (t.status === 'pending' || t.status === 'in_progress') {
                if (t.due_date < today) {
                    calculated_status = 'overdue';
                } else if (t.due_date === today && t.end_time && currentISTTime > t.end_time) {
                    calculated_status = 'overdue';
                }
            }
            const doc = t._doc ? t._doc : (typeof t.toObject === 'function' ? t.toObject() : JSON.parse(JSON.stringify(t)));
            const is_today = (t.due_date === today || t.assigned_date === today) && !['completed', 'declined'].includes(calculated_status);
            const is_overdue = calculated_status === 'overdue';

            return {
                ...doc,
                _id: t._id || t.id,
                id: t._id || t.id,
                start_time: t.start_time || '',
                end_time: t.end_time || '',
                calculated_status,
                is_today,
                is_overdue
            };
        });

        // If client specifically asks for grouped structure
        if (req.query.grouped === 'true') {
            const groupedTasks = {
                today: normalizedTasks.filter(t => (t.due_date === today || t.calculated_status === 'overdue') && !['completed', 'declined'].includes(t.calculated_status)),
                pending: normalizedTasks.filter(t => t.due_date > today && !['completed', 'declined'].includes(t.calculated_status)),
                overdue: normalizedTasks.filter(t => t.calculated_status === 'overdue'),
                declined: normalizedTasks.filter(t => t.calculated_status === 'declined'),
                completed: normalizedTasks.filter(t => t.calculated_status === 'completed')
            };
            return res.json(groupedTasks);
        }

        // Default: return array of tasks with flags so Array.forEach and Array.isArray work cleanly in all views
        res.json(normalizedTasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update task status and completion (employee only)
const updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { emp_no } = req.user;
    const { action, completion_percentage, reason } = req.body;

    try {
        const query = (req.user && req.user.role === 'admin')
            ? { _id: id }
            : { _id: id, emp_no };
        const task = await Task.findOne(query);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (['completed', 'declined'].includes(task.status)) {
            return res.status(400).json({ message: 'Cannot modify a finalized task' });
        }

        if (action === 'complete' || action === 'completed' || action === 'done') {
            task.status = 'completed';
            task.completion_percentage = 100;
            task.completed_date = getISTTime().date;
        } else if (action === 'accept' || action === 'in_progress' || action === 'start') {
            task.status = 'in_progress';
        } else if (action === 'decline') {
            if (!reason) return res.status(400).json({ message: 'Reason required' });
            task.status = 'declined';
            task.reason = reason;
        } else if (action === 'update_progress') {
            const pct = parseInt(completion_percentage);
            if (isNaN(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ message: 'Invalid percentage' });
            }
            task.completion_percentage = pct;
            if (pct === 100) {
                task.status = 'completed';
                task.completed_date = getISTTime().date;
            } else if (task.status === 'pending') {
                task.status = 'in_progress';
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await task.save();
        const io = req.app.get('io');
        if (io) {
            io.to(emp_no).emit('task_updated');
            io.emit('task_updated_global');
        }
        res.json({ message: 'Task updated', task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get task history for employee
const getTaskHistory = async (req, res) => {
    const { emp_no } = req.user;
    const { limit = 50, skip = 0 } = req.query;

    try {
        const tasks = await Task.find({ emp_no })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Self-assign task (Employee added task)
const createSelfAssignedTask = async (req, res) => {
    const { emp_no } = req.user;
    const { title, description, start_time, end_time } = req.body;

    try {
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        const istTime = getISTTime();
        const today = istTime.date;

        const task = new Task({
            emp_no,
            task_type: 'daily', // Self-assigned are daily tasks for today
            assigned_date: today,
            due_date: today,
            start_time: start_time || '',
            end_time: end_time || '',
            title,
            description: description || '',
            completion_percentage: 0,
            status: 'in_progress', // Self-assigned tasks start as in_progress
            is_self_assigned: true
        });

        await task.save();
        const io = req.app.get('io');
        if (io) {
            io.to(emp_no).emit('task_updated');
            io.emit('task_updated_global');
        }
        res.status(201).json({ message: 'Task added successfully', task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getEmployeeTasks, updateTaskStatus, getTaskHistory, createSelfAssignedTask };
