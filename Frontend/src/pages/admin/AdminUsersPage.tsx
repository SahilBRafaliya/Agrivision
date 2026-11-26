import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Leaf, ToggleLeft, ToggleRight, Trash2, Search, UserCheck, UserX } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminAPI } from '@/services/api';
import { authAPI } from '@/services/authAPI';
import { toast } from 'sonner';

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<any[]>([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'farmer' | 'admin'>('all');
  const currentUser = authAPI.getStoredUser();

  const load = () => {
    setLoading(true);
    adminAPI.listUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (userId: string) => {
    try {
      await adminAPI.toggleUserStatus(userId);
      toast.success('User status updated');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(query.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(query.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 text-sm mt-1">{users.length} registered users</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Role filter */}
            <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5">
              {(['all', 'farmer', 'admin'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    roleFilter === r ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="h-9 pl-9 pr-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-500 text-sm focus:outline-none focus:border-indigo-500 w-60"
              />
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: users.length,                                     icon: Users,      color: 'text-white',    bg: 'bg-gray-700',          border: 'border-gray-700' },
            { label: 'Farmers',     value: users.filter(u => u.role === 'farmer').length,    icon: Leaf,       color: 'text-green-400', bg: 'bg-green-500/10',     border: 'border-green-500/20' },
            { label: 'Admins',      value: users.filter(u => u.role === 'admin').length,     icon: ShieldCheck,color: 'text-indigo-400',bg: 'bg-indigo-500/10',    border: 'border-indigo-500/20' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`bg-gray-900 border ${border} rounded-xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading users…
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-xs text-gray-500">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-right px-4 py-3">Farms</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">No users match your search</td>
                    </tr>
                  ) : filtered.map(user => (
                    <tr key={user.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-300 text-xs font-bold">
                              {(user.full_name || user.email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {user.role === 'admin'
                            ? <><ShieldCheck className="w-3 h-3 inline mr-1" />Admin</>
                            : <><Leaf className="w-3 h-3 inline mr-1" />Farmer</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 font-mono">{user.farm_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium w-fit px-2 py-0.5 rounded-full ${
                          user.is_active
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}>
                          {user.is_active
                            ? <><UserCheck className="w-3 h-3" />Active</>
                            : <><UserX className="w-3 h-3" />Inactive</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(user.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {user.id !== currentUser?.id ? (
                            <>
                              <button
                                onClick={() => toggleStatus(user.id)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                              >
                                {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => deleteUser(user.id, user.email)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600 pr-2">(you)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
