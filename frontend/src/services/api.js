import axios from 'axios';

// Normalize API URL to always target /api correctly
const getBaseApiUrl = () => {
    let url = import.meta.env.VITE_API_URL || '/api';
    // If it's a full URL without /api at the end, append /api
    if (url.startsWith('http') && !url.includes('/api')) {
        url = url.replace(/\/+$/, '') + '/api';
    }
    return url.replace(/\/+$/, '');
};

export const API_URL = getBaseApiUrl();

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
    (API_URL.startsWith('http') ? API_URL.replace(/\/api\/?$/, '') : window.location.origin);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Only redirect if we're not already on the login page to avoid loops/hiding errors
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Sync logout to native if in WebView
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'AUTH_SYNC',
                        token: null,
                        user: null
                    }));
                }

                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
