import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StoreNavbar } from '@/components/store/StoreNavbar';
import { StoreFooter } from '@/components/store/StoreFooter';
import { useSettingsStore } from '@/store/settingsStore';
import { useBannerStore } from '@/store/bannerStore';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { useProductStore } from '@/store/productStore';
import { useCategoryStore } from '@/store/categoryStore';

/**
 * Store Layout — Wraps all public-facing pages with navbar + footer.
 */
export function StoreLayout() {
  const location = useLocation();
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const fetchBanner = useBannerStore((s) => s.fetchBanner);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchSettings();
    fetchBanner();
    fetchCategories();
    fetchProducts();
  }, [fetchSettings, fetchBanner, fetchCategories, fetchProducts]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  return (
    <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-hidden">
      <StoreNavbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex-1 w-full max-w-full overflow-x-hidden"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <StoreFooter />
    </div>
  );
}
