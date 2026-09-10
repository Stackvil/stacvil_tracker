const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');

// @desc    Update employee heartbeat/presence (Consolidated Network Check + Heartbeat)
// @route   POST /api/utils/heartbeat
const heartbeat = async (req, res) => {
    // req.user contains { id, emp_no, role } from protect middleware
    const { emp_no } = req.user;

    try {
        const now = new Date();
        const employee = await Employee.findOne({ emp_no });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const oldStatus = employee.presence_status;
        employee.last_seen = now;

        // Employee is "online" ONLY if they are sending heartbeats (active app)
        employee.presence_status = 'online';
        await employee.save();

        // RUN INTERNAL NETWORK CHECK
        const isWifiExempt = employee.role === 'admin' || employee.is_wifi_login_enabled === false;
        let is_on_wifi = await checkNetworkStatus(req);
        if (isWifiExempt) {
            is_on_wifi = true;
        }

        // Update Attendance Duration if on WiFi or exempt
        const attendance = await Attendance.findOne({
            emp_no,
            logout_time: null,
            session_status: 'Active'
        }).sort({ login_time: -1 });

        if (attendance) {
            const lastPing = attendance.last_ping || attendance.login_time;
            const diffMs = now - new Date(lastPing);

            // Track WiFi Status Changes in history (only track for non-exempt users)
            if (!isWifiExempt) {
                const currentWifiStatus = is_on_wifi ? 'Connected' : 'Disconnected';
                const lastHistoryEntry = attendance.wifi_history?.[attendance.wifi_history.length - 1];

                if (!lastHistoryEntry || lastHistoryEntry.status !== currentWifiStatus) {
                    if (!attendance.wifi_history) attendance.wifi_history = [];
                    attendance.wifi_history.push({
                        status: currentWifiStatus,
                        timestamp: now
                    });
                }
            }

            // Accumulate duration if on WiFi or exempt
            if (!attendance.total_duration_ms && attendance.login_time) {
                const elapsedFromLogin = Math.max(0, now - new Date(attendance.login_time));
                attendance.total_duration_ms = elapsedFromLogin;
            } else if (is_on_wifi && diffMs > 0 && diffMs <= 35000) {
                attendance.total_duration_ms = (attendance.total_duration_ms || 0) + diffMs;
            }

            attendance.last_ping = now;
            attendance.is_on_wifi = !!is_on_wifi;
            await attendance.save();
        }

        if (oldStatus !== employee.presence_status) {
            const io = req.app.get('io');
            if (io) {
                io.emit('employeeStatusUpdate', {
                    employeeId: emp_no,
                    status: 'online'
                });
            }
        }

        res.json({ 
            success: true, 
            presence_status: employee.presence_status,
            is_on_wifi: !!is_on_wifi,
            is_wifi_login_enabled: employee.is_wifi_login_enabled
        });
    } catch (error) {
        console.error('[PRESENCE-ERROR] Heartbeat failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const checkNetworkStatus = async (req) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) return true;

        const allowedSsid = (settings.office_wifi_ssid || '').trim();
        const allowedIp = (settings.office_public_ip || '').trim();
        const wifi_ssid = req.body?.wifi_ssid || req.query?.wifi_ssid;

        const rawIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
        const clientIp = rawIp.replace(/^::ffff:/, '');

        const isNativeApp = wifi_ssid === 'NATIVE_BOUND';

        if (allowedSsid && allowedSsid !== '' && allowedSsid !== 'Your_Office_WiFi_Name') {
            if (wifi_ssid && !isNativeApp) {
                return wifi_ssid.trim().toLowerCase() === allowedSsid.toLowerCase();
            } else if (allowedIp && allowedIp !== '') {
                return clientIp === allowedIp || clientIp === '127.0.0.1' || clientIp === '::1';
            } else if (!wifi_ssid) {
                return false;
            }
        } else if (allowedIp && allowedIp !== '') {
            return clientIp === allowedIp || clientIp === '127.0.0.1' || clientIp === '::1';
        }

        return true; 
    } catch (err) {
        console.error('[NETWORK-CHECK-ERROR]', err);
        return true;
    }
};

// Polling placeholder for backward compatibility, but calls consolidated check
const networkCheck = async (req, res) => {
    let is_on_wifi = await checkNetworkStatus(req);
    if (req.user && req.user.emp_no) {
        const employee = await Employee.findOne({ emp_no: req.user.emp_no });
        if (employee && (employee.role === 'admin' || employee.is_wifi_login_enabled === false)) {
            is_on_wifi = true;
        }
    }
    res.json({ is_on_wifi });
};

module.exports = { heartbeat, networkCheck };
