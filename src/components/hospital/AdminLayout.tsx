import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, Users, BedDouble, Settings, ShieldAlert, LayoutDashboard } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/hospital/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Live Queue', path: '/hospital/queue', icon: <Users size={20} /> },
    { name: 'Bed Management', path: '/hospital/beds', icon: <BedDouble size={20} /> },
    { name: 'Analytics', path: '/hospital/analytics', icon: <Activity size={20} /> },
    { name: 'Settings', path: '/hospital/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col backdrop-blur-md relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800/50">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <ShieldAlert size={22} className="text-white drop-shadow-lg" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-cyan-400">Life</span>Sensor<span className="text-zinc-500 text-sm"> Admin</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/5 text-cyan-400 border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/50 text-xs text-zinc-500 text-center">
          Smart Hospital Manager v1.0
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        {/* Background glow elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[150px] rounded-full" />
        </div>
        
        <div className="relative z-10 p-8 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
