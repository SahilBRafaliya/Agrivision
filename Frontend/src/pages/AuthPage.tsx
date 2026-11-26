import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, Eye, EyeOff, Tractor, ShieldCheck, Leaf, Brain, BarChart3, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { authAPI } from '@/services/authAPI';

type Role = 'farmer' | 'admin';
type Mode = 'login' | 'register';

const FEATURES = [
  { icon: Satellite, label: 'Sentinel-2 Imagery',    desc: '10-m multispectral satellite data' },
  { icon: Brain,     label: 'AI Crop Analysis',       desc: 'SSL + Random Forest predictions' },
  { icon: BarChart3, label: 'NDVI / EVI Indices',     desc: 'Real-time vegetation health scores' },
  { icon: Globe,     label: 'Yield Forecasting',      desc: 'Per-hectare estimates via ML models' },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole]         = useState<Role>('farmer');
  const [mode, setMode]         = useState<Mode>('login');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', admin_key: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setLoading(true);
    try {
      const token = mode === 'login'
        ? await authAPI.login(form.email, form.password)
        : await authAPI.register(form.email, form.password, form.full_name, role, form.admin_key || undefined);
      authAPI.storeToken(token.access_token);
      authAPI.storeUser(token.user);
      toast.success(`Welcome, ${token.user.full_name || token.user.email}!`);
      navigate(token.user.role === 'admin' ? '/admin' : '/farmer');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex">

      {/* Left hero panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-10 relative overflow-hidden border-r border-gray-800">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/25">
            <Satellite className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">AgriVision AI</p>
            <p className="text-xs text-green-400">Satellite Crop Intelligence</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Smart farming starts with<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                satellite intelligence
              </span>
            </h2>
            <p className="text-gray-400 mt-3 leading-relaxed">
              Monitor crop health, predict yields, and get AI-powered recommendations — all from real Sentinel-2 satellite imagery.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <Icon className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Satellite Bands', value: '13' },
              { label: 'Crop Classes',    value: '6' },
              { label: 'Resolution',      value: '10m' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-400">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-600 relative z-10">
          Powered by Sentinel-2 L2A · Microsoft Planetary Computer STAC
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 lg:hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Satellite className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">AgriVision AI</p>
              <p className="text-xs text-green-400">Satellite Crop Intelligence</p>
            </div>
          </div>

          {/* Role toggle */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 text-center">Select your role</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { r: 'farmer' as Role, Icon: Tractor,    title: 'Farmer Portal',    sub: 'Farm monitoring & reports', color: 'green' },
                { r: 'admin'  as Role, Icon: ShieldCheck, title: 'Admin Panel',      sub: 'Platform management',       color: 'indigo' },
              ]).map(({ r, Icon, title, sub, color }) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    role === r
                      ? color === 'green'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 bg-gray-800/40 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    role === r
                      ? color === 'green' ? 'bg-green-600' : 'bg-indigo-600'
                      : 'bg-gray-700'
                  }`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${role === r ? 'text-white' : 'text-gray-400'}`}>{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Auth form card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            {/* Sign in / Sign up tabs */}
            <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    mode === m
                      ? isAdmin
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-green-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <h3 className="font-semibold text-white text-lg">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {isAdmin
                  ? mode === 'login' ? 'Access the administration panel' : 'Admin registration requires a secret key'
                  : mode === 'login' ? 'Sign in to your farmer dashboard' : 'Start monitoring your crops today'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Full Name</label>
                  <Input
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder={isAdmin ? 'Admin Name' : 'Your Name'}
                    className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-green-500 focus-visible:ring-green-500/20"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email Address</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder={isAdmin ? 'admin@agrivision.ai' : 'farmer@example.com'}
                  className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="h-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isAdmin && mode === 'register' && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Admin Access Key</label>
                  <Input
                    type="password"
                    value={form.admin_key}
                    onChange={e => setForm(p => ({ ...p, admin_key: e.target.value }))}
                    placeholder="Enter admin secret key"
                    className="h-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus-visible:border-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact your system administrator for the key.</p>
                </div>
              )}

              <Button
                type="submit"
                className={`w-full h-10 font-semibold text-white mt-2 ${
                  isAdmin
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
                disabled={loading}
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'login'
                    ? `Sign in as ${isAdmin ? 'Admin' : 'Farmer'}`
                    : 'Create Account'}
              </Button>
            </form>

            <p className="text-xs text-gray-600 text-center mt-4">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className={`font-medium ${isAdmin ? 'text-indigo-400 hover:text-indigo-300' : 'text-green-400 hover:text-green-300'}`}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Info badge */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs ${
            isAdmin
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            <Leaf className="w-3.5 h-3.5 flex-shrink-0" />
            {isAdmin
              ? 'Admin accounts have full access to all platform data, ML models, and user management.'
              : 'Free accounts can register unlimited farms and access real-time satellite analysis.'}
          </div>
        </div>
      </div>
    </div>
  );
}
