import { create } from 'zustand';
import { getSettings } from '@/lib/api';

export interface BannerConfig {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
  linkUrl: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  targetCategory: string; // slug or empty for all
}

interface BannerState {
  banner: BannerConfig;
  isLoading: boolean;
  updateBanner: (config: Partial<BannerConfig>) => void;
  fetchBanner: () => Promise<void>;
}

export const useBannerStore = create<BannerState>((set) => {
  const defaultBanner: BannerConfig = {
    enabled: true,
    title: 'Mid-Season Collection — Free Delivery Above 3,000 ETB',
    description: 'Premium footwear & handpicked apparel delivered to your doorstep in Addis Ababa.',
    buttonText: 'Shop New Arrivals',
    linkUrl: '/products?sortBy=newest',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    targetCategory: '',
  };

  let initialBanner = defaultBanner;
  try {
    const raw = localStorage.getItem('shegaddis_banner_config');
    if (raw) {
      initialBanner = { ...defaultBanner, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Could not read banner from localStorage', err);
  }

  return {
    banner: initialBanner,
    isLoading: false,
    updateBanner: (config) => {
      set((state) => {
        const next = { ...state.banner, ...config };
        try {
          localStorage.setItem('shegaddis_banner_config', JSON.stringify(next));
        } catch (err) {
          console.warn('Could not persist banner to localStorage', err);
        }
        return { banner: next };
      });
    },
    fetchBanner: async () => {
      try {
        set({ isLoading: true });
        const data = await getSettings();
        if (data?.banner) {
          try {
            localStorage.setItem('shegaddis_banner_config', JSON.stringify(data.banner));
          } catch (err) {
            console.warn('Could not cache banner to localStorage', err);
          }
          set({ banner: data.banner });
        }
      } catch {
        // Fallback to current / local storage
      } finally {
        set({ isLoading: false });
      }
    },
  };
});
