import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.isRestricted) {
        // Restricted users can only access /restricted-access and /leaves
        const currentPath = window.location.pathname;
        if (currentPath !== '/restricted-access' && currentPath !== '/leaves') {
            return <Navigate to="/restricted-access" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
