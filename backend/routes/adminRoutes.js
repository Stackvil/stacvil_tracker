const express = require('express');
const router = express.Router();
const { getEmployees, getDailyReports, getAnalytics, createEmployee, assignTask, getAdminTasks, respondToDecline, deleteEmployee, deleteTask } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.get('/employees', protect, admin, getEmployees);
router.post('/employees', protect, admin, createEmployee);
router.delete('/employees/:emp_no', protect, admin, deleteEmployee);
router.get('/reports/daily', protect, admin, getDailyReports);
router.get('/analytics', protect, admin, getAnalytics);
router.post('/tasks/assign', protect, admin, assignTask);
router.get('/tasks', protect, admin, getAdminTasks);
router.post('/tasks/respond/:id', protect, admin, respondToDecline);
router.delete('/tasks/:id', protect, admin, deleteTask);

module.exports = router;
