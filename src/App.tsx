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

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
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
  },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'companies', element: <CompaniesPage /> },
          { path: 'subscriptions', element: <SubscriptionsPage /> },
          { path: 'board-users', element: <BoardUsersPage /> },
          { path: 'admin-users', element: <AdminUsersPage /> },
          { path: 'roles-permissions', element: <RolesPermissionsPage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
