import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, User as UserIcon, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { getOrders } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchDialog } from '@/components/store/SearchDialog';

const defaultNavLinks = [
  { label: 'Shop All', to: '/products' },
  { label: 'Clothes', to: '/products?category=clothes' },
  { label: 'Shoes', to: '/products?category=shoes' },
  { label: 'New', to: '/products?sortBy=newest' },
  { label: 'Sale', to: '/products?sale=true' },
];

export function StoreNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const location = useLocation();
  const itemCount = useCartStore(s => s.itemCount());
  const { isAuthenticated, user } = useAuthStore();
  const hasSaleItems = useProductStore(s => s.products.some(p => p.onSale || (p.compareAtPrice && p.compareAtPrice > p.price) || p.tags?.includes('sale')));
  
  const isAdmin = Boolean(user && (user.role === 'superadmin' || user.role === 'admin' || user.role === 'moderator'));
  const navLinks = defaultNavLinks.filter(link => link.label !== 'Sale' || hasSaleItems);

  useEffect(() => {
    if (!isAdmin) {
      setPendingOrdersCount(0);
      return;
    }
    let mounted = true;
    const checkPendingOrders = async () => {
      try {
        const orders = await getOrders(true);
        if (mounted && Array.isArray(orders)) {
          setPendingOrdersCount(orders.filter(o => o.status === 'pending').length);
        }
      } catch {
        // ignore
      }
    };
    checkPendingOrders();
    const timer = setInterval(checkPendingOrders, 20000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isAdmin, location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="font-heading text-xl font-bold tracking-tight">
            Sheg<span className="text-primary">Addis</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname + location.search === link.to ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin/orders" title="Admin Orders & Notifications">
                <Button variant="outline" size="sm" className="relative h-8 px-2.5 gap-1.5 text-xs">
                  <Bell className={`h-3.5 w-3.5 ${pendingOrdersCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <span className="hidden sm:inline">Admin</span>
                  {pendingOrdersCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 min-w-[18px] h-4 text-[10px] font-bold text-white">
                      {pendingOrdersCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/wishlist">
              <Button variant="ghost" size="icon" aria-label="Wishlist">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] gradient-primary border-0 text-primary-foreground">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link to={isAuthenticated ? '/profile' : '/login'} className="hidden md:inline-flex items-center">
              <Button variant="ghost" size="sm" className="gap-1.5 px-2" aria-label="Account">
                <UserIcon className="h-4 w-4" />
                {isAuthenticated && user?.username && (
                  <span className="text-xs font-medium max-w-[90px] truncate">@{user.username}</span>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-background animate-fade-in">
            <div className="container py-4 flex flex-col gap-3">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium py-2 hover:text-primary transition-colors ${
                    location.pathname + location.search === link.to ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin/orders"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium py-2 hover:text-primary transition-colors flex items-center justify-between"
                >
                  <span>Admin Orders</span>
                  {pendingOrdersCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {pendingOrdersCount} New
                    </span>
                  )}
                </Link>
              )}
              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium py-2 hover:text-primary transition-colors flex items-center justify-between"
              >
                <span>{isAuthenticated ? 'My Profile' : 'Sign In / Register'}</span>
                {isAuthenticated && user?.username && (
                  <span className="text-xs font-mono text-primary">@{user.username}</span>
                )}
              </Link>
            </div>
          </nav>
        )}
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
