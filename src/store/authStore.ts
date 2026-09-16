import { create } from 'zustand';
import type { User } from '@/types';
import { useOrderStore } from './orderStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

const savedToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
let initialUser: User | null = null;
try {
  const savedUser = localStorage.getItem('auth_user');
  if (savedUser) {
    initialUser = JSON.parse(savedUser);
  }
} catch {
  initialUser = null;
}

const isInitiallyAuthenticated = !!savedToken && !!initialUser;

// If user is already authenticated on app launch, prefetch their orders immediately in the background
if (isInitiallyAuthenticated) {
  setTimeout(() => {
    useOrderStore.getState().fetchOrders();
  }, 100);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: savedToken,
  isAuthenticated: isInitiallyAuthenticated,

  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });

    // Immediately prefetch customer's order history into store in the background
    useOrderStore.getState().fetchOrders(true);
  },

  clearAuth: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    useOrderStore.getState().clearOrders();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
