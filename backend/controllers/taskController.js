const Task = require('../models/Task');
const { getISTTime } = require('./utilsController');

// @desc    Get employee tasks grouped by status
// @route   GET /api/tasks/employee
const getEmployeeTasks = async (req, res) => {
    const { emp_no } = req.user;

    try {
        const istTime = getISTTime();
        const today = istTime.date;

        const tasks = await Task.find({ emp_no }).sort({ due_date: 1 });

        const normalizedTasks = tasks.map(t => {
            let calculated_status = t.status;
            if (t.status === 'pending' || t.status === 'in_progress') {
                if (t.due_date < today) {
                    calculated_status = 'overdue';
                }
            }
            return {
                ...t.toObject(),
                id: t._id,
                calculated_status
            };
        });

        const groupedTasks = {
            today: normalizedTasks.filter(t => t.due_date === today && !['completed', 'overdue', 'declined'].includes(t.calculated_status)),
            pending: normalizedTasks.filter(t => t.due_date > today && !['completed', 'declined'].includes(t.calculated_status)),
            overdue: normalizedTasks.filter(t => t.calculated_status === 'overdue'),
            declined: normalizedTasks.filter(t => t.calculated_status === 'declined'),
            completed: normalizedTasks.filter(t => t.calculated_status === 'completed')
        };

        res.json(groupedTasks);
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
        const task = await Task.findOne({ _id: id, emp_no });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (['completed', 'declined'].includes(task.status)) {
            return res.status(400).json({ message: 'Cannot modify a finalized task' });
        }

        if (action === 'accept') {
            task.status = 'in_progress';
        } else if (action === 'decline') {
            if (!reason) return res.status(400).json({ message: 'Reason required' });
            task.status = 'declined';
            task.reason = reason;
        } else if (action === 'update_progress') {
            if (task.status !== 'in_progress') {
                return res.status(400).json({ message: 'Accept task first' });
            }
            const pct = parseInt(completion_percentage);
            if (isNaN(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ message: 'Invalid percentage' });
            }
            task.completion_percentage = pct;
            if (pct === 100) {
                task.status = 'completed';
                task.completed_date = getISTTime().date;
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await task.save();
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

module.exports = { getEmployeeTasks, updateTaskStatus, getTaskHistory };
