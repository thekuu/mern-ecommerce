import type {
  Product,
  Category,
  Order,
  User,
  Review,
  PaginatedResponse,
  ProductFilters,
} from '@/types';
import { useAuthStore } from '@/store/authStore';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token || localStorage.getItem('auth_token') || localStorage.getItem('token');
  const isAdminSession = sessionStorage.getItem('admin_auth') === 'true';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isAdminSession) {
    headers['x-admin-session'] = 'true';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Token is invalid or expired
      useAuthStore.getState().clearAuth();
    }
    let errorMsg = 'Request failed';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = `Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ─── Products ───────────────────────────────────────────────

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.onSale) params.set('onSale', 'true');
  if (filters.isNew) params.set('isNew', 'true');
  if (filters.isFeatured) params.set('isFeatured', 'true');
  if (filters.size) params.set('size', filters.size);
  if (filters.color) params.set('color', filters.color);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  const qs = params.toString();
  return request<PaginatedResponse<Product>>(`/products${qs ? `?${qs}` : ''}`);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await request<Product>(`/products/${encodeURIComponent(slug)}`);
  } catch (err: any) {
    if (err.message?.includes('not found') || err.message?.includes('404')) {
      return null;
    }
    throw err;
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const res = await request<PaginatedResponse<Product>>('/products?isFeatured=true&pageSize=8');
  return res.data;
}

export async function getNewArrivals(pageSize = 10): Promise<Product[]> {
  const res = await request<PaginatedResponse<Product>>(`/products?isNew=true&pageSize=${pageSize}`);
  return res.data;
}

export async function createProduct(data: any): Promise<Product> {
  return request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: any): Promise<Product> {
  return request<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
  });
}

// ─── Categories ─────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export async function createCategory(data: { name: string; slug: string; description?: string; image?: string }): Promise<Category> {
  return request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category> {
  return request<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// ─── Orders ─────────────────────────────────────────────────

export async function getOrders(all = false): Promise<Order[]> {
  return request<Order[]>(`/orders${all ? '?all=true' : ''}`);
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    return await request<Order>(`/orders/${id}`);
  } catch {
    return null;
  }
}

export async function createOrder(data: {
  subcity: string;
  woreda?: string;
  street: string;
  phone: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  paymentMethod?: string;
  notes?: string;
  items: any[];
}): Promise<Order> {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(orderId: string, status: string): Promise<Order> {
  return request<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function uploadReceipt(orderId: string, receiptUrl: string): Promise<{ message: string; order: Order }> {
  return request<{ message: string; order: Order }>(`/orders/${orderId}/receipt`, {
    method: 'POST',
    body: JSON.stringify({ receiptUrl }),
  });
}

// ─── Settings & Banner ──────────────────────────────────────

export interface AppSettings {
  deliveryFee: number;
  banner: {
    enabled: boolean;
    title: string;
    description: string;
    buttonText: string;
    linkUrl: string;
    startDate: string;
    endDate: string;
    targetCategory: string;
  };
  storeName?: string;
  contactPhone?: string;
  contactEmail?: string;
  telegramHandle?: string;
  instagramHandle?: string;
  heroImage?: string;
  heroImage2?: string;
  heroImage3?: string;
  mobileHeroImage?: string;
  mobileHeroImage2?: string;
  mobileHeroImage3?: string;
}

export async function getSettings(): Promise<AppSettings> {
  return request<AppSettings>('/settings');
}

export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  return request<AppSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Telegram Pipeline ──────────────────────────────────────

export interface TelegramSource {
  id: string;
  channelUsername: string;
  title: string;
  isActive: boolean;
  lastScrapedAt?: string;
}

export interface TelegramDraft {
  id: string;
  sourceId: string;
  channel: string;
  messageId: number;
  rawCaption: string;
  images: string[];
  parsed: Record<string, any>;
  status: 'draft' | 'imported' | 'archived';
  createdAt: string;
}

export async function getTelegramSources(): Promise<TelegramSource[]> {
  return request<TelegramSource[]>('/telegram/sources');
}

export async function createTelegramSource(channelUsername: string, title?: string): Promise<TelegramSource> {
  return request<TelegramSource>('/telegram/sources', {
    method: 'POST',
    body: JSON.stringify({ channelUsername, title }),
  });
}

export async function deleteTelegramSource(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/telegram/sources/${id}`, {
    method: 'DELETE',
  });
}

export async function getTelegramDrafts(): Promise<TelegramDraft[]> {
  return request<TelegramDraft[]>('/telegram/drafts');
}

export async function createTelegramDraft(data: {
  channel: string;
  rawCaption: string;
  images: string[];
  parsed?: Record<string, any>;
}): Promise<TelegramDraft> {
  return request<TelegramDraft>('/telegram/drafts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface TelegramScrapeResult {
  success: boolean;
  count: number;
  draft: TelegramDraft | null;
  message: string;
}

export async function triggerTelegramScrape(channelUsername?: string): Promise<TelegramScrapeResult> {
  const payload = typeof channelUsername === 'string' && channelUsername.trim() ? { channelUsername: channelUsername.trim() } : {};
  return request<TelegramScrapeResult>('/telegram/scrape', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTelegramDraft(id: string, parsed: Record<string, any>, images?: string[]): Promise<TelegramDraft> {
  return request<TelegramDraft>(`/telegram/drafts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ parsed, images }),
  });
}

export async function deleteTelegramDraft(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/telegram/drafts/${id}`, {
    method: 'DELETE',
  });
}

export async function clearAllTelegramDrafts(): Promise<{ message: string }> {
  return request<{ message: string }>('/telegram/drafts', {
    method: 'DELETE',
  });
}

export async function importTelegramDraft(id: string, primaryIndex: number = 0): Promise<{ product: Product; draft: TelegramDraft }> {
  return request<{ product: Product; draft: TelegramDraft }>(`/telegram/drafts/${id}/import`, {
    method: 'POST',
    body: JSON.stringify({ primaryIndex }),
  });
}

// ─── Users (Admin) ──────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function updateUserRole(id: string, role: 'customer' | 'admin' | 'moderator' | 'superadmin'): Promise<User> {
  return request<User>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function resetUserPassword(id: string): Promise<void> {
  return request(`/users/${id}/reset-password`, {
    method: 'PATCH',
  });
}

// ─── Auth ───────────────────────────────────────────────────

export async function login(usernameOrEmail: string, password: string): Promise<{ user: User; token: string }> {
  const result = await request<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: usernameOrEmail, password }),
  });
  localStorage.setItem('token', result.token);
  return result;
}

export async function register(data: { fullName: string; username: string; password: string }): Promise<{ user: User; token: string }> {
  const result = await request<{ user: User; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  localStorage.setItem('token', result.token);
  return result;
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('token');
  }
}

export async function updateProfile(data: { firstName: string; lastName: string; username?: string }): Promise<User> {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updatePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  return request('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Search ─────────────────────────────────────────────────

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const res = await request<PaginatedResponse<Product>>(`/products?search=${encodeURIComponent(query)}&pageSize=8`);
  return res.data;
}

// ─── Reviews ────────────────────────────────────────────────

export async function getProductReviews(productId: string): Promise<Review[]> {
  // Return sample reviews or fetch
  return [
    {
      id: `rev-${productId}-1`,
      productId,
      user: { id: 'usr-1', firstName: 'Abebe', lastName: 'K.' },
      rating: 5,
      title: 'Remarkable quality in Addis',
      comment: 'Arrived promptly within 24 hours. The material quality and fit match the description completely.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `rev-${productId}-2`,
      productId,
      user: { id: 'usr-2', firstName: 'Selam', lastName: 'T.' },
      rating: 5,
      title: 'Extremely comfortable',
      comment: 'True to size and very well constructed. Will definitely order from ShegAddis again.',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// ─── Admin Analytics ────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingDrafts: number;
  revenueChange: number;
  ordersChange: number;
  recentOrders?: Order[];
  categoryBreakdown?: Array<{ name: string; count: number }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/analytics');
}

export interface VisitorAnalytics {
  totalVisits: number;
  uniqueVisitors: number;
  activeSessions: number;
  topPages: Array<{ path: string; count: number }>;
  recentLogs: Array<{ id: string; sessionId: string; userId?: string | null; ipAddress?: string | null; userAgent?: string | null; path: string; createdAt: string }>;
}

export async function getVisitorAnalytics(): Promise<VisitorAnalytics> {
  return request<VisitorAnalytics>('/analytics/visitors');
}

export async function trackPageVisit(path: string): Promise<void> {
  // Silent fail, don't throw UI errors for analytics tracking
  try {
    await request('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  } catch (e) {
    // Ignore analytics tracking errors
    console.debug('Analytics tracking failed', e);
  }
}
