import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../services/api';
import { Clock, WifiOff } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const LiveClock = () => {
    const { user, logout, isOnWifi } = useContext(AuthContext);
    const isStaff = user && user.role !== 'admin' && user.emp_no !== 'ADMIN001';
    
    // Read cached duration to avoid resetting to 0s on page refresh
    const getCachedDuration = () => {
        if (!user?.emp_no) return 0;
        try {
            const cached = sessionStorage.getItem(`work_duration_${user.emp_no}`);
            const cachedTs = sessionStorage.getItem(`work_duration_ts_${user.emp_no}`);
            if (cached && cachedTs) {
                const elapsedSinceSave = (Date.now() - Number(cachedTs)) / 1000;
                return Math.max(0, Number(cached) + Math.max(0, elapsedSinceSave));
            }
            return cached ? Number(cached) : 0;
        } catch (e) {
            return 0;
        }
    };

    const [currentTime, setCurrentTime] = useState(null);
    const [workDuration, setWorkDuration] = useState(getCachedDuration); 
    const syncRef = useRef({
        serverStartTime: null,
        performanceStartTime: null,
        workDurationStart: getCachedDuration(),
        lastUpdatePerformance: null
    });

    const syncTime = async () => {
        try {
            const timeRes = await api.get('/utils/time');
            const serverTime = new Date(timeRes.data.serverTime);

            syncRef.current.serverStartTime = serverTime.getTime();
            syncRef.current.performanceStartTime = performance.now();
            syncRef.current.lastUpdatePerformance = performance.now();

            if (timeRes.data.allow_after_hours_login !== undefined) {
                syncRef.current.allow_after_hours_login = !!timeRes.data.allow_after_hours_login;
            }

            if (isStaff) {
                try {
                    const durationRes = await api.get('/attendance/duration');
                    const serverDurationSec = (durationRes.data.totalMilliseconds || 0) / 1000;
                    if (serverDurationSec > 0 || !sessionStorage.getItem(`work_duration_${user.emp_no}`)) {
                        syncRef.current.workDurationStart = serverDurationSec;
                        setWorkDuration(serverDurationSec);
                        if (user?.emp_no) {
                            sessionStorage.setItem(`work_duration_${user.emp_no}`, String(serverDurationSec));
                            sessionStorage.setItem(`work_duration_ts_${user.emp_no}`, String(Date.now()));
                        }
                    }
                } catch (durErr) {}
            }
        } catch (error) {
            syncRef.current.serverStartTime = Date.now();
            syncRef.current.performanceStartTime = performance.now();
            syncRef.current.lastUpdatePerformance = performance.now();
        }
    };

    useEffect(() => {
        syncTime();
        // Periodic full sync every 30 seconds
        const syncInterval = setInterval(syncTime, 30000);

        const updateClock = () => {
            const nowPerf = performance.now();
            const elapsedSinceSync = (nowPerf - syncRef.current.performanceStartTime) / 1000; 
            const deltaSec = (nowPerf - (syncRef.current.lastUpdatePerformance || nowPerf)) / 1000;
            syncRef.current.lastUpdatePerformance = nowPerf;

            // 1. Update Clock
            if (syncRef.current.serverStartTime !== null) {
                const nowInIST = new Date(syncRef.current.serverStartTime + (elapsedSinceSync * 1000));
                const options = {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                };
                setCurrentTime(new Intl.DateTimeFormat('en-IN', options).format(nowInIST));

                // 2. Auto-Logout Check (7 PM IST) - Only if after hours login is NOT allowed
                if (isStaff && !syncRef.current.allow_after_hours_login) {
                    const dateStr = nowInIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                    const sevenPMIST = new Date(`${dateStr}T19:00:00+05:30`);
                    if (nowInIST >= sevenPMIST && !user.isRestricted && !syncRef.current.loggedOut) {
                        syncRef.current.loggedOut = true;
                        logout();
                    }
                }
            }

            // 3. Update Work Duration
            if (isStaff) {
                setWorkDuration(prev => {
                    if (isOnWifi && !user?.isRestricted) {
                        const nextVal = prev + deltaSec;
                        if (user?.emp_no && Math.floor(nextVal) % 5 === 0) {
                            sessionStorage.setItem(`work_duration_${user.emp_no}`, String(nextVal));
                            sessionStorage.setItem(`work_duration_ts_${user.emp_no}`, String(Date.now()));
                        }
                        return nextVal;
                    }
                    return prev;
                });
            }
        };

        const clockInterval = setInterval(updateClock, 1000);
        return () => {
            clearInterval(clockInterval);
            clearInterval(syncInterval);
        };
    }, [user?.role, user?.emp_no, isOnWifi, user?.isRestricted]);

    const formatDuration = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    if (!currentTime) return null;

    return (
        <div className="flex gap-1.5 sm:gap-4 flex-shrink min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm min-w-0">
                <div className="hidden sm:flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shadow-inner flex-shrink-0">
                    <Clock className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[8px] sm:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-0.5 sm:mb-1 truncate">IST Time</span>
                    <span className="text-sm sm:text-lg font-black text-indigo-900 font-mono leading-none tracking-tighter truncate">{currentTime}</span>
                </div>
            </div>

            {isStaff && (
                <div className={`flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-md border min-w-0 transition-colors ${isOnWifi && !user?.isRestricted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5 sm:mb-1 truncate ${isOnWifi && !user?.isRestricted ? 'text-green-600' : 'text-red-500'}`}>
                            {isOnWifi ? (user?.isRestricted ? 'Restricted' : 'Work Duration') : 'Disconnected'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-sm sm:text-lg font-black font-mono leading-none tracking-tighter truncate ${isOnWifi && !user?.isRestricted ? 'text-green-900' : 'text-red-900'}`}>
                                {formatDuration(workDuration)}
                            </span>
                            {!isOnWifi && <WifiOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 animate-pulse" />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveClock;
