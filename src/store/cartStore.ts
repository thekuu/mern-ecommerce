import { create } from 'zustand';
import type { CartItem, Product, ProductColor } from '@/types';

/**
 * Cart Store — variant-aware.
 * Each cart line is uniquely identified by (product.id + size + color),
 * so the same product in two sizes shows as two separate lines.
 */

export interface AddToCartOptions {
  size?: string;
  color?: ProductColor;
  imageUrl?: string;
}

export const makeVariantKey = (productId: string, size?: string, color?: ProductColor) =>
  `${productId}::${size ?? ''}::${color?.name ?? ''}`;

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, options?: AddToCartOptions) => void;
  removeItem: (variantKey: string) => void;
  updateQuantity: (variantKey: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

function loadCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem('cart') || '[]') as CartItem[];
    // Backward-compat: hydrate variantKey if missing
    return raw.map(i => ({
      ...i,
      variantKey: i.variantKey ?? makeVariantKey(i.product.id, i.size, i.color),
    }));
  } catch {
    return [];
  }
}

const persist = (items: CartItem[]) => localStorage.setItem('cart', JSON.stringify(items));

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCart(),
  addItem: (product, quantity = 1, options = {}) => {
    const variantKey = makeVariantKey(product.id, options.size, options.color);
    set(state => {
      const existing = state.items.find(i => i.variantKey === variantKey);
      const items = existing
        ? state.items.map(i => i.variantKey === variantKey ? { ...i, quantity: i.quantity + quantity, imageUrl: options.imageUrl || i.imageUrl } : i)
        : [...state.items, { product, quantity, variantKey, size: options.size, color: options.color, imageUrl: options.imageUrl }];
      persist(items);
      return { items };
    });
  },

  removeItem: (variantKey) => {
    set(state => {
      const items = state.items.filter(i => i.variantKey !== variantKey);
      persist(items);
      return { items };
    });
  },

  updateQuantity: (variantKey, quantity) => {
    if (quantity < 1) return get().removeItem(variantKey);
    set(state => {
      const items = state.items.map(i => i.variantKey === variantKey ? { ...i, quantity } : i);
      persist(items);
      return { items };
    });
  },

  clearCart: () => {
    localStorage.removeItem('cart');
    set({ items: [] });
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  subtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
}));
