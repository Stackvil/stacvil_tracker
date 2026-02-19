import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import Reports from './pages/Reports';
import LeaveRequest from './pages/LeaveRequest';
import LeaveManagement from './pages/LeaveManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Employee Routes */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<EmployeeDashboard />} />
              <Route path="/leaves" element={<LeaveRequest />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/employees" element={<EmployeeManagement />} />
              <Route path="/admin/leaves" element={<LeaveManagement />} />
              <Route path="/admin/reports" element={<Reports />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
