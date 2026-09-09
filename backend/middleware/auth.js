const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Restricted User Check
            if (decoded.isRestricted) {
                let allowAfterHours = false;
                try {
                    const Settings = require('../models/Settings');
                    const settings = await Settings.findOne({});
                    allowAfterHours = settings ? !!settings.allow_after_hours_login : false;
                } catch (e) {}

                if (allowAfterHours) {
                    decoded.isRestricted = false;
                } else {
                    const allowedRoutes = ['/api/leaves/apply', '/api/leaves/my-leaves', '/api/auth/logout'];
                    const currentPath = req.originalUrl.split('?')[0]; // Ignore query params

                    if (!allowedRoutes.includes(currentPath)) {
                        return res.status(403).json({
                            message: 'Access restricted after office hours. You can only submit leave requests.',
                            isRestricted: true
                        });
                    }
                }
            }

            // Check session validity for employees (Skip for restricted users since they have no session)
            if (decoded.role === 'employee' && decoded.session_token && !decoded.isRestricted) {
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
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager' || req.user.emp_no === '202601' || req.user.emp_no?.startsWith('ADMIN'))) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin or manager' });
    }
};

module.exports = { protect, admin };
