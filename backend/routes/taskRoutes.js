const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getEmployeeTasks, updateTaskStatus, getTaskHistory, createSelfAssignedTask } = require('../controllers/taskController');
const { submitIntervalUpdate, getMyIntervalUpdates } = require('../controllers/intervalUpdateController');
const { protect } = require('../middleware/auth');

// Multer Storage for Worksheet Proofs
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `proof-${uniqueSuffix}-${safeName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB max limit
});

// Employee task routes
router.get('/employee', protect, getEmployeeTasks);
router.post('/self-assign', protect, createSelfAssignedTask);
router.get('/history', protect, getTaskHistory);
router.put('/:id', protect, updateTaskStatus);

// 3-Hour Periodic Worksheet & Proof Update routes
router.post('/interval-update', protect, upload.single('proof_attachment'), submitIntervalUpdate);
router.get('/interval-updates', protect, getMyIntervalUpdates);

module.exports = router;
