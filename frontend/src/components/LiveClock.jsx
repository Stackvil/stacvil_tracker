import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Clock } from 'lucide-react';

const LiveClock = () => {
    const [currentTime, setCurrentTime] = useState(null);
    const syncRef = useRef({
        serverStartTime: null,
        performanceStartTime: null
    });

    useEffect(() => {
        const syncTime = async () => {
            try {
                const response = await api.get('/api/utils/time');
                const serverTime = new Date(response.data.serverTime);

                // Sync reference points
                syncRef.current.serverStartTime = serverTime.getTime();
                syncRef.current.performanceStartTime = performance.now();

                updateClock();
            } catch (error) {
                console.error('Failed to sync time with server:', error);
                // Fallback to local time if server fails (not ideal but better than no clock)
                syncRef.current.serverStartTime = Date.now();
                syncRef.current.performanceStartTime = performance.now();
            }
        };

        const updateClock = () => {
            if (syncRef.current.serverStartTime !== null) {
                const elapsedSinceSync = performance.now() - syncRef.current.performanceStartTime;
                const nowInIST = new Date(syncRef.current.serverStartTime + elapsedSinceSync);

                // Format for IST (Asia/Kolkata)
                const options = {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                };
                setCurrentTime(new Intl.DateTimeFormat('en-IN', options).format(nowInIST));
            }
        };

        syncTime();
        const interval = setInterval(updateClock, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!currentTime) return null;

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shadow-inner">
                <Clock className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">IST Time</span>
                <span className="text-lg font-black text-indigo-900 font-mono leading-none tracking-tighter">
                    {currentTime}
                </span>
            </div>
        </div>
    );
};

export default LiveClock;
