import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, BarChart3,
  ChevronLeft, Menu, Settings, Send, LogOut, UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

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
  const { user, token, clearAuth } = useAuthStore();
  const location = useLocation();

  const isAdminSession = (user && (user.role === 'superadmin' || user.role === 'admin' || user.role === 'moderator')) || sessionStorage.getItem('admin_auth') === 'true';

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
      {/* Sidebar */}
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
          {adminNav.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                `}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-heading font-semibold text-lg">
              {adminNav.find(n => n.to === location.pathname)?.label || 'Admin'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {user?.email || 'admin@example.com'}
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

