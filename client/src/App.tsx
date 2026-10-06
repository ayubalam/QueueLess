import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { CustomerDashboard } from './pages/dashboards/CustomerDashboard';
import { ActiveTokenPage } from './pages/customer/ActiveTokenPage';
import { QueueHistoryPage } from './pages/customer/QueueHistoryPage';
import { ProfilePage } from './pages/customer/ProfilePage';
import { StaffDashboard } from './pages/dashboards/StaffDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { SuperAdminDashboard } from './pages/dashboards/SuperAdminDashboard';
import { OrganizationManager } from './pages/admin/OrganizationManager';
import { ServiceManager } from './pages/admin/ServiceManager';
import { CounterManager } from './pages/admin/CounterManager';
import { StaffManager } from './pages/admin/StaffManager';
import { PublicQueueDisplay } from './pages/public/PublicQueueDisplay';
import { CustomerJoinPage } from './pages/public/CustomerJoinPage';
import { Toaster } from 'sonner';

// Root redirect handler
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'staff':
      return <Navigate to="/staff/dashboard" replace />;
    case 'organization_admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'super_admin':
      return <Navigate to="/super-admin/dashboard" replace />;
    case 'customer':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

// Role-aware dashboard: renders the correct dashboard for the authenticated user's role.
// Prevents a staff/admin user who navigates directly to /dashboard from seeing CustomerDashboard.
const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'staff':
      return <StaffDashboard />;
    case 'organization_admin':
      return <AdminDashboard />;
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'customer':
    default:
      return <CustomerDashboard />;
  }
};

export function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" theme="dark" richColors />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Public Queue Display & QR Check-in Routes (Phase 6) */}
          <Route path="/public/queue/:serviceId" element={<PublicQueueDisplay />} />
          <Route path="/join/:serviceId" element={<CustomerJoinPage />} />

          {/* Customer Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'organization_admin', 'super_admin']}>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/queue/join"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-token"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'organization_admin', 'super_admin']}>
                <ActiveTokenPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/queue-history"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'organization_admin', 'super_admin']}>
                <QueueHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'organization_admin', 'super_admin']}>
                <QueueHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'organization_admin', 'super_admin']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Staff Protected Routes */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={['staff', 'organization_admin', 'super_admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/queue"
            element={
              <ProtectedRoute allowedRoles={['staff', 'organization_admin', 'super_admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          {/* Organization Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['organization_admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organization"
            element={
              <ProtectedRoute allowedRoles={['organization_admin', 'super_admin']}>
                <OrganizationManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ProtectedRoute allowedRoles={['organization_admin', 'super_admin']}>
                <ServiceManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/counters"
            element={
              <ProtectedRoute allowedRoles={['organization_admin', 'super_admin']}>
                <CounterManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={['organization_admin', 'super_admin']}>
                <StaffManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['organization_admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Protected Routes */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
