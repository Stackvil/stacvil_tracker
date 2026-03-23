import React, { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOnWifi, setIsOnWifi] = useState(true); // Default to true to avoid flashing warning
    const [currentSsid, setCurrentSsid] = useState(null);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Listen for SSID from Native WebView
    useEffect(() => {
        const handleNativeMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'WIFI_SSID') {
                    setCurrentSsid(data.ssid);
                }
            } catch (e) {}
        };
        window.addEventListener('message', handleNativeMessage);
        document.addEventListener('message', handleNativeMessage);
        return () => {
            window.removeEventListener('message', handleNativeMessage);
            document.removeEventListener('message', handleNativeMessage);
        };
    }, []);

    // Heartbeat Logic
    useEffect(() => {
        let heartbeatInterval;
        if (user && user.role === 'employee') {
            const sendHeartbeat = async () => {
                try {
                    // Send consolidated heartbeat (includes internal network check)
                    const response = await api.post('/utils/heartbeat', { wifi_ssid: currentSsid });
                    
                    if (response.data) {
                        setIsOnWifi(response.data.is_on_wifi);
                    }
                } catch (err) {
                    console.error('Heartbeat failed:', err);
                }
            };

            // Run immediately and then every 15 seconds
            sendHeartbeat();
            heartbeatInterval = setInterval(sendHeartbeat, 15000);
        }

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user, currentSsid]);

    useEffect(() => {
        let newSocket;
        if (user && user.emp_no) {
            newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
            setSocket(newSocket);

            newSocket.emit('join_room', user.emp_no);

            newSocket.on('force_logout', (data) => {
                alert(data.message);
                logout();
            });
        }

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [user]);

    const login = async (emp_no, password, wifi_ssid = null, face_descriptor = null) => {
        try {
            const response = await api.post('/auth/login', { emp_no, password, wifi_ssid, face_descriptor });
            const { token, user: loggedInUser, isRestricted } = response.data;
            const userData = { ...loggedInUser, isRestricted };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true, role: loggedInUser.role, isRestricted };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
                data: error.response?.data
            };
        }
    };

    const logout = async (statusUpdates = null) => {
        try {
            if (socket) socket.disconnect();
            if (user && user.role === 'employee') {
                const response = await api.post('/auth/logout', { statusUpdates });
                const duration = response.data?.duration;
                if (duration) alert(`Logout successful!\nYou were logged in for: ${duration.formatted}`);
                else alert('Logged out successfully');
            } else {
                alert('Logged out successfully');
            }
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logged out successfully');
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTH_SYNC', token: null, user: null }));
            }
            window.location.href = '/login';
        }
    };

    const updateUser = (updatedUserData) => {
        const updatedUser = { ...user, ...updatedUserData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, loading, isOnWifi, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
