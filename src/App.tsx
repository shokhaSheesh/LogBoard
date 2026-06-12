import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CompaniesPage from '@/pages/CompaniesPage';
import SubscriptionsPage from '@/pages/SubscriptionsPage';
import BoardUsersPage from '@/pages/BoardUsersPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import RolesPermissionsPage from '@/pages/RolesPermissionsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
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
]);

export default function App() {
  return <RouterProvider router={router} />;
}
