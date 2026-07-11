import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CompaniesPage from '@/pages/CompaniesPage';
import SubscriptionsPage from '@/pages/SubscriptionsPage';
import BoardUsersPage from '@/pages/BoardUsersPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import RolesPermissionsPage from '@/pages/RolesPermissionsPage';
import PermissionModulesPage from '@/pages/PermissionModulesPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import ErrorPage from '@/pages/ErrorPage';

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
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'companies', element: <CompaniesPage /> },
          { path: 'subscriptions', element: <SubscriptionsPage /> },
          { path: 'board-users', element: <BoardUsersPage /> },
          { path: 'admin-users', element: <AdminUsersPage /> },
          { path: 'roles-permissions', element: <RolesPermissionsPage /> },
          { path: 'permission-modules', element: <PermissionModulesPage /> },
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
