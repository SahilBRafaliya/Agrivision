import { useEffect, useState } from 'react';
import { MapPin, Search, Leaf, ChevronUp, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminAPI } from '@/services/api';
import { toast } from 'sonner';

const healthBadge = (score: number | null) => {
  if (score === null || score === undefined) return 'bg-gray-700 text-gray-400';
  if (score >= 65) return 'bg-green-500/20 text-green-400';
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

type SortKey = 'farm_name' | 'crop_type' | 'latest_ndvi' | 'latest_health' | 'created_at';

export default function AdminFarmsPage() {
  const [farms, setFarms]     = useState<any[]>([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('farm_name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    adminAPI.listFarms()
      .then(setFarms)
      .catch(() => toast.error('Failed to load farms'))
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = farms
    .filter(f =>
      f.farm_name.toLowerCase().includes(query.toLowerCase()) ||
      f.crop_type.toLowerCase().includes(query.toLowerCase()) ||
      (f.owner_email || '').toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return sortAsc
        ? String(av).localeCompare(String(bv), undefined, { numeric: true })
        : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3 opacity-20" />;

  const ThBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-gray-200 transition-colors">
      {label}<SortIcon k={k} />
    </button>
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">All Farms</h1>
            <p className="text-gray-400 text-sm mt-1">{farms.length} farms registered across all users</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search farm, crop, or owner…"
              className="h-9 pl-9 pr-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-500 text-sm focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Farms', value: farms.length, color: 'text-white' },
            { label: 'With NDVI Data', value: farms.filter(f => f.latest_ndvi != null).length, color: 'text-green-400' },
            { label: 'Healthy (≥65%)', value: farms.filter(f => (f.latest_health ?? 0) >= 65).length, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading farms…
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-xs text-gray-500">
                    <th className="text-left px-4 py-3"><ThBtn label="Farm" k="farm_name" /></th>
                    <th className="text-left px-4 py-3"><ThBtn label="Crop" k="crop_type" /></th>
                    <th className="text-left px-4 py-3">Owner</th>
                    <th className="text-right px-4 py-3"><ThBtn label="NDVI" k="latest_ndvi" /></th>
                    <th className="text-right px-4 py-3"><ThBtn label="Health" k="latest_health" /></th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3"><ThBtn label="Registered" k="created_at" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">No farms match your search</td>
                    </tr>
                  ) : filtered.map(farm => (
                    <tr key={farm.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{farm.farm_name}</p>
                        <p className="text-xs text-gray-600 font-mono mt-0.5">{farm.id?.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
                          <Leaf className="w-3 h-3 inline mr-1" />{farm.crop_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-200 text-sm">{farm.owner_name || '—'}</p>
                        <p className="text-xs text-gray-500">{farm.owner_email || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-mono font-semibold">
                        {farm.latest_ndvi?.toFixed(3) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthBadge(farm.latest_health)}`}>
                          {farm.latest_health?.toFixed(0) ?? '—'}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {farm.latitude?.toFixed(3)}°N, {farm.longitude?.toFixed(3)}°E
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(farm.created_at)}</td>
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
