import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import ClinicianDashboard from './pages/clinician/ClinicianDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import LoadingSpinner from './components/LoadingSpinner';

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  const routes = { PATIENT: '/patient', CLINICIAN: '/clinician', ADMIN: '/admin' };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<DashboardRedirect />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Patient Routes */}
      <Route path="/patient" element={
        <ProtectedRoute allowedRoles={['PATIENT']}>
          <AppLayout><PatientDashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/patient/*" element={
        <ProtectedRoute allowedRoles={['PATIENT']}>
          <AppLayout><PatientDashboard /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Clinician Routes */}
      <Route path="/clinician" element={
        <ProtectedRoute allowedRoles={['CLINICIAN']}>
          <AppLayout><ClinicianDashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/clinician/*" element={
        <ProtectedRoute allowedRoles={['CLINICIAN']}>
          <AppLayout><ClinicianDashboard /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AppLayout><AdminDashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AppLayout><AdminDashboard /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
            <ToastContainer />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
