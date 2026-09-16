import { create } from 'zustand';
import type { Category } from '@/types';
import { initialCategories } from '@/db/seed-data';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  setCategories: (categories: Category[]) => void;
  fetchCategories: () => Promise<void>;
  addCategory: (data: { name: string; slug: string; description?: string; image?: string }) => Promise<Category>;
  editCategory: (id: string, data: Partial<Category>) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: initialCategories as Category[],
  isLoading: false,
  setCategories: (categories) => set({ categories }),
  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const data = await getCategories();
      if (Array.isArray(data) && data.length > 0) {
        set({ categories: data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
      set({ isLoading: false });
    }
  },
  addCategory: async (data) => {
    set({ isLoading: true });
    try {
      const created = await createCategory(data);
      set((s) => ({
        categories: [...s.categories, created],
        isLoading: false,
      }));
      return created;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  editCategory: async (id, data) => {
    set({ isLoading: true });
    try {
      const updated = await updateCategory(id, data);
      set((s) => ({
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  removeCategory: async (id) => {
    set({ isLoading: true });
    try {
      await deleteCategory(id);
      set((s) => ({
        categories: s.categories.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
}));
