import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CompaniesPage from '@/pages/CompaniesPage';
import SubscriptionsPage from '@/pages/SubscriptionsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import BoardUsersPage from '@/pages/BoardUsersPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import RolesPermissionsPage from '@/pages/RolesPermissionsPage';
import PermissionModulesPage from '@/pages/PermissionModulesPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import ErrorPage from '@/pages/ErrorPage';
import { Gated } from '@/components/shared/Gated';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/admin/dashboard" replace /> : <Outlet />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
    errorElement: <ErrorPage />,
  },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    path: '/change-password',
    element: <ChangePasswordPasswordGuard />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Gated permission="dashboard.read"><DashboardPage /></Gated> },
          { path: 'companies', element: <Gated permission="companies.read"><CompaniesPage /></Gated> },
          { path: 'subscriptions', element: <Gated permission="subscriptions.read"><SubscriptionsPage /></Gated> },
          { path: 'notifications', element: <Gated permission="notifications.read"><NotificationsPage /></Gated> },
          { path: 'board-users', element: <Gated permission="board_users.read"><BoardUsersPage /></Gated> },
          { path: 'admin-users', element: <Gated permission="board_users.read"><AdminUsersPage /></Gated> },
          { path: 'roles-permissions', element: <Gated permission="roles.read"><RolesPermissionsPage /></Gated> },
          { path: 'permission-modules', element: <Gated permission="modules.read"><PermissionModulesPage /></Gated> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
]);

function ChangePasswordPasswordGuard() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to="/admin/dashboard" replace />;
  return <ChangePasswordPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
