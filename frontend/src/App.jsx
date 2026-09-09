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
import RestrictedAccess from './pages/RestrictedAccess';
import POS from './pages/POS';
import MonthlyAttendance from './pages/MonthlyAttendance';
import Settings from './pages/Settings';

// New Dedicated Pages
import WorksheetsPage from './pages/WorksheetsPage';
import DocumentsPage from './pages/DocumentsPage';
import HolidayCalendarPage from './pages/HolidayCalendarPage';
import CompanyRulesPage from './pages/CompanyRulesPage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Employee Dedicated Routes */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route path="/restricted-access" element={<RestrictedAccess />} />
            <Route path="/pos" element={<POS />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<EmployeeDashboard />} />
              <Route path="/worksheets" element={<WorksheetsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/holidays" element={<HolidayCalendarPage />} />
              <Route path="/company-rules" element={<CompanyRulesPage />} />
              <Route path="/attendance" element={<AttendanceHistoryPage />} />
              <Route path="/leaves" element={<LeaveRequest />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/employees" element={<EmployeeManagement />} />
              <Route path="/admin/leaves" element={<LeaveManagement />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/monthly-attendance" element={<MonthlyAttendance />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/documents" element={<DocumentsPage />} />
              <Route path="/admin/holidays" element={<HolidayCalendarPage />} />
              <Route path="/admin/company-rules" element={<CompanyRulesPage />} />
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
