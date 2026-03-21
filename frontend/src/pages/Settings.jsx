import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wifi, Globe, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
    const [settings, setSettings] = useState({
        office_wifi_ssid: '',
        office_public_ip: ''
    });
    const [currentIp, setCurrentIp] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/settings');
            if (response.data) {
                setSettings({
                    office_wifi_ssid: response.data.office_wifi_ssid || '',
                    office_public_ip: response.data.office_public_ip || ''
                });
                if (response.data.current_ip) {
                    setCurrentIp(response.data.current_ip);
                }
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError(`Could not load network settings: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/admin/settings', settings);
            setSuccess('Settings updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading Network Settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Wifi className="w-8 h-8 text-indigo-600" />
                        Office Network Configuration
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Restrict employee logins to authorized office networks. These settings apply to all employees with "WiFi Login Restricted" enabled.
                    </p>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-8 text-indigo-400">
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl">
                            <CheckCircle2 className="w-5 h-5" />
                            <p className="text-sm font-medium">{success}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* WiFi SSID Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Wifi className="w-5 h-5 text-gray-400" />
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Office WiFi SSID</label>
                            </div>
                            <input
                                type="text"
                                value={settings.office_wifi_ssid}
                                onChange={(e) => setSettings({ ...settings, office_wifi_ssid: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                placeholder="e.g. ETHREE_OFFICE_5G"
                            />
                            <p className="text-[10px] text-gray-400 font-medium px-1">
                                Matching the local Wi-Fi name. Only works for users on the native application.
                            </p>
                        </div>

                        {/* Public IP Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe className="w-5 h-5 text-gray-400" />
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Office Public IP</label>
                            </div>
                            <input
                                type="text"
                                value={settings.office_public_ip}
                                onChange={(e) => setSettings({ ...settings, office_public_ip: e.target.value })}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                placeholder="e.g. 104.14.72.11"
                            />
                            {currentIp && (
                                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        <p className="text-[11px] font-bold text-indigo-700">Detected Current IP: <span className="font-black text-indigo-900">{currentIp}</span></p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSettings({ ...settings, office_public_ip: currentIp })}
                                        className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-all uppercase"
                                    >
                                        Use This IP
                                    </button>
                                </div>
                            )}
                            <p className="text-[10px] text-gray-400 font-medium px-1">
                                Used to verify browser logins. Leave empty to disable IP restriction.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save className={`${saving ? 'animate-spin' : ''} w-5 h-5`} />
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Information Card */}
            <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                        How it works
                    </h3>
                    <ul className="space-y-4 text-sm text-indigo-100">
                        <li className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                            <span><strong>SSID Check:</strong> When used via the mobile app, the system checks the current Wi-Fi SSID against your configuration.</span>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                            <span><strong>IP Validation:</strong> Browser users are validated by their public IP address to ensure they're at the office.</span>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                            <span><strong>Exemptions:</strong> Administrators are not restricted by network policy, allowing remote management.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Settings;
