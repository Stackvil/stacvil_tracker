const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check session validity for employees
            if (decoded.role === 'employee' && decoded.session_token) {
                const session = await Session.findOne({
                    session_token: decoded.session_token,
                    is_active: true
                });

                if (!session) {
                    return res.status(401).json({ message: 'Session expired or invalidated. Please login again.' });
                }

                // Update last activity
                session.last_activity = Date.now();
                await session.save();
            }

            req.user = decoded;
            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
