import { create } from 'zustand';
import type { Product } from '@/types';

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (product: Product) => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: JSON.parse(localStorage.getItem('wishlist') || '[]'),

  addItem: (product) => {
    set(state => {
      if (state.items.find(i => i.id === product.id)) return state;
      const items = [...state.items, product];
      localStorage.setItem('wishlist', JSON.stringify(items));
      return { items };
    });
  },

  removeItem: (productId) => {
    set(state => {
      const items = state.items.filter(i => i.id !== productId);
      localStorage.setItem('wishlist', JSON.stringify(items));
      return { items };
    });
  },

  isInWishlist: (productId) => get().items.some(i => i.id === productId),

  toggleItem: (product) => {
    if (get().isInWishlist(product.id)) {
      get().removeItem(product.id);
    } else {
      get().addItem(product);
    }
  },
}));
