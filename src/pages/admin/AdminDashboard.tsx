import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, type DashboardStats } from '@/lib/api';
import { formatETB } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const revenueData = [
  { day: 'Mon', revenue: 14200, orders: 4 },
  { day: 'Tue', revenue: 18500, orders: 5 },
  { day: 'Wed', revenue: 12000, orders: 3 },
  { day: 'Thu', revenue: 24800, orders: 7 },
  { day: 'Fri', revenue: 31200, orders: 9 },
  { day: 'Sat', revenue: 42000, orders: 12 },
  { day: 'Sun', revenue: 38500, orders: 10 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const defaultStats: DashboardStats = {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingDrafts: 0,
    revenueChange: 0,
    ordersChange: 0,
    categoryBreakdown: [],
    recentOrders: [],
  };

  const activeStats = stats || defaultStats;

  const cards = [
    {
      label: 'Total Revenue',
      value: formatETB(activeStats.totalRevenue),
      change: `+${activeStats.revenueChange}%`,
      icon: DollarSign,
    },
    {
      label: 'Total Orders',
      value: activeStats.totalOrders.toLocaleString(),
      change: `+${activeStats.ordersChange}%`,
      icon: ShoppingCart,
    },
    {
      label: 'Active Customers',
      value: activeStats.totalCustomers.toLocaleString(),
      change: '+6.5%',
      icon: Users,
    },
    {
      label: 'Live Catalog Items',
      value: activeStats.totalProducts.toLocaleString(),
      change: '',
      icon: Package,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Store Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Addis Ababa store metrics, real-time inventory, and Telegram channel ingestion pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/telegram">
            <Button variant="outline" size="sm" className="font-heading text-xs uppercase tracking-wider">
              <Send className="h-3.5 w-3.5 mr-1.5" /> Telegram Pipeline
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats
          ? cards.map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{card.label}</span>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">{card.value}</p>
                {card.change && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                    <TrendingUp className="h-3 w-3" /> {card.change} vs previous cycle
                  </p>
                )}
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-5 h-28 animate-pulse" />
            ))}
      </div>

      {/* Ingestion Notification Banner */}
      {stats && stats.pendingDrafts > 0 && (
        <div className="bg-muted/40 border border-foreground/15 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">
                {stats.pendingDrafts} Telegram Post{stats.pendingDrafts > 1 ? 's' : ''} Ready for Ingestion
              </p>
              <p className="text-xs text-muted-foreground">
                Channel scrapers parsed images, color variants, and sizes. Review and import with 1-click.
              </p>
            </div>
          </div>
          <Link to="/admin/telegram">
            <Button size="sm" className="font-heading text-xs uppercase tracking-wider">
              Review Drafts <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Analytics Visualizers (Recharts) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-base">Weekly Revenue Velocity (ETB)</h3>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Past 7 Days</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '6px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-base">Catalog Distribution by Category</h3>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Active SKU Volume</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.categoryBreakdown || [
                  { name: 'Clothes', count: 4 },
                  { name: 'Shoes', count: 4 },
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} items`, 'Products']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '6px' }}
                />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-heading font-semibold text-base">Recent Addis Ababa Orders</h3>
            <p className="text-xs text-muted-foreground">Latest order placements requiring fulfillment or status transition.</p>
          </div>
          <Link to="/admin/orders" className="text-xs uppercase tracking-wider font-semibold hover:underline flex items-center gap-1">
            View All Orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border text-sm">
          {activeStats.recentOrders?.map((order) => (
            <div key={order.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-semibold">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {order.customerName} · {order.subcity} · {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-heading font-semibold text-xs">{formatETB(order.total)}</span>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                  {order.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
