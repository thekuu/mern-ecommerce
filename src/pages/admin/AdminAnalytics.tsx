import { useEffect, useState } from 'react';
import { getDashboardStats, getVisitorAnalytics, type VisitorAnalytics } from '@/lib/api';
import type { DashboardStats } from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { Users, MousePointerClick, Activity, Navigation, Loader2 } from 'lucide-react';

export default function AdminAnalytics() {
  const [visitorData, setVisitorData] = useState<VisitorAnalytics | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [vData, sData] = await Promise.all([
          getVisitorAnalytics(),
          getDashboardStats()
        ]);
        setVisitorData(vData);
        setStats(sData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Format data for charts
  const categoryData = stats?.categoryBreakdown?.map(c => ({
    name: c.name,
    Products: c.count
  })) || [];

  const topPagesData = visitorData?.topPages?.map(p => ({
    path: p.path.length > 20 ? p.path.substring(0, 20) + '...' : p.path,
    Visits: p.count,
    fullPath: p.path
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold">Analytics & Traffic</h2>
      </div>

      {/* Traffic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Active Sessions (15m)</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{visitorData?.activeSessions || 0}</p>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Unique Visitors (30d)</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{visitorData?.uniqueVisitors || 0}</p>
        </div>

        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <MousePointerClick className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">Total Page Views (30d)</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{visitorData?.totalVisits || 0}</p>
        </div>
        
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Navigation className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Avg Pages / Visitor</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            {visitorData?.uniqueVisitors ? (visitorData.totalVisits / visitorData.uniqueVisitors).toFixed(1) : 0}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Pages Chart */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-heading font-semibold mb-6">Most Visited Pages</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPagesData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis type="number" />
                <YAxis dataKey="path" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [value, 'Views']}
                  labelFormatter={(label, payload) => payload[0]?.payload.fullPath || label}
                />
                <Bar dataKey="Visits" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-heading font-semibold mb-6">Products by Category</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Products" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visitor Logs Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-heading font-semibold">Recent Visitor Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">User/Session</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
                <th className="px-4 py-3 font-medium">Device/Browser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visitorData?.recentLogs?.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={log.path}>
                    {log.path}
                  </td>
                  <td className="px-4 py-3">
                    {log.userId ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        Logged In
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs font-mono">
                        {log.sessionId.split('-')[1] || 'Guest'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {log.ipAddress || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={log.userAgent || ''}>
                    {log.userAgent || 'Unknown'}
                  </td>
                </tr>
              ))}
              {(!visitorData?.recentLogs || visitorData.recentLogs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No recent visitor activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
