import React, { useState, useEffect, useContext, useRef } from 'react';
import api, { API_URL } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    User, Camera, Lock, Briefcase, Phone, Mail, ShieldCheck,
    Star, Award, Check, RefreshCw, Layers, Clock, TrendingUp,
    FileCheck2, Calendar
} from 'lucide-react';

const ProfilePage = () => {
    const { user, setUser } = useContext(AuthContext);
    const [profile, setProfile] = useState({
        emp_no: user?.emp_no || '',
        name: user?.full_name || user?.name || '',
        email: user?.email || '',
        designation: 'Software Engineer',
        department: 'Engineering',
        phone: '',
        bio: '',
        skills: ['React', 'Node.js', 'JavaScript', 'SQL'],
        emergency_contact: '',
        profile_photo: '',
        joining_date: ''
    });

    const [profilePhotoFile, setProfilePhotoFile] = useState(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
    const avatarInputRef = useRef(null);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileError, setProfileError] = useState('');

    // Password Form
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Performance Stats
    const [intervalLogs, setIntervalLogs] = useState([]);

    useEffect(() => {
        fetchProfile();
        fetchIntervalLogs();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/profile');
            if (res.data) {
                setProfile(res.data);
                if (res.data.profile_photo) {
                    setProfilePhotoPreview(res.data.profile_photo);
                }
            }
        } catch (e) {
            console.error('Failed to fetch profile:', e);
        }
    };

    const fetchIntervalLogs = async () => {
        try {
            const res = await api.get('/tasks/interval-updates?date=all');
            setIntervalLogs(res.data || []);
        } catch (e) {
            console.error('Failed to fetch interval logs:', e);
        }
    };

    const handlePhotoFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePhotoFile(file);
            setProfilePhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileError('');
        setProfileSuccess('');

        try {
            const formData = new FormData();
            formData.append('name', profile.name);
            formData.append('phone', profile.phone || '');
            formData.append('designation', profile.designation || '');
            formData.append('department', profile.department || '');
            formData.append('bio', profile.bio || '');
            formData.append('emergency_contact', profile.emergency_contact || '');
            formData.append('skills', Array.isArray(profile.skills) ? profile.skills.join(',') : profile.skills);

            if (profilePhotoFile) {
                formData.append('profile_photo', profilePhotoFile);
            }

            const res = await api.put('/auth/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setProfileSuccess('Profile updated successfully!');
            if (res.data?.user) {
                setProfile(res.data.user);
                if (setUser) setUser(prev => ({ ...prev, ...res.data.user }));
            }
            setTimeout(() => setProfileSuccess(''), 3500);
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        setPasswordSaving(true);
        setPasswordError('');
        setPasswordSuccess('');

        try {
            await api.put('/auth/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setPasswordSuccess('Password changed successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setPasswordSuccess(''), 3500);
        } catch (error) {
            setPasswordError(error.response?.data?.message || 'Failed to change password');
        } finally {
            setPasswordSaving(false);
        }
    };

    // Calculate scorecard
    const ratedLogs = intervalLogs.filter(l => l.admin_rating);
    const avgRating = ratedLogs.length > 0
        ? (ratedLogs.reduce((acc, curr) => acc + curr.admin_rating, 0) / ratedLogs.length).toFixed(1)
        : null;
    const fiveStarCount = ratedLogs.filter(l => l.admin_rating === 5).length;
    const totalTrackedHours = intervalLogs.reduce((acc, curr) => acc + (curr.hours_spent || 3), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Employee Profile & Credentials</h1>
                <p className="text-xs text-gray-500 mt-0.5">Manage your personal details, profile picture, security credentials, and view performance scorecard.</p>
            </div>

            {/* Performance Scorecard Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average Rating</span>
                    <h3 className="text-2xl font-black text-amber-500 flex items-center gap-1">
                        {avgRating ? `${avgRating} ⭐` : 'Pending'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">From {ratedLogs.length} reviews</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">5-Star Badges</span>
                    <h3 className="text-2xl font-black text-emerald-600">{fiveStarCount} 🏆</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Top performance milestones</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">3-Hr Worksheets</span>
                    <h3 className="text-2xl font-black text-indigo-600">{intervalLogs.length}</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Submitted & verified</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Work Hours</span>
                    <h3 className="text-2xl font-black text-gray-800">{totalTrackedHours} hrs</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Productive shift duration</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Avatar & Quick Info */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-6 flex flex-col items-center text-center">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-indigo-100 bg-gray-50 flex items-center justify-center shadow-inner">
                            {profilePhotoPreview ? (
                                <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-16 h-16 text-gray-300" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                            title="Upload New Photo"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileChange}
                            className="hidden"
                        />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-gray-800">{profile.name}</h2>
                        <p className="text-xs text-indigo-600 font-semibold">{profile.designation || 'Software Engineer'}</p>
                        <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full inline-block mt-1">
                            EMP ID: #{profile.emp_no}
                        </span>
                    </div>

                    <div className="w-full pt-4 border-t border-gray-100 space-y-2.5 text-left text-xs text-gray-600">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Department:</span>
                            <span className="font-bold text-gray-800">{profile.department}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Account Role:</span>
                            <span className="font-bold text-indigo-700 uppercase">{profile.role || 'Employee'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Official Email:</span>
                            <span className="font-mono text-gray-700 truncate max-w-[150px]">{profile.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Account Status:</span>
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                        </div>
                    </div>
                </div>

                {/* Center / Right Column: Profile Edit & Security */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Edit Profile Form */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-5">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-indigo-600" />
                            <span>Personal Information</span>
                        </h3>

                        {profileSuccess && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                <Check className="w-4 h-4" /> {profileSuccess}
                            </div>
                        )}
                        {profileError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
                                {profileError}
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Official Email</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-xs text-gray-500 cursor-not-allowed font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={profile.phone || ''}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Contact</label>
                                    <input
                                        type="text"
                                        placeholder="Name & Contact Number"
                                        value={profile.emergency_contact || ''}
                                        onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Job Designation</label>
                                    <input
                                        type="text"
                                        value={profile.designation || ''}
                                        onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={profile.department || ''}
                                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Skills (comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="React, Node.js, Express, MongoDB, TypeScript"
                                    value={Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills}
                                    onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Professional Bio / Summary</label>
                                <textarea
                                    rows="3"
                                    placeholder="Brief summary of your background, current focus and responsibilities..."
                                    value={profile.bio || ''}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={profileSaving}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Save Profile</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Password Form */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-indigo-600" />
                            <span>Security & Password</span>
                        </h3>

                        {passwordSuccess && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                <Check className="w-4 h-4" /> {passwordSuccess}
                            </div>
                        )}
                        {passwordError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
                                {passwordError}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Current Password *</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">New Password *</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password *</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={passwordSaving}
                                    className="px-6 py-2.5 bg-gray-800 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {passwordSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    <span>Update Password</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
