const path = require('path');
const fs = require('fs');
const IntervalUpdate = require('../models/IntervalUpdate');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const { getISTTime } = require('./utilsController');

// Helper to format file size
const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// @desc    Submit a 3-hour periodic work progress update with proof attachments
// @route   POST /api/tasks/interval-update
const submitIntervalUpdate = async (req, res) => {
    try {
        const { emp_no } = req.user;
        const { 
            task_id, 
            task_title, 
            completion_percentage, 
            work_done, 
            deliverables, 
            hours_spent,
            blockers, 
            next_plan, 
            proof_link,
            interval_type
        } = req.body;
        const istTime = getISTTime();

        if (!work_done || !work_done.trim()) {
            return res.status(400).json({ message: 'Please describe the work done in this 3-hour interval' });
        }

        const employee = await Employee.findOne({ emp_no });
        const employeeName = employee ? (employee.full_name || employee.name) : emp_no;
        const department = employee ? (employee.department || 'Engineering') : 'General';

        let proofAttachmentName = '';
        let proofAttachmentUrl = '';
        let proofAttachmentSize = '';

        // Handle file uploaded via Multer
        if (req.file) {
            proofAttachmentName = req.file.originalname;
            proofAttachmentUrl = `/uploads/${req.file.filename}`;
            proofAttachmentSize = formatBytes(req.file.size);
        }

        const updateRecord = new IntervalUpdate({
            emp_no,
            employeeName,
            department,
            interval_type: interval_type || '3hour',
            task_id: task_id || null,
            task_title: (task_title && task_title.trim()) || '3-Hour Milestone Progress',
            completion_percentage: completion_percentage !== undefined && completion_percentage !== '' ? Number(completion_percentage) : 100,
            work_done: work_done.trim(),
            deliverables: deliverables ? deliverables.trim() : '',
            hours_spent: hours_spent ? Number(hours_spent) : 3,
            blockers: blockers ? blockers.trim() : '',
            next_plan: next_plan ? next_plan.trim() : '',
            proof_link: proof_link ? proof_link.trim() : '',
            proof_attachment_name: proofAttachmentName,
            proof_attachment_url: proofAttachmentUrl,
            proof_attachment_size: proofAttachmentSize,
            admin_rating: null,
            admin_feedback: '',
            admin_rated_at: null,
            admin_rated_by: null,
            status: 'submitted',
            date: istTime.date,
            time: istTime.time,
            timestamp: istTime.datetime,
            createdAt: istTime.datetime
        });

        await updateRecord.save();

        // If task_id provided, update task progress too
        if (task_id && completion_percentage !== undefined && completion_percentage !== '') {
            try {
                const task = await Task.findById(task_id);
                if (task) {
                    task.completion_percentage = Number(completion_percentage);
                    if (task.completion_percentage === 100) {
                        task.status = 'completed';
                        task.completed_at = istTime.datetime;
                    }
                    await task.save();
                }
            } catch (taskErr) {
                console.warn('Failed to update task percentage with interval update:', taskErr);
            }
        }

        // Broadcast to Admin in real time
        const io = req.app.get('io');
        if (io) {
            io.emit('work_update_received', {
                emp_no,
                employeeName,
                update: updateRecord,
                message: `${employeeName} submitted 3-Hour Worksheet: "${updateRecord.work_done.slice(0, 50)}..."`,
                timestamp: istTime.datetime
            });
            io.emit('task_updated_global', { emp_no });
        }

        res.status(201).json({
            message: '3-Hour Worksheet update & proof submitted successfully',
            update: updateRecord
        });
    } catch (error) {
        console.error('Error submitting interval update:', error);
        res.status(500).json({ message: 'Server error while submitting worksheet' });
    }
};

// @desc    Get 3-hour updates & worksheet history for logged in employee (includes ratings)
// @route   GET /api/tasks/interval-updates
const getMyIntervalUpdates = async (req, res) => {
    try {
        const { emp_no } = req.user;
        const istTime = getISTTime();
        const date = req.query.date;

        const query = { emp_no };
        if (date && date !== 'all') {
            query.date = date;
        }

        const updates = await IntervalUpdate.find(query).sort({ timestamp: -1 });
        res.json(updates);
    } catch (error) {
        console.error('Error fetching interval updates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all employee 3-hour worksheet updates (Admin / Manager only)
// @route   GET /api/admin/interval-updates
const getAllIntervalUpdates = async (req, res) => {
    try {
        const istTime = getISTTime();
        const date = req.query.date;
        const emp_no = req.query.emp_no;
        const currentUser = req.user;

        const query = {};
        if (date && date !== 'all') {
            query.date = date;
        }

        // HIERARCHY RULES:
        // 1. HR (J. Sravani 202602 / role: hr): Can see all other employee works, but CANNOT see Manager M. Nikhil (202601).
        // 2. Manager (M. Nikhil 202601 / role: manager): Can see ALL other employee works INCLUDING HR J. Sravani (202602).
        // 3. Super Admin (Owner ADMIN001 / role: admin): Can see ALL employees (Nikhil, Sravani, and all engineers).
        const isHR = currentUser.emp_no === '202602' || currentUser.role === 'hr';
        const isManager = currentUser.emp_no === '202601' || currentUser.role === 'manager';

        if (isHR) {
            if (emp_no && emp_no !== 'all') {
                if (emp_no === '202601') {
                    return res.status(403).json({ 
                        message: 'Access Restricted: Manager (M. Nikhil) work is monitored directly by Management / Super Admin.' 
                    });
                }
                query.emp_no = emp_no;
            } else {
                query.emp_no = { $in: ['202603', '202604', '202607', '202608', '202609', '202610', '202611'] };
            }
        } else if (isManager) {
            if (emp_no && emp_no !== 'all') {
                query.emp_no = emp_no;
            } else {
                // Nikhil can see Sravani (202602) and all team engineers
                query.emp_no = { $in: ['202602', '202603', '202604', '202607', '202608', '202609', '202610', '202611'] };
            }
        } else {
            // Super Admin / Owner (ADMIN001) - can see all employees
            if (emp_no && emp_no !== 'all') {
                query.emp_no = emp_no;
            }
        }

        const updates = await IntervalUpdate.find(query).sort({ timestamp: -1 });
        res.json(updates);
    } catch (error) {
        console.error('Error fetching all interval updates for admin:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin / Manager rates & provides feedback on a 3-hour worksheet
// @route   PUT /api/admin/interval-updates/:id/rate
const rateIntervalUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, feedback } = req.body;
        const istTime = getISTTime();
        const currentUser = req.user;

        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ message: 'Rating must be a number between 1 and 5 stars' });
        }

        const updateRecord = await IntervalUpdate.findById(id);
        if (!updateRecord) {
            return res.status(404).json({ message: 'Worksheet update record not found' });
        }

        // HIERARCHY ACCESS CHECK:
        // HR cannot rate Manager (M. Nikhal 202601).
        const isHR = currentUser.emp_no === 'ADMIN002' || currentUser.emp_no === '202602' || currentUser.role === 'hr';
        if (isHR && updateRecord.emp_no === '202601') {
            return res.status(403).json({ 
                message: 'Access Restricted: HR cannot evaluate or rate Manager (M. Nikhal). Monitored exclusively by Management.' 
            });
        }

        updateRecord.admin_rating = numRating;
        updateRecord.admin_feedback = feedback ? feedback.trim() : '';
        updateRecord.admin_rated_at = istTime.datetime;
        updateRecord.admin_rated_by = currentUser.full_name || currentUser.name || (isHR ? 'HR Admin' : 'Super Admin');
        updateRecord.status = 'reviewed';

        await updateRecord.save();

        // Secure Real-Time notification to the specific employee only
        const io = req.app.get('io');
        if (io) {
            // Emit to private employee room
            io.to(updateRecord.emp_no).emit('worksheet_rated', {
                updateId: updateRecord._id,
                rating: updateRecord.admin_rating,
                feedback: updateRecord.admin_feedback,
                rated_by: updateRecord.admin_rated_by,
                rated_at: updateRecord.admin_rated_at,
                work_done: updateRecord.work_done,
                task_title: updateRecord.task_title
            });

            // Send notification to employee
            io.to(updateRecord.emp_no).emit('admin_broadcast_notification', {
                type: 'RATING',
                title: `Work Rated: ${'⭐'.repeat(numRating)} (${numRating}/5)`,
                message: `Reviewed your 3-hr update "${updateRecord.task_title}": "${updateRecord.admin_feedback || 'Well done!'}"`,
                timestamp: istTime.datetime
            });
        }

        res.json({
            message: 'Rating and feedback recorded successfully',
            update: updateRecord
        });
    } catch (error) {
        console.error('Error rating interval update:', error);
        res.status(500).json({ message: 'Server error rating worksheet' });
    }
};

// @desc    Export worksheets and 3-hour updates to Excel / CSV format
// @route   GET /api/admin/worksheets/export
const exportWorksheetsToExcel = async (req, res) => {
    try {
        const { date, emp_no } = req.query;
        const currentUser = req.user;
        const query = {};
        if (date && date !== 'all') query.date = date;

        const isHR = currentUser.emp_no === 'ADMIN002' || currentUser.emp_no === '202602' || currentUser.role === 'hr';
        if (isHR) {
            if (emp_no && emp_no !== 'all') {
                if (emp_no === '202601') return res.status(403).json({ message: 'Access Restricted' });
                query.emp_no = emp_no;
            } else {
                query.emp_no = { $ne: '202601' };
            }
        } else {
            if (emp_no && emp_no !== 'all') query.emp_no = emp_no;
        }

        const updates = await IntervalUpdate.find(query).sort({ timestamp: -1 });

        // Build formatted Excel CSV with UTF-8 BOM
        const headers = [
            'ID',
            'Date',
            'Time',
            'Employee ID',
            'Employee Name',
            'Department',
            'Task Title',
            'Hours Spent',
            'Progress %',
            'Work Completed / Description',
            'Deliverables',
            'Blockers',
            'Next Plan',
            'Proof Attachment',
            'Proof Link',
            'Admin Rating (1-5)',
            'Admin Feedback',
            'Rated By',
            'Review Status'
        ];

        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '""';
            const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' | ');
            return `"${clean}"`;
        };

        const rows = updates.map((u, index) => [
            escapeCsv(index + 1),
            escapeCsv(u.date || ''),
            escapeCsv(u.time || ''),
            escapeCsv(u.emp_no || ''),
            escapeCsv(u.employeeName || ''),
            escapeCsv(u.department || 'Engineering'),
            escapeCsv(u.task_title || 'General Work'),
            escapeCsv(u.hours_spent || '3'),
            escapeCsv(u.completion_percentage ? `${u.completion_percentage}%` : '100%'),
            escapeCsv(u.work_done || ''),
            escapeCsv(u.deliverables || ''),
            escapeCsv(u.blockers || 'None'),
            escapeCsv(u.next_plan || ''),
            escapeCsv(u.proof_attachment_name ? `${u.proof_attachment_name} (${u.proof_attachment_size || ''})` : 'No file'),
            escapeCsv(u.proof_link || 'N/A'),
            escapeCsv(u.admin_rating ? `${u.admin_rating} Stars` : 'Not Rated'),
            escapeCsv(u.admin_feedback || ''),
            escapeCsv(u.admin_rated_by || ''),
            escapeCsv(u.status || 'submitted')
        ].join(','));

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const filename = `Stackvil_Worksheet_Export_${date || 'all'}_${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting worksheets:', error);
        res.status(500).json({ message: 'Server error generating Excel export' });
    }
};

module.exports = {
    submitIntervalUpdate,
    getMyIntervalUpdates,
    getAllIntervalUpdates,
    rateIntervalUpdate,
    exportWorksheetsToExcel
};
