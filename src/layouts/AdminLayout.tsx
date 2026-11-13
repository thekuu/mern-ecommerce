import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, BarChart3,
  ChevronLeft, Menu, X, Settings, Send, LogOut, UserCircle, Bell, CheckCheck, Clock, MapPin, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthStore } from '@/store/authStore';
import { getOrders } from '@/lib/api';
import { formatETB } from '@/lib/currency';
import { toast } from 'sonner';
import type { Order } from '@/types';

const SEEN_ORDERS_KEY = 'shegaddis_seen_order_ids';

function getSeenOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // ignore storage errors
  }
  return new Set();
}

function saveSeenOrderIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage errors
  }
}

const adminNav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: FolderTree },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingCart },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Telegram', to: '/admin/telegram', icon: Send },
  { label: 'Store Settings', to: '/admin/settings', icon: Settings },
  { label: 'Account', to: '/admin/profile', icon: UserCircle },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenOrderIds());
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminSession =
    (user && (user.role === 'superadmin' || user.role === 'admin' || user.role === 'moderator')) ||
    sessionStorage.getItem('admin_auth') === 'true';

  const pollOrders = useCallback(async () => {
    if (!isAdminSession) return;
    try {
      const data = await getOrders(true);
      if (!Array.isArray(data)) return;
      setOrders(data);

      // Check for newly arrived orders since initial load
      if (knownOrderIdsRef.current === null) {
        knownOrderIdsRef.current = new Set(data.map((o) => o.id));
      } else {
        const newlyArrived = data.filter(
          (o) => !knownOrderIdsRef.current!.has(o.id) && o.status === 'pending'
        );
        if (newlyArrived.length > 0) {
          newlyArrived.forEach((o) => {
            knownOrderIdsRef.current!.add(o.id);
            toast.info(`New Order ${o.orderNumber}`, {
              description: `${o.customerName || 'Customer'} (${o.subcity || 'Addis Ababa'}) · ${formatETB(o.total)}`,
              duration: 8000,
              action: {
                label: 'View Order',
                onClick: () => navigate(`/admin/orders?orderId=${o.id}`),
              },
            });
          });
        }
      }
    } catch {
      // Ignore background polling errors
    }
  }, [isAdminSession, navigate]);

  useEffect(() => {
    pollOrders();
    const interval = setInterval(pollOrders, 15000);
    return () => clearInterval(interval);
  }, [pollOrders, location.pathname]);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const unseenPendingOrders = pendingOrders.filter((o) => !seenIds.has(o.id));
  const badgeCount = unseenPendingOrders.length > 0 ? unseenPendingOrders.length : pendingOrders.length;

  const markOrderSeen = (orderId: string) => {
    const next = new Set(seenIds);
    next.add(orderId);
    setSeenIds(next);
    saveSeenOrderIds(next);
  };

  const markAllSeen = () => {
    const next = new Set(seenIds);
    orders.forEach((o) => next.add(o.id));
    setSeenIds(next);
    saveSeenOrderIds(next);
  };

  const handleOrderClick = (order: Order) => {
    markOrderSeen(order.id);
    setNotifOpen(false);
    navigate(`/admin/orders?orderId=${order.id}`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    clearAuth();
    window.location.href = '/admin/login';
  };

  if (!isAdminSession) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!collapsed && (
            <Link to="/admin" className="font-heading text-lg font-bold tracking-tight">
              Sheg<span className="text-primary">Addis</span> Admin
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="shrink-0">
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {adminNav.map((item) => {
            const active = location.pathname === item.to;
            const isOrdersItem = item.to === '/admin/orders';
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {isOrdersItem && pendingOrders.length > 0 && (
                  <span
                    className={`inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[20px] h-5 ${
                      active
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-amber-500 text-white'
                    } ${collapsed ? 'absolute -top-1 -right-1 h-4 min-w-[16px] px-1' : ''}`}
                    title={`${pendingOrders.length} pending order(s)`}
                  >
                    {pendingOrders.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors w-full">
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && <span>Logout</span>}
          </button>
          <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Store
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-card border-r border-border flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="font-heading text-lg font-bold tracking-tight">
                Sheg<span className="text-primary">Addis</span> Admin
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
              {adminNav.map((item) => {
                const active = location.pathname === item.to;
                const isOrdersItem = item.to === '/admin/orders';
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                      ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {isOrdersItem && pendingOrders.length > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[20px] h-5 bg-amber-500 text-white">
                        {pendingOrders.length}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border space-y-2">
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors w-full">
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Store
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-heading font-semibold text-lg">
              {adminNav.find((n) => n.to === location.pathname)?.label || 'Admin'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Order Notifications Bell */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative h-9 px-3 gap-2 border-border"
                  aria-label="Order Notifications"
                >
                  <Bell className={`h-4 w-4 ${pendingOrders.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <span className="hidden sm:inline text-xs font-medium">
                    {pendingOrders.length > 0 ? `${pendingOrders.length} Pending` : 'Orders'}
                  </span>
                  {badgeCount > 0 && (
                    <span className="relative flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {unseenPendingOrders.length > 0 && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      )}
                      <span className="relative">{badgeCount}</span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border-border">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div>
                    <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                      Order Notifications
                      {pendingOrders.length > 0 && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                          {pendingOrders.length} Pending
                        </Badge>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {unseenPendingOrders.length > 0
                        ? `${unseenPendingOrders.length} new unseen order(s)`
                        : 'Recent customer orders'}
                    </p>
                  </div>
                  {unseenPendingOrders.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllSeen}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark read
                    </Button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {orders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No orders placed yet.
                    </div>
                  ) : (
                    orders.slice(0, 8).map((order) => {
                      const isUnseen = order.status === 'pending' && !seenIds.has(order.id);
                      const customerName =
                        order.customerName ||
                        `${(order as any).shippingAddress?.firstName || ''} ${(order as any).shippingAddress?.lastName || ''}`.trim() ||
                        'Customer';
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => handleOrderClick(order)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start justify-between gap-3 ${
                            isUnseen ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground">
                                {order.orderNumber}
                              </span>
                              {isUnseen && (
                                <span className="inline-flex items-center rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                  NEW
                                </span>
                              )}
                              <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-xs font-medium text-foreground truncate">
                              {customerName} · {order.items?.length || 0} item(s)
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" /> {order.subcity || 'Addis Ababa'}
                              </span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Clock className="h-3 w-3" /> {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-heading font-bold text-xs text-foreground block">
                              {formatETB(order.total)}
                            </span>
                            <span className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-1">
                              Inspect <ArrowRight className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="p-2.5 border-t border-border bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs font-semibold justify-center"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/admin/orders');
                    }}
                  >
                    View All Orders ({orders.length}) <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {user?.email || 'admin@shegaddis.com'}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
