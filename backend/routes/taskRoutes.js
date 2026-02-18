const express = require('express');
const router = express.Router();
const { getEmployeeTasks, updateTaskStatus, getTaskHistory } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

// Employee task routes
router.get('/employee', protect, getEmployeeTasks);
router.get('/history', protect, getTaskHistory);
router.put('/:id', protect, updateTaskStatus);

module.exports = router;
