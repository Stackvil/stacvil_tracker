const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    registerEmployee, 
    loginEmployee, 
    logoutEmployee, 
    changePassword, 
    requestLoginPermission,
    getProfile,
    updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Multer Storage for Profile Photos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `avatar-${uniqueSuffix}-${safeName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max avatar
});

router.post('/register', registerEmployee);
router.post('/login', loginEmployee);
router.post('/login-request', requestLoginPermission);
router.post('/logout', protect, logoutEmployee);
router.put('/password', protect, changePassword);

// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('profile_photo'), updateProfile);

module.exports = router;
