import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Clock } from 'lucide-react';

const LiveClock = () => {
    const [currentTime, setCurrentTime] = useState(null);
    const [workDuration, setWorkDuration] = useState(0); // in seconds
    const syncRef = useRef({
        serverStartTime: null,
        performanceStartTime: null,
        workDurationStart: 0
    });

    useEffect(() => {
        const syncTime = async () => {
            try {
                const [timeRes, durationRes] = await Promise.all([
                    api.get('/api/utils/time'),
                    api.get('/api/attendance/duration')
                ]);

                const serverTime = new Date(timeRes.data.serverTime);

                // Sync reference points
                syncRef.current.serverStartTime = serverTime.getTime();
                syncRef.current.performanceStartTime = performance.now();
                syncRef.current.workDurationStart = durationRes.data.totalMilliseconds / 1000;

                updateClock();
            } catch (error) {
                console.error('Failed to sync time/duration:', error);
                syncRef.current.serverStartTime = Date.now();
                syncRef.current.performanceStartTime = performance.now();
            }
        };

        const updateClock = () => {
            const elapsedSinceSync = (performance.now() - syncRef.current.performanceStartTime) / 1000; // seconds

            // 1. Update Clock
            if (syncRef.current.serverStartTime !== null) {
                const nowInIST = new Date(syncRef.current.serverStartTime + (elapsedSinceSync * 1000));
                const options = {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                };
                setCurrentTime(new Intl.DateTimeFormat('en-IN', options).format(nowInIST));
            }

            // 2. Update Work Duration
            const currentDuration = syncRef.current.workDurationStart + elapsedSinceSync;
            setWorkDuration(currentDuration);
        };

        syncTime();
        const interval = setInterval(updateClock, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatDuration = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    if (!currentTime) return null;

    return (
        <div className="flex gap-4">
            {/* Live Clock */}
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

            {/* Work Duration */}
            <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-100 rounded-xl shadow-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest leading-none mb-1">Work Duration</span>
                    <span className="text-lg font-black text-green-900 font-mono leading-none tracking-tighter">
                        {formatDuration(workDuration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LiveClock;
