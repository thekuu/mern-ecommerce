import { create } from 'zustand';
import type { Product, PaginatedResponse, ProductFilters } from '@/types';
import { initialProducts, initialCategories } from '@/db/seed-data';
import {
  getProducts as apiGetProducts,
  getProductBySlug as apiGetProductBySlug,
  deleteProduct,
  createProduct,
  updateProduct,
} from '@/lib/api';

const defaultProducts: Product[] = initialProducts.map((p) => ({
  ...p,
  category: initialCategories.find((c) => c.id === p.categoryId) || initialCategories[0],
  sizes: Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean))) as string[],
  colors: Array.from(
    new Map(
      p.variants
        .filter((v) => v.colorName && v.colorHex)
        .map((v) => [v.colorName, { name: v.colorName!, hex: v.colorHex! }])
    ).values()
  ),
}));

// TTL: 5 minutes in-memory cache for catalog and detail requests
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedFilterEntry {
  data: PaginatedResponse<Product>;
  timestamp: number;
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  lastFetchedAll: number | null;
  detailCache: Record<string, { product: Product; timestamp: number }>;
  filterCache: Record<string, CachedFilterEntry>;

  setProducts: (products: Product[]) => void;
  upsert: (product: Product) => Promise<void>;
  remove: (id: string) => Promise<void>;
  fetchProducts: (force?: boolean) => Promise<void>;
  fetchProductsWithFilters: (
    filters: ProductFilters,
    force?: boolean
  ) => Promise<PaginatedResponse<Product>>;
  prefetchProduct: (slugOrId: string) => Promise<void>;
  getProduct: (slugOrId: string, force?: boolean) => Promise<Product | null>;
}

function getFilterCacheKey(filters: ProductFilters): string {
  const parts: string[] = [
    `page=${filters.page || 1}`,
    `size=${filters.pageSize || 12}`,
    `cat=${filters.category || ''}`,
    `sort=${filters.sortBy || ''}`,
    `sale=${filters.onSale ? '1' : '0'}`,
    `feat=${filters.isFeatured ? '1' : '0'}`,
    `new=${filters.isNew ? '1' : '0'}`,
    `q=${filters.search || ''}`,
    `sz=${filters.size || ''}`,
    `col=${filters.color || ''}`,
    `min=${filters.minPrice ?? ''}`,
    `max=${filters.maxPrice ?? ''}`,
  ];
  return parts.join('&');
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: defaultProducts,
  isLoading: false,
  lastFetchedAll: null,
  detailCache: {},
  filterCache: {},

  setProducts: (products) => set({ products }),

  upsert: async (product) => {
    set((s) => {
      const idx = s.products.findIndex((p) => p.id === product.id);
      const next = idx === -1 ? [product, ...s.products] : [...s.products];
      if (idx !== -1) next[idx] = product;

      // Invalidate filter caches and update detail cache
      const newDetailCache = {
        ...s.detailCache,
        [product.slug]: { product, timestamp: Date.now() },
        [product.id]: { product, timestamp: Date.now() },
      };

      return {
        products: next,
        detailCache: newDetailCache,
        filterCache: {}, // Invalidate filter queries to ensure fresh stock/info
      };
    });

    try {
      const variants = (product as any).variants || (() => {
        const vars: any[] = [];
        const sizes = product.sizes?.length ? product.sizes : [null];
        const colors = product.colors?.length ? product.colors : [{ name: null, hex: null }];
        
        sizes.forEach((size, sIdx) => {
          colors.forEach((color, cIdx) => {
            if (size === null && color.name === null) return;
            vars.push({
              size: size,
              colorName: color.name,
              colorHex: color.hex,
              sku: `${product.sku}-${sIdx}-${cIdx}`,
              stock: product.stock,
              priceDelta: 0,
            });
          });
        });
        return vars;
      })();

      const isExisting = get().products.some((p) => p.id === product.id);
      if (isExisting) {
        await updateProduct(product.id, {
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          categoryId: product.category?.id,
          tags: product.tags,
          stock: product.stock,
          images: product.images,
          variants,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
        });
      } else {
        await createProduct({
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          categoryId: product.category?.id,
          tags: product.tags,
          stock: product.stock,
          images: product.images,
          variants,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
        });
      }
    } catch (err) {
      console.warn('API upsert failed, maintained local state:', err);
    }
  },

  remove: async (id: string) => {
    set((s) => {
      const nextDetail = { ...s.detailCache };
      delete nextDetail[id];
      return {
        products: s.products.filter((p) => p.id !== id && p.slug !== id),
        detailCache: nextDetail,
        filterCache: {},
      };
    });
    try {
      await deleteProduct(id);
    } catch (err) {
      console.warn('API delete warning:', err);
    }
  },

  fetchProducts: async (force = false) => {
    const { lastFetchedAll, isLoading } = get();
    const now = Date.now();

    // Cache hit: avoid network request if fetched within TTL unless force is true
    if (!force && lastFetchedAll && now - lastFetchedAll < CACHE_TTL_MS) {
      return;
    }

    if (isLoading) return;

    try {
      set({ isLoading: true, ...(force ? { filterCache: {} } : {}) });
      const res = await apiGetProducts({ pageSize: 500 });
      if (res && res.data) {
        // Seed detail cache with newly loaded items
        const detailUpdates: Record<string, { product: Product; timestamp: number }> = {};
        for (const item of res.data) {
          detailUpdates[item.slug] = { product: item, timestamp: now };
          detailUpdates[item.id] = { product: item, timestamp: now };
        }

        set((s) => ({
          products: res.data,
          lastFetchedAll: now,
          filterCache: force ? {} : s.filterCache,
          detailCache: { ...s.detailCache, ...detailUpdates },
        }));
      }
    } catch {
      // Retain existing products
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProductsWithFilters: async (filters: ProductFilters, force = false) => {
    const cacheKey = getFilterCacheKey(filters);
    const { filterCache } = get();
    const cached = filterCache[cacheKey];
    const now = Date.now();

    // 0ms Cache Hit
    if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const res = await apiGetProducts(filters);
    if (res && res.data) {
      // Seed detail cache for all returned products
      const detailUpdates: Record<string, { product: Product; timestamp: number }> = {};
      for (const item of res.data) {
        detailUpdates[item.slug] = { product: item, timestamp: now };
        detailUpdates[item.id] = { product: item, timestamp: now };
      }

      set((s) => ({
        filterCache: {
          ...s.filterCache,
          [cacheKey]: { data: res, timestamp: now },
        },
        detailCache: { ...s.detailCache, ...detailUpdates },
      }));
    }
    return res;
  },

  prefetchProduct: async (slugOrId: string) => {
    if (!slugOrId) return;
    const { detailCache, products } = get();
    const cached = detailCache[slugOrId];
    const now = Date.now();

    // If already in detail cache within TTL, nothing needed
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return;
    }

    // Check if in general products array
    const existing = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
    if (existing) {
      set((s) => ({
        detailCache: {
          ...s.detailCache,
          [existing.slug]: { product: existing, timestamp: now },
          [existing.id]: { product: existing, timestamp: now },
        },
      }));
      return;
    }

    // Otherwise fetch silently in background without blocking UI
    try {
      const p = await apiGetProductBySlug(slugOrId);
      if (p) {
        set((s) => ({
          detailCache: {
            ...s.detailCache,
            [p.slug]: { product: p, timestamp: now },
            [p.id]: { product: p, timestamp: now },
          },
        }));
      }
    } catch {
      // Ignore background prefetch errors
    }
  },

  getProduct: async (slugOrId: string, force = false) => {
    if (!slugOrId) return null;
    const { detailCache, products } = get();
    const cached = detailCache[slugOrId];
    const now = Date.now();

    // Instant return if in detail cache
    if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.product;
    }

    // Check if in main catalog list
    const existing = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
    if (!force && existing) {
      set((s) => ({
        detailCache: {
          ...s.detailCache,
          [existing.slug]: { product: existing, timestamp: now },
          [existing.id]: { product: existing, timestamp: now },
        },
      }));
      return existing;
    }

    // Fetch from network
    try {
      const p = await apiGetProductBySlug(slugOrId);
      if (p) {
        set((s) => ({
          detailCache: {
            ...s.detailCache,
            [p.slug]: { product: p, timestamp: now },
            [p.id]: { product: p, timestamp: now },
          },
        }));
      }
      return p;
    } catch {
      return existing || null;
    }
  },
}));
