const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Employee = require('../models/Employee');
const { getISTTime } = require('./utilsController');

// Helper to format file size
const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// @desc    Get company documents filtered for role / target
// @route   GET /api/documents or GET /api/admin/documents
const getDocuments = async (req, res) => {
    try {
        const { role, emp_no } = req.user;
        const allDocs = await Document.find({}).sort({ createdAt: -1, updatedAt: -1 });

        if (role === 'admin') {
            // Admin sees all documents with full target info
            return res.json(allDocs);
        }

        // Employee sees:
        // 1. Documents targeted to 'all' (or no target specified)
        // 2. Documents specifically targeted to their emp_no
        const employeeDocs = allDocs.filter(doc => {
            const targetType = doc.target_type || 'all';
            if (targetType === 'all') return true;
            return doc.target_emp_no && doc.target_emp_no.trim().toUpperCase() === emp_no?.trim().toUpperCase();
        });

        res.json(employeeDocs);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create / Publish a new document with attachment & target audience
// @route   POST /api/admin/documents
const createDocument = async (req, res) => {
    try {
        const { 
            title, 
            category, 
            content, 
            is_mandatory, 
            target_type, 
            target_emp_no, 
            target_employee_name,
            file_base64,
            file_name,
            file_size,
            file_type
        } = req.body;
        const istTime = getISTTime();

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Document title is required' });
        }

        let attachmentName = '';
        let attachmentUrl = '';
        let attachmentSize = '';
        let attachmentMimeType = '';

        // Handle file uploaded via Multer (if multipart)
        if (req.file) {
            attachmentName = req.file.originalname;
            attachmentUrl = `/uploads/${req.file.filename}`;
            attachmentSize = formatBytes(req.file.size);
            attachmentMimeType = req.file.mimetype;
        } else if (file_base64 && file_name) {
            // Handle Base64 file upload
            try {
                const cleanBase64 = file_base64.replace(/^data:.*?;base64,/, '');
                const uniqueFilename = `${Date.now()}-${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                const uploadPath = path.join(__dirname, '../uploads', uniqueFilename);
                fs.writeFileSync(uploadPath, Buffer.from(cleanBase64, 'base64'));
                
                attachmentName = file_name;
                attachmentUrl = `/uploads/${uniqueFilename}`;
                attachmentSize = file_size ? formatBytes(file_size) : formatBytes(Buffer.from(cleanBase64, 'base64').length);
                attachmentMimeType = file_type || 'application/octet-stream';
            } catch (fileErr) {
                console.warn('Base64 upload handling failed:', fileErr);
            }
        }

        // Determine target employee name if specific
        let targetEmpName = target_employee_name || '';
        if (target_type === 'specific' && target_emp_no && !targetEmpName) {
            const emp = await Employee.findOne({ emp_no: target_emp_no.trim().toUpperCase() });
            if (emp) targetEmpName = emp.full_name || emp.name;
        }

        const newDoc = new Document({
            title: title.trim(),
            category: category || 'Company Policy',
            content: (content || '').trim(),
            is_mandatory: !!is_mandatory,
            target_type: target_type === 'specific' ? 'specific' : 'all',
            target_emp_no: target_type === 'specific' ? target_emp_no?.trim().toUpperCase() : null,
            target_employee_name: target_type === 'specific' ? targetEmpName : 'All Employees',
            attachment_name: attachmentName,
            attachment_url: attachmentUrl,
            attachment_size: attachmentSize,
            attachment_mimetype: attachmentMimeType,
            created_by: req.user.full_name || req.user.name || 'Admin',
            date: istTime.date,
            time: istTime.time,
            updatedAt: istTime.datetime,
            createdAt: istTime.datetime
        });

        await newDoc.save();

        // Broadcast in Real Time via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const broadcastPayload = {
                action: 'created',
                document: newDoc,
                target_type: newDoc.target_type,
                target_emp_no: newDoc.target_emp_no,
                message: newDoc.target_type === 'specific'
                    ? `Confidential Document assigned to ${newDoc.target_employee_name}: "${newDoc.title}"`
                    : `New company document published: "${newDoc.title}"`,
                timestamp: istTime.datetime
            };

            if (newDoc.target_type === 'specific' && newDoc.target_emp_no) {
                // Send directly to the targeted employee room + admin
                io.to(newDoc.target_emp_no).emit('document_updated', broadcastPayload);
                io.to('ADMIN001').emit('document_updated', broadcastPayload);
                io.to(newDoc.target_emp_no).emit('admin_broadcast_notification', {
                    type: 'DOCUMENT',
                    title: 'New Document Assigned to You',
                    message: `Admin sent you: ${newDoc.title}`,
                    timestamp: istTime.datetime
                });
            } else {
                // Broadcast to everyone
                io.emit('document_updated', broadcastPayload);
                io.emit('admin_broadcast_notification', {
                    type: 'DOCUMENT',
                    title: 'New Company Document',
                    message: `Admin published: ${newDoc.title}`,
                    timestamp: istTime.datetime
                });
            }
        }

        res.status(201).json({
            message: 'Document published successfully',
            document: newDoc
        });
    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ message: 'Server error while creating document' });
    }
};

// @desc    Download attached file or generate document text file
// @route   GET /api/documents/download/:id
const downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Document.findById(id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Security check for employees
        if (req.user.role !== 'admin' && doc.target_type === 'specific') {
            if (doc.target_emp_no !== req.user.emp_no) {
                return res.status(403).json({ message: 'Access denied for this document' });
            }
        }

        // If an uploaded file exists on disk
        if (doc.attachment_url) {
            const cleanRelPath = doc.attachment_url.replace(/^\/?uploads\/?/, '');
            const filePath = path.join(__dirname, '../uploads', cleanRelPath);

            if (fs.existsSync(filePath)) {
                return res.download(filePath, doc.attachment_name || path.basename(filePath));
            }
        }

        // Fallback: If no file attached on disk, generate a formatted text/markdown download
        const safeTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safeTitle}.txt`;
        const fileContent = `=====================================================
${doc.title.toUpperCase()}
=====================================================
Category:    ${doc.category || 'General'}
Issued By:   ${doc.created_by || 'Administration'}
Target:      ${doc.target_employee_name || 'All Employees'}
Date:        ${doc.date || doc.createdAt}
-----------------------------------------------------

${doc.content || 'No content provided.'}

=====================================================
Stackvil Work Tracking & Monitoring System
`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'text/plain; charset=utf-8');
        res.send(fileContent);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ message: 'Server error downloading document' });
    }
};

// @desc    Update an existing document
// @route   PUT /api/admin/documents/:id
const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, content, is_mandatory, target_type, target_emp_no, target_employee_name } = req.body;
        const istTime = getISTTime();

        const doc = await Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (title) doc.title = title.trim();
        if (category) doc.category = category;
        if (content !== undefined) doc.content = content.trim();
        if (is_mandatory !== undefined) doc.is_mandatory = is_mandatory;
        if (target_type !== undefined) doc.target_type = target_type;
        if (target_emp_no !== undefined) doc.target_emp_no = target_emp_no;
        if (target_employee_name !== undefined) doc.target_employee_name = target_employee_name;
        doc.updatedAt = istTime.datetime;

        // Handle new file if provided
        if (req.file) {
            doc.attachment_name = req.file.originalname;
            doc.attachment_url = `/uploads/${req.file.filename}`;
            doc.attachment_size = formatBytes(req.file.size);
            doc.attachment_mimetype = req.file.mimetype;
        }

        await doc.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('document_updated', {
                action: 'updated',
                document: doc,
                message: `Document updated: "${doc.title}"`,
                timestamp: istTime.datetime
            });
        }

        res.json({ message: 'Document updated successfully', document: doc });
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ message: 'Server error updating document' });
    }
};

// @desc    Delete a document
// @route   DELETE /api/admin/documents/:id
const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Document.findById(id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // If there's an attached file on disk, remove it cleanly
        if (doc.attachment_url) {
            const cleanRelPath = doc.attachment_url.replace(/^\/?uploads\/?/, '');
            const filePath = path.join(__dirname, '../uploads', cleanRelPath);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        }

        await Document.deleteOne({ _id: id });

        const io = req.app.get('io');
        if (io) {
            io.emit('document_updated', {
                action: 'deleted',
                id,
                message: `Document "${doc.title}" was removed`
            });
        }

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Server error deleting document' });
    }
};

module.exports = {
    getDocuments,
    createDocument,
    downloadDocument,
    updateDocument,
    deleteDocument
};
