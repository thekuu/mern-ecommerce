import { create } from 'zustand';
import type { Order, OrderStatus } from '@/types';
import { getOrders } from '@/lib/api';

interface OrderState {
  orders: Order[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  fetchOrders: (force?: boolean) => Promise<void>;
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  clearOrders: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  hasFetched: false,
  error: null,

  fetchOrders: async (force = false) => {
    const { hasFetched, loading } = get();
    // If already loading, avoid redundant concurrent calls
    if (loading) return;

    // If already fetched and not forced, perform silent background revalidation without blocking UI
    if (!hasFetched) {
      set({ loading: true, error: null });
    }

    try {
      const data = await getOrders();
      const sortedData = Array.isArray(data) ? [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
      set({
        orders: sortedData,
        loading: false,
        hasFetched: true,
        error: null,
      });
    } catch (err: any) {
      if (err?.message !== 'Authentication required') {
        console.error('Failed to prefetch orders:', err);
      }
      set({
        loading: false,
        error: err?.message === 'Authentication required' ? 'Please log in to view orders' : (err?.message || 'Failed to load orders'),
      });
    }
  },

  addOrder: (order: Order) => {
    set((state) => {
      // Check if order already exists in list
      const exists = state.orders.some(
        (o) => o.id === order.id || o.orderNumber === order.orderNumber
      );
      if (exists) {
        return {
          orders: state.orders.map((o) =>
            o.id === order.id || o.orderNumber === order.orderNumber ? order : o
          ),
        };
      }
      return {
        orders: [order, ...state.orders],
        hasFetched: true,
      };
    });
  },

  setOrders: (orders) => set({ orders: [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), hasFetched: true, loading: false }),

  updateStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      ),
    })),

  clearOrders: () => set({ orders: [], hasFetched: false, loading: false, error: null }),
}));
