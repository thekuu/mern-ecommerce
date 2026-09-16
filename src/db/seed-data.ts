export interface SeedData {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    parentId?: string | null;
    productCount: number;
  }>;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    price: number;
    compareAtPrice?: number | null;
    currency: string;
    categoryId: string;
    tags: string[];
    rating: number;
    reviewCount: number;
    stock: number;
    sku: string;
    isNew: boolean;
    isFeatured: boolean;
    createdAt: string;
    updatedAt: string;
    images: Array<{ id: string; url: string; alt: string; isPrimary: boolean }>;
    variants: Array<{ id: string; size?: string; colorName?: string; colorHex?: string; sku: string; stock: number; priceDelta: number }>;
  }>;
  users: Array<{
    id: string;
    username: string;
    fullName: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: 'customer' | 'admin' | 'moderator';
  }>;
  settings: Record<string, any>;
  telegramSources: Array<{
    id: string;
    channelUsername: string;
    title: string;
    isActive: boolean;
    lastScrapedAt?: string;
  }>;
  telegramDrafts: Array<{
    id: string;
    sourceId: string;
    channel: string;
    messageId: number;
    rawCaption: string;
    images: string[];
    parsed: Record<string, any>;
    status: 'draft' | 'imported' | 'archived';
    createdAt: string;
  }>;
  orders: Array<any>;
}

// Initial Categories (Empty product counts for live store)
export const initialCategories: SeedData['categories'] = [
  {
    id: 'cat-clothes',
    name: 'Clothes',
    slug: 'clothes',
    description: 'Everyday heavy tees, linen overshirts, denim, and fine knitwear.',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop',
    productCount: 0,
  },
  {
    id: 'cat-shoes',
    name: 'Shoes',
    slug: 'shoes',
    description: 'Leather court sneakers, trail runners, desert boots, and canvas slip-ons.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&h=1200&fit=crop',
    productCount: 0,
  },
];

// Live store: zero dummy seed products
export const initialProducts: SeedData['products'] = [];

// Default system accounts (Admin credentials retained for administration)
export const initialUsers: SeedData['users'] = [
  {
    id: 'usr-1',
    username: 'superadmin',
    fullName: 'System Administrator',
    email: 'superadmin@shegaddis.com',
    passwordHash: '$2b$10$lwuaQiAkX6fgTlt4nEDx2e4OpwTnIPMsmjotl0yY.PyT/3nfXly8C', // SuperAdmin123!
    firstName: 'System',
    lastName: 'Administrator',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    role: 'superadmin',
  }
];

export const initialSettings = {
  deliveryFee: 150,
  banner: {
    enabled: true,
    title: 'New Arrivals — Addis Delivery Free Above 3,000 ETB',
    description: 'Premium footwear & handpicked apparel delivered to your doorstep across Addis Ababa.',
    buttonText: 'Explore Collection',
    linkUrl: '/products?sortBy=newest',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    targetCategory: '',
  },
  storeName: 'ShegAddis',
  contactPhone: '+251 911 234 567',
  contactEmail: 'contact@shegaddis.com',
  telegramHandle: '@ShegAddis',
  instagramHandle: '@shegaddis_et',
  heroImage: '',
  heroImage2: '',
  heroImage3: '',
};

// Live store: zero dummy telegram sources, drafts, or orders
export const initialTelegramSources: SeedData['telegramSources'] = [];

export const initialTelegramDrafts: SeedData['telegramDrafts'] = [];

export const initialOrders: Array<any> = [];
