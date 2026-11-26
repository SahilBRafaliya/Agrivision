import { Search, Bell, User, Satellite, Leaf, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authAPI } from '@/services/authAPI';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Satellite Explorer', path: '/satellite-explorer' },
  { label: 'Farm Monitoring', path: '/farm-monitoring' },
  { label: 'AI Insights', path: '/ai-insights' },
  { label: 'Farmer Portal', path: '/farmer-portal' },
  { label: 'Alerts', path: '/alerts' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' },
];

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePortal, setActivePortal } = useAppStore();
  const user = authAPI.getStoredUser();

  const handleLogout = () => {
    authAPI.clearToken();
    toast.success('Signed out');
    navigate('/auth');
  };

  return (
    <header className="h-14 border-b border-border bg-popover flex items-center px-4 gap-4 shrink-0 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Satellite className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold text-foreground tracking-tight hidden sm:inline">AgriVision AI</span>
      </Link>

      {/* Portal Toggle */}
      <div className="flex items-center bg-muted rounded-lg p-0.5 shrink-0">
        <button
          onClick={() => { setActivePortal('satellite'); navigate('/'); }}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePortal === 'satellite' ? 'bg-popover text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Satellite className="w-3 h-3 inline mr-1" />
          Satellite
        </button>
        <button
          onClick={() => { setActivePortal('farmer'); navigate('/farmer-portal'); }}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activePortal === 'farmer' ? 'bg-popover text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Leaf className="w-3 h-3 inline mr-1" />
          Farmer
        </button>
      </div>

      {/* Nav Links */}
      <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              location.pathname === item.path
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right Section */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search farms..."
            className="h-8 w-44 pl-8 text-xs bg-muted border-0"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" title={user?.email}>
            <User className="w-4 h-4 text-primary" />
          </div>
          {user && (
            <span className="text-xs text-muted-foreground hidden md:block max-w-[100px] truncate">
              {user.full_name || user.email}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="Sign out">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}
