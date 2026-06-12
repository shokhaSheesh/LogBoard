import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export default function AdminLayout() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-family)', backgroundColor: 'var(--background)' }}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopHeader />
        <Outlet />
      </div>
    </div>
  );
}
