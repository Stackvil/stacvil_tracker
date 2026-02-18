const pool = require('../config/db');
const { getISTTime } = require('./utilsController');

// @desc    Get employee tasks grouped by status
// @route   GET /api/tasks/employee
const getEmployeeTasks = async (req, res) => {
    const { emp_no } = req.user;

    try {
        const istTime = getISTTime();
        const today = istTime.date;

        const query = `
            SELECT 
                id,
                emp_no,
                task_type,
                assigned_date,
                due_date,
                completed_date,
                title,
                description,
                completion_percentage,
                status,
                reason,
                created_at,
                updated_at,
                CASE 
                    WHEN status = 'completed' THEN 'completed'
                    WHEN status = 'declined' THEN 'declined'
                    WHEN due_date < ? AND status NOT IN ('completed', 'declined') THEN 'overdue'
                    WHEN completion_percentage > 0 AND status NOT IN ('completed', 'declined') THEN 'in_progress'
                    ELSE 'pending'
                END as calculated_status
            FROM tasks
            WHERE emp_no = ?
            ORDER BY 
                CASE 
                    WHEN status = 'completed' THEN 5
                    WHEN status = 'declined' THEN 4
                    WHEN due_date < ? AND status NOT IN ('completed', 'declined') THEN 1
                    WHEN due_date = ? THEN 2
                    ELSE 3
                END,
                due_date ASC
        `;

        const [tasks] = await pool.execute(query, [today, emp_no, today, today]);

        const toDateStr = (d) => {
            if (!d) return null;
            if (typeof d === 'string') return d.substring(0, 10);
            if (d instanceof Date) {
                // Use IST locale to avoid UTC offset shifting the date
                return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD
            }
            return String(d).substring(0, 10);
        };

        const normalizedTasks = tasks.map(t => ({
            ...t,
            assigned_date: toDateStr(t.assigned_date),
            due_date: toDateStr(t.due_date),
            completed_date: toDateStr(t.completed_date),
        }));

        // Group tasks by category
        const groupedTasks = {
            today: normalizedTasks.filter(t => t.due_date === today && !['completed', 'overdue', 'declined'].includes(t.calculated_status)),
            pending: normalizedTasks.filter(t => t.due_date > today && !['completed', 'declined'].includes(t.calculated_status)),
            overdue: normalizedTasks.filter(t => t.calculated_status === 'overdue'),
            declined: normalizedTasks.filter(t => t.calculated_status === 'declined'),
            completed: normalizedTasks.filter(t => t.calculated_status === 'completed')
        };

        res.json(groupedTasks);
    } catch (error) {
        console.error('Error fetching employee tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update task status and completion (employee only)
// @route   PUT /api/tasks/:id
// Supports: accept (pending→in_progress), decline (requires reason), update completion_percentage
const updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { emp_no } = req.user;
    const { action, completion_percentage, reason } = req.body;

    try {
        // Verify task belongs to employee
        const [tasks] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ? AND emp_no = ?',
            [id, emp_no]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found or access denied' });
        }

        const task = tasks[0];

        // Prevent modifying completed or declined tasks
        if (task.status === 'completed') {
            return res.status(400).json({ message: 'Cannot modify a completed task' });
        }
        if (task.status === 'declined') {
            return res.status(400).json({ message: 'Cannot modify a declined task' });
        }

        const updateFields = [];
        const updateValues = [];

        if (action === 'accept') {
            // Employee accepts the task → in_progress
            updateFields.push('status = ?');
            updateValues.push('in_progress');

        } else if (action === 'decline') {
            // Employee declines the task → requires reason
            if (!reason || reason.trim() === '') {
                return res.status(400).json({ message: 'A reason is required when declining a task' });
            }
            updateFields.push('status = ?');
            updateValues.push('declined');
            updateFields.push('reason = ?');
            updateValues.push(reason.trim());

        } else if (action === 'update_progress') {
            // Employee updates completion percentage (only when in_progress)
            if (task.status !== 'in_progress') {
                return res.status(400).json({ message: 'Accept the task before updating progress' });
            }
            if (completion_percentage === undefined) {
                return res.status(400).json({ message: 'completion_percentage is required' });
            }
            const pct = parseInt(completion_percentage);
            if (isNaN(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ message: 'Completion percentage must be between 0 and 100' });
            }
            updateFields.push('completion_percentage = ?');
            updateValues.push(pct);

            // Auto-complete when 100%
            if (pct === 100) {
                const istTime = getISTTime();
                updateFields.push('status = ?');
                updateValues.push('completed');
                updateFields.push('completed_date = ?');
                updateValues.push(istTime.date);
            } else {
                updateFields.push('status = ?');
                updateValues.push('in_progress');
            }
        } else {
            return res.status(400).json({ message: 'Invalid action. Use: accept, decline, or update_progress' });
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const updateQuery = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ? AND emp_no = ?`;
        updateValues.push(id, emp_no);
        await pool.execute(updateQuery, updateValues);

        const [updatedTasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        res.json({
            message: 'Task updated successfully',
            task: updatedTasks[0]
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get task history for employee
// @route   GET /api/tasks/history
const getTaskHistory = async (req, res) => {
    const { emp_no } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    try {
        const query = `
            SELECT * FROM tasks
            WHERE emp_no = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [tasks] = await pool.execute(query, [emp_no, parseInt(limit), parseInt(offset)]);

        res.json(tasks);
    } catch (error) {
        console.error('Error fetching task history:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getEmployeeTasks,
    updateTaskStatus,
    getTaskHistory
};
