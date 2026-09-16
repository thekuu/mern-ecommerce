import { create } from 'zustand';
import { getSettings, AppSettings } from '@/lib/api';

interface SettingsState {
  deliveryFee: number;
  storeName: string;
  contactPhone: string;
  contactEmail: string;
  telegramHandle: string;
  instagramHandle: string;
  heroImage: string;
  heroImage2: string;
  heroImage3: string;
  mobileHeroImage: string;
  mobileHeroImage2: string;
  mobileHeroImage3: string;
  isLoading: boolean;
  setDeliveryFee: (fee: number) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => {
  let savedLocal: Partial<AppSettings> = {};
  try {
    localStorage.removeItem('homicart_store_settings');
    const raw = localStorage.getItem('shegaddis_store_settings');
    if (raw) {
      savedLocal = JSON.parse(raw);
      localStorage.setItem('shegaddis_store_settings', JSON.stringify(savedLocal));
    }
  } catch {
    // Ignore localStorage read errors
  }

  const initial = savedLocal;

  return {
    deliveryFee: typeof initial.deliveryFee === 'number' ? initial.deliveryFee : 150,
    storeName: initial.storeName || 'ShegAddis',
    contactPhone: initial.contactPhone || '+251 911 234 567',
    contactEmail: initial.contactEmail || 'contact@shegaddis.com',
    telegramHandle: initial.telegramHandle || '@ShegAddis',
    instagramHandle: initial.instagramHandle || '@shegaddis_et',
    heroImage: initial.heroImage || '',
    heroImage2: initial.heroImage2 || '',
    heroImage3: initial.heroImage3 || '',
    mobileHeroImage: initial.mobileHeroImage || '',
    mobileHeroImage2: initial.mobileHeroImage2 || '',
    mobileHeroImage3: initial.mobileHeroImage3 || '',
    isLoading: false,

    setDeliveryFee: (fee) => {
      set({ deliveryFee: fee });
      try {
        const raw = localStorage.getItem('shegaddis_store_settings');
        const curr = raw ? JSON.parse(raw) : {};
        localStorage.setItem('shegaddis_store_settings', JSON.stringify({ ...curr, deliveryFee: fee }));
      } catch (err) {
        console.warn('Could not save delivery fee to localStorage', err);
      }
    },

    setSettings: (settings) => {
      const sanitized = settings;
      try {
        const raw = localStorage.getItem('shegaddis_store_settings');
        const curr = raw ? JSON.parse(raw) : {};
        localStorage.setItem('shegaddis_store_settings', JSON.stringify({ ...curr, ...sanitized }));
      } catch (err) {
        console.warn('Could not save settings to localStorage', err);
      }
      
      set((state) => ({
        deliveryFee: sanitized.deliveryFee !== undefined ? sanitized.deliveryFee : state.deliveryFee,
        storeName: sanitized.storeName !== undefined ? sanitized.storeName : state.storeName,
        contactPhone: sanitized.contactPhone !== undefined ? sanitized.contactPhone : state.contactPhone,
        contactEmail: sanitized.contactEmail !== undefined ? sanitized.contactEmail : state.contactEmail,
        telegramHandle: sanitized.telegramHandle !== undefined ? sanitized.telegramHandle : state.telegramHandle,
        instagramHandle: sanitized.instagramHandle !== undefined ? sanitized.instagramHandle : state.instagramHandle,
        heroImage: sanitized.heroImage !== undefined ? sanitized.heroImage : state.heroImage,
        heroImage2: sanitized.heroImage2 !== undefined ? sanitized.heroImage2 : state.heroImage2,
        heroImage3: sanitized.heroImage3 !== undefined ? sanitized.heroImage3 : state.heroImage3,
      }));
    },

    fetchSettings: async () => {
      try {
        set({ isLoading: true });
        const data = await getSettings();
        if (data) {
          const sanitized = data;
          try {
            localStorage.setItem('shegaddis_store_settings', JSON.stringify(sanitized));
          } catch (err) {
            console.warn('Could not cache settings', err);
          }
          set({
            deliveryFee: typeof sanitized.deliveryFee === 'number' ? sanitized.deliveryFee : 150,
            storeName: sanitized.storeName || 'ShegAddis',
            contactPhone: sanitized.contactPhone || '+251 911 234 567',
            contactEmail: sanitized.contactEmail || 'contact@shegaddis.com',
            telegramHandle: sanitized.telegramHandle || '@ShegAddis',
            instagramHandle: sanitized.instagramHandle || '@shegaddis_et',
            heroImage: sanitized.heroImage || '',
            heroImage2: sanitized.heroImage2 || '',
            heroImage3: sanitized.heroImage3 || '',
          });
        }
      } catch {
        // Fall back to current state / localStorage
      } finally {
        set({ isLoading: false });
      }
    },
  };
});
