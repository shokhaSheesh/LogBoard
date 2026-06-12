import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-family)', backgroundColor: 'var(--background)' }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopHeader onToggleSidebar={() => setCollapsed((c) => !c)} />
        <Outlet />
      </div>
    </div>
  );
}
