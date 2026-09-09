const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load .env using absolute path so it works regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');

// Connect to Database
connectDB();

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const utilsRoutes = require('./routes/utilsRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin.includes('stackvil.com') ||
            origin.includes('ngrok') ||
            origin.includes('ngrok-free.app') ||
            origin.includes('vercel.app') ||
            origin.includes('trycloudflare.com') ||
            origin.includes('loca.lt')
        ) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all during development & local tunneling
    },
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Middleware to ensure DB initialization
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ message: 'Database initialization failed', error: error.message });
    }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: 'json_file_store',
        uptime: process.uptime(),
        environment: {
            hasJwtSecret: !!process.env.JWT_SECRET,
            nodeEnv: process.env.NODE_ENV,
            region: process.env.VERCEL_REGION || 'local'
        },
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin/documents', documentRoutes);

// Fallback aliases for root prefix
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/admin', adminRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leaves', leaveRoutes);
app.use('/documents', documentRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

const fs = require('fs');
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Employee Work Monitoring API is running...');
    });
}

// 404 handler for undefined routes
app.use((req, res, next) => {
    const err = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(err);
});

// Global Error Handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error(`Error ${statusCode}: ${err.message}`);
    console.error(err.stack);

    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
});

const http = require('http');
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_room', (emp_no) => {
        socket.join(emp_no);
        console.log(`Socket ${socket.id} joined room: ${emp_no}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io accessible in routes
app.set('io', io);

// Initialize Scheduler
const initScheduler = require('./scheduler');
initScheduler(io);


// Handler for Vercel
const handler = (req, res) => {
    server.emit('request', req, res);
};

module.exports = app;

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
}
