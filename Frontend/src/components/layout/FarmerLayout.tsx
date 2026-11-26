import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Brain, MessageSquare, FileText, LogOut, Satellite, Leaf } from 'lucide-react';
import { authAPI } from '@/services/authAPI';
import { toast } from 'sonner';

const nav = [
  { to: '/farmer',          label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/farmer/farms',    label: 'My Farms',    icon: MapPin },
  { to: '/farmer/insights', label: 'AI Insights', icon: Brain },
  { to: '/farmer/feedback', label: 'Feedback',    icon: MessageSquare },
  { to: '/farmer/reports',  label: 'Reports',     icon: FileText },
];

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user     = authAPI.getStoredUser();

  const logout = () => {
    authAPI.clearToken();
    toast.success('Logged out');
    navigate('/auth');
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <Satellite className="text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 tracking-tight">AgriVision AI</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Leaf className="w-3 h-3" />Farmer Portal
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
                    ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-green-50 border border-green-100">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user?.full_name || user?.email}</p>
              <p className="text-xs text-green-600">Farmer</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
