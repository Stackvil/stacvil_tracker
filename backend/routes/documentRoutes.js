const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    getDocuments, 
    createDocument, 
    downloadDocument,
    updateDocument, 
    deleteDocument 
} = require('../controllers/documentController');
const { protect, admin } = require('../middleware/auth');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${uniqueSuffix}-${safeName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max limit
});

// Document retrieval and download
router.get('/', protect, getDocuments);
router.get('/download/:id', protect, downloadDocument);

// Admin management
router.post('/', protect, admin, upload.single('attachment'), createDocument);
router.put('/:id', protect, admin, upload.single('attachment'), updateDocument);
router.delete('/:id', protect, admin, deleteDocument);

module.exports = router;
