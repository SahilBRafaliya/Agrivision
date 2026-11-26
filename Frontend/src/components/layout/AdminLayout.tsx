import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Users, Cpu, MessageSquare, Activity, LogOut, Satellite, ShieldCheck } from 'lucide-react';
import { authAPI } from '@/services/authAPI';
import { toast } from 'sonner';

const nav = [
  { to: '/admin',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/farms',      label: 'All Farms',  icon: MapPin },
  { to: '/admin/users',      label: 'Users',      icon: Users },
  { to: '/admin/models',     label: 'ML Models',  icon: Cpu },
  { to: '/admin/feedback',   label: 'Feedback',   icon: MessageSquare },
  { to: '/admin/monitoring', label: 'Monitoring', icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user     = authAPI.getStoredUser();

  const logout = () => {
    authAPI.clearToken();
    toast.success('Logged out');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Satellite className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">AgriVision AI</p>
              <p className="text-xs text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />Admin Panel
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700">
            <p className="text-xs font-semibold text-gray-200 truncate">{user?.full_name || user?.email}</p>
            <p className="text-xs text-indigo-400 mt-0.5">Super Admin</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-gray-950 min-h-screen">
        {children}
      </main>
    </div>
  );
}
