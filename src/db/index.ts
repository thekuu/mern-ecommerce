import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, asc, ilike, or, and, sql, lt } from 'drizzle-orm';
import * as schema from './schema.js';
import { parseTelegramPostText } from '../lib/telegramParser.js';
import {
  initialCategories,
  initialProducts,
  initialUsers,
  initialSettings,
  initialTelegramSources,
  initialTelegramDrafts,
  initialOrders,
} from './seed-data.js';

// Local storage fallback paths
const TELEGRAM_SOURCES_FILE = path.join(process.cwd(), '.telegram_sources.json');
const SETTINGS_FILE = path.join(process.cwd(), '.app_settings.json');
const PRODUCTS_FILE = path.join(process.cwd(), '.products_data.json');
const CATEGORIES_FILE = path.join(process.cwd(), '.categories_data.json');
const DRAFTS_FILE = path.join(process.cwd(), '.telegram_drafts.json');

interface TelegramSourceRecord {
  id: string;
  channelUsername: string;
  title: string;
  isActive: boolean;
  lastScrapedAt?: string;
  lastScrapedMessageId?: number;
}

function loadPersistedTelegramSources(): Array<TelegramSourceRecord> {
  try {
    if (fs.existsSync(TELEGRAM_SOURCES_FILE)) {
      return JSON.parse(fs.readFileSync(TELEGRAM_SOURCES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Failed to load persisted Telegram sources:', e);
  }
  return [];
}

function savePersistedTelegramSources(sources: Array<TelegramSourceRecord>) {
  try {
    fs.writeFileSync(TELEGRAM_SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save Telegram sources to disk:', e);
  }
}

function loadPersistedSettings(defaultSettings: typeof initialSettings): typeof initialSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return { ...defaultSettings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) };
    }
  } catch (e) {
    console.warn('Failed to load persisted settings:', e);
  }
  return { ...defaultSettings };
}

function savePersistedSettings(settings: Record<string, any>) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save settings to disk:', e);
  }
}

function loadPersistedProducts(defaultProducts: typeof initialProducts): typeof initialProducts {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const missingDefaults = defaultProducts.filter((p) => !existingIds.has(p.id));
        return [...parsed, ...missingDefaults];
      }
    }
  } catch (e) {
    console.warn('Failed to load persisted products:', e);
  }
  return [...defaultProducts];
}

function savePersistedProducts(products: typeof initialProducts) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save products to disk:', e);
  }
}

function loadPersistedCategories(defaultCategories: typeof initialCategories): typeof initialCategories {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = parsed.map((cat: any) => {
          const def = defaultCategories.find((d) => d.id === cat.id || d.slug === cat.slug);
          if (def && (!cat.image || cat.image.includes('picsum.photos'))) {
            return { ...cat, image: def.image, description: cat.description || def.description };
          }
          return cat;
        });
        const existingIds = new Set(merged.map((c: any) => c.id));
        const missingDefaults = defaultCategories.filter((c) => !existingIds.has(c.id));
        return [...merged, ...missingDefaults];
      }
    }
  } catch (e) {
    console.warn('Failed to load persisted categories:', e);
  }
  return [...defaultCategories];
}

function savePersistedCategories(categories: typeof initialCategories) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save categories to disk:', e);
  }
}

function loadPersistedDrafts(): typeof initialTelegramDrafts {
  try {
    if (fs.existsSync(DRAFTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load persisted drafts:', e);
  }
  return [];
}

function savePersistedDrafts(drafts: typeof initialTelegramDrafts) {
  try {
    fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save drafts to disk:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// Neon Postgres Client Connection
// ─────────────────────────────────────────────────────────────
let neonDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let isNeonInitialized = false;

export function getDb() {
  if (neonDbInstance) return neonDbInstance;
  const databaseUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '').trim();
  if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
    try {
      const sqlClient = neon(databaseUrl);
      neonDbInstance = drizzle(sqlClient, { schema });
      console.log('✅ Connected to Neon Postgres database via serverless driver.');
      return neonDbInstance;
    } catch (e) {
      console.warn('Neon connection initialization failed:', e);
    }
  }
  return null;
}

// In-Memory mirror & cache for low-latency operations + offline fallback
interface InMemoryStore {
  categories: typeof initialCategories;
  products: typeof initialProducts;
  users: typeof initialUsers;
  userRoles: Array<{ id: string; userId: string; role: 'customer' | 'admin' | 'moderator' }>;
  profiles: Array<{ id: string; userId: string; phone?: string; subcity?: string; woreda?: string; street?: string; city: string; country: string }>;
  orders: typeof initialOrders;
  settings: Record<string, any>;
  telegramSources: typeof initialTelegramSources;
  telegramDrafts: typeof initialTelegramDrafts;
  reviews: Array<{ id: string; productId: string; user: { id: string; firstName: string; lastName: string; avatar?: string }; rating: number; title: string; comment: string; createdAt: string }>;
  wishlists: Array<{ id: string; userId: string; productId: string; createdAt: string }>;
  visitorLogs: Array<{ id: string; sessionId: string; userId?: string | null; ipAddress?: string | null; userAgent?: string | null; path: string; createdAt: string }>;
}

const memoryStore: InMemoryStore = {
  categories: loadPersistedCategories(initialCategories),
  products: loadPersistedProducts(initialProducts),
  users: [...initialUsers],
  userRoles: initialUsers.map((u) => ({
    id: `ur-${u.id}`,
    userId: u.id,
    role: u.role,
  })),
  profiles: initialUsers.map((u) => ({
    id: `prof-${u.id}`,
    userId: u.id,
    phone: u.id === 'usr-1' ? '+251 911 554 433' : '+251 911 223 344',
    subcity: 'Bole',
    woreda: 'Woreda 03',
    street: 'Near Edna Mall',
    city: 'Addis Ababa',
    country: 'ET',
  })),
  orders: [...initialOrders],
  settings: loadPersistedSettings(initialSettings),
  telegramSources: loadPersistedTelegramSources(),
  telegramDrafts: loadPersistedDrafts(),
  reviews: [],
  wishlists: [],
  visitorLogs: [],
};

// ─────────────────────────────────────────────────────────────
// Neon Postgres Database Sync & Auto-Seed
// ─────────────────────────────────────────────────────────────
export async function initNeonDatabase() {
  if (isNeonInitialized) return;
  const db = getDb();
  if (!db) return;

  try {
    // 1. Sync / Seed Categories in Neon
    const existingCats = await db.select().from(schema.categories);
    if (existingCats.length === 0) {
      console.log('🌱 Seeding initial categories into Neon Postgres...');
      for (const cat of memoryStore.categories) {
        await db.insert(schema.categories).values({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          image: cat.image,
          productCount: cat.productCount || 0,
        }).onConflictDoNothing();
      }
    } else {
      memoryStore.categories = existingCats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        image: c.image || '',
        productCount: c.productCount || 0,
      }));
    }

    // 2. Clean any legacy dummy seed items & Sync / Load Products in Neon
    const dummyProductIds = [
      'prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6', 'prod-7', 'prod-8',
      'prod-9', 'prod-10', 'prod-11', 'prod-12', 'prod-13', 'prod-14', 'prod-15', 'prod-16'
    ];
    for (const dId of dummyProductIds) {
      await db.delete(schema.productImages).where(eq(schema.productImages.productId, dId)).catch(() => {});
      await db.delete(schema.productVariants).where(eq(schema.productVariants.productId, dId)).catch(() => {});
      await db.delete(schema.products).where(eq(schema.products.id, dId)).catch(() => {});
    }
    for (const oId of ['ord-1', 'ord-2', 'ord-101']) {
      await db.delete(schema.orderItems).where(eq(schema.orderItems.orderId, oId)).catch(() => {});
      await db.delete(schema.orders).where(eq(schema.orders.id, oId)).catch(() => {});
    }

    // Load all real products with images & variants from Neon Postgres
    const allDbProds = await db.select().from(schema.products);
    const allDbImgs = await db.select().from(schema.productImages);
    const allDbVars = await db.select().from(schema.productVariants);

    memoryStore.products = allDbProds.map((p) => {
      const imgs = allDbImgs
        .filter((img) => img.productId === p.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((img) => ({
          id: img.id,
          url: img.url,
          alt: img.alt || p.name,
          isPrimary: img.isPrimary,
        }));

      const vars = allDbVars
        .filter((v) => v.productId === p.id)
        .map((v) => ({
          id: v.id,
          size: v.size || undefined,
          colorName: v.colorName || undefined,
          colorHex: v.colorHex || undefined,
          sku: v.sku || '',
          stock: v.stock,
          priceDelta: v.priceDelta,
        }));

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription || '',
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        currency: p.currency,
        categoryId: p.categoryId || 'cat-clothes',
        tags: (p.tags as string[]) || [],
        rating: p.rating,
        reviewCount: p.reviewCount,
        stock: p.stock,
        sku: p.sku,
        isNew: p.isNew,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
        images: imgs.length > 0 ? imgs : [
          { id: `img-${p.id}`, url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop', alt: p.name, isPrimary: true }
        ],
        variants: vars,
      };
    });

    // 3. Sync / Seed Settings in Neon
    const existingSettings = await db.select().from(schema.settings);
    if (existingSettings.length === 0) {
      console.log('🌱 Seeding store settings into Neon Postgres...');
      await db.insert(schema.settings).values({
        id: 'main-settings',
        key: 'general',
        value: memoryStore.settings,
      }).onConflictDoNothing();
    } else {
      const general = existingSettings.find((s) => s.key === 'general');
      if (general && general.value) {
        memoryStore.settings = { ...memoryStore.settings, ...(general.value as Record<string, any>) };
      }
    }

    // 4. Sync / Seed Telegram Sources in Neon
    const existingSources = await db.select().from(schema.telegramSources);
    if (existingSources.length === 0) {
      console.log('🌱 Seeding initial telegram sources into Neon Postgres...');
      for (const src of initialTelegramSources) {
        await db.insert(schema.telegramSources).values({
          id: src.id,
          channelUsername: src.channelUsername,
          title: src.title,
          isActive: src.isActive,
        }).onConflictDoNothing();
      }
      memoryStore.telegramSources = [...initialTelegramSources];
    } else {
      memoryStore.telegramSources = existingSources.map((s) => ({
        id: s.id,
        channelUsername: s.channelUsername,
        title: s.title,
        isActive: s.isActive,
        lastScrapedAt: s.lastScrapedAt ? s.lastScrapedAt.toISOString() : undefined,
      }));
    }

    // 5. Sync Telegram Drafts in Neon
    const existingDrafts = await db.select().from(schema.telegramDrafts);
    if (existingDrafts.length > 0) {
      memoryStore.telegramDrafts = existingDrafts.map((d) => ({
        id: d.id,
        sourceId: d.sourceId || 'src-1',
        channel: d.channel,
        messageId: d.messageId,
        rawCaption: d.rawCaption || '',
        images: (d.images as string[]) || [],
        parsed: (d.parsed as Record<string, any>) || {},
        status: (d.status as 'draft' | 'imported' | 'archived') || 'draft',
        createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
      }));
    }

    // 6. Sync Users in Neon
    const existingUsers = await db.select().from(schema.users);
    if (existingUsers.length === 0) {
      console.log('🌱 Seeding default users & roles into Neon Postgres...');
      for (const u of initialUsers) {
        await db.insert(schema.users).values({
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          avatar: u.avatar,
        }).onConflictDoNothing();

        await db.insert(schema.userRoles).values({
          id: `ur-${u.id}`,
          userId: u.id,
          role: u.role,
        }).onConflictDoNothing();

        await db.insert(schema.profiles).values({
          id: `prof-${u.id}`,
          userId: u.id,
          city: 'Addis Ababa',
          country: 'ET',
        }).onConflictDoNothing();
      }
    }

    // 7. Sync Orders from Neon
    const existingOrders = await db.select().from(schema.orders);
    const existingOrderItems = await db.select().from(schema.orderItems);
    if (existingOrders.length > 0) {
      memoryStore.orders = existingOrders.map((o) => {
        const items = existingOrderItems.filter((i) => i.orderId === o.id).map((i) => ({
          id: i.id,
          productId: i.productId || '',
          productName: i.productName,
          variantKey: i.variantKey,
          size: i.size || undefined,
          colorName: i.colorName || undefined,
          colorHex: i.colorHex || undefined,
          quantity: i.quantity,
          price: i.price,
          total: i.total,
          imageUrl: i.imageUrl || undefined,
        }));
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          userId: o.userId || null,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerPhone: o.customerPhone,
          subcity: o.subcity,
          woreda: o.woreda || '',
          street: o.street,
          city: o.city,
          subtotal: o.subtotal,
          tax: o.tax,
          shipping: o.shipping,
          total: o.total,
          status: o.status as any,
          paymentMethod: o.paymentMethod,
          paymentReceiptUrl: o.paymentReceiptUrl,
          notes: o.notes || '',
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
          items,
        };
      });
    }

    isNeonInitialized = true;
    console.log('🌟 Neon Postgres database synchronized and active!');
  } catch (err) {
    console.error('Error synchronizing with Neon database:', err);
  }
}

// Trigger initialization on startup
initNeonDatabase().catch((err) => console.warn('Neon background sync note:', err));

// Deduplication Helpers
function normalizeTextForDedup(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDuplicateProductItem(candidate: {
  name?: string;
  rawCaption?: string;
  price?: number;
  messageId?: number;
  channel?: string;
  images?: string[];
}): boolean {
  const normName = normalizeTextForDedup(candidate.name || '');
  const normCaption = normalizeTextForDedup(candidate.rawCaption || '');
  const candImages = candidate.images || [];

  for (const prod of memoryStore.products) {
    // Check 1: Telegram specific tag match (e.g. tg-channel-1234)
    if (candidate.messageId && candidate.channel) {
      const cleanChan = candidate.channel.replace(/^@/, '').toLowerCase().trim();
      const tgTag = `tg-${cleanChan}-${candidate.messageId}`;
      if (prod.tags && prod.tags.includes(tgTag)) return true;
    }

    // Check 2: Exact or highly similar product name
    const prodName = normalizeTextForDedup(prod.name);
    if (normName && prodName) {
      const isNameEqual = normName === prodName || (normName.length > 6 && (prodName.includes(normName) || normName.includes(prodName)));
      const deliveryFee = Number(memoryStore.settings.deliveryFee || 150);
      const isPriceMatch = candidate.price
        ? Math.abs(prod.price - candidate.price) <= deliveryFee * 2 || prod.price === candidate.price
        : true;
      if (isNameEqual && isPriceMatch) return true;
    }

    // Check 3: Real media image URL match
    if (candImages.length > 0 && prod.images && prod.images.length > 0) {
      const prodImgUrls = prod.images
        .map((img) => img.url)
        .filter((u) => u && !u.includes('unsplash.com/photo-1521572163474') && !u.includes('unsplash.com/photo-1441986300917'));
      const hasImgMatch = candImages.some((cu) => cu && !cu.includes('unsplash.com') && prodImgUrls.includes(cu));
      if (hasImgMatch) return true;
    }

    // Check 4: Caption match with product description
    if (normCaption && normCaption.length > 20 && prod.description) {
      const prodDesc = normalizeTextForDedup(prod.description);
      if (prodDesc.includes(normCaption) || normCaption.includes(prodDesc)) return true;
    }
  }
  return false;
}

function isDuplicateDraftItem(candidate: {
  id?: string;
  messageId?: number;
  channel?: string;
  name?: string;
  rawCaption?: string;
  images?: string[];
}): boolean {
  const normName = normalizeTextForDedup(candidate.name || '');
  const normCaption = normalizeTextForDedup(candidate.rawCaption || '');
  const candImages = candidate.images || [];

  for (const d of memoryStore.telegramDrafts) {
    if (candidate.id && d.id === candidate.id) continue;

    // Match by channel and message ID
    if (
      candidate.channel &&
      candidate.messageId &&
      d.channel.toLowerCase().replace(/^@/, '').trim() === candidate.channel.toLowerCase().replace(/^@/, '').trim() &&
      Number(d.messageId) === Number(candidate.messageId)
    ) {
      return true;
    }

    // Match by caption similarity
    if (normCaption && normCaption.length > 15) {
      const dCaption = normalizeTextForDedup(d.rawCaption);
      if (dCaption === normCaption || (dCaption.length > 20 && (dCaption.includes(normCaption) || normCaption.includes(dCaption)))) {
        return true;
      }
    }

    // Match by name and media
    if (normName && d.parsed?.name) {
      const dName = normalizeTextForDedup(d.parsed.name);
      if (dName === normName) {
        if (candImages.length > 0 && d.images?.some((u) => candImages.includes(u))) {
          return true;
        }
        if (d.channel.toLowerCase().replace(/^@/, '').trim() === (candidate.channel || '').toLowerCase().replace(/^@/, '').trim()) {
          return true;
        }
      }
    }

    // Match by real scraped image URL
    if (candImages.length > 0 && d.images && d.images.length > 0) {
      const dImgUrls = d.images.filter((u) => u && !u.includes('unsplash.com'));
      const hasImgMatch = candImages.some((cu) => cu && !cu.includes('unsplash.com') && dImgUrls.includes(cu));
      if (hasImgMatch) {
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Unified Neon Postgres Repository
// ─────────────────────────────────────────────────────────────
export const repository = {
  // ── Categories ───────────────────────────
  async getCategories() {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.categories);
        if (rows.length > 0) {
          memoryStore.categories = rows.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
            image: c.image || '',
            productCount: c.productCount || 0,
          }));
        }
      } catch (err) {
        console.warn('Neon getCategories query note:', err);
      }
    }
    return memoryStore.categories;
  },

  async getCategoryBySlug(slug: string) {
    const cats = await this.getCategories();
    return cats.find((c) => c.slug === slug || c.id === slug) || null;
  },

  async createCategory(data: { name: string; slug: string; description?: string; image?: string }) {
    const id = `cat-${Date.now().toString(36)}`;
    const newCat = {
      id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      image: data.image || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop',
      productCount: 0,
    };

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.categories).values({
          id: newCat.id,
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description,
          image: newCat.image,
          productCount: 0,
        });
      } catch (err) {
        console.error('Neon insert category error:', err);
      }
    }

    memoryStore.categories.push(newCat);
    savePersistedCategories(memoryStore.categories);
    return newCat;
  },

  async updateCategory(id: string, data: Partial<{ name: string; slug: string; description?: string; image?: string }>) {
    const idx = memoryStore.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    memoryStore.categories[idx] = { ...memoryStore.categories[idx], ...data };

    const db = getDb();
    if (db) {
      try {
        await db.update(schema.categories)
          .set({
            ...(data.name && { name: data.name }),
            ...(data.slug && { slug: data.slug }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.image !== undefined && { image: data.image }),
            updatedAt: new Date(),
          })
          .where(eq(schema.categories.id, id));
      } catch (err) {
        console.error('Neon update category error:', err);
      }
    }

    savePersistedCategories(memoryStore.categories);
    return memoryStore.categories[idx];
  },

  async deleteCategory(id: string) {
    const idx = memoryStore.categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    memoryStore.categories.splice(idx, 1);

    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.categories).where(eq(schema.categories.id, id));
      } catch (err) {
        console.error('Neon delete category error:', err);
      }
    }

    savePersistedCategories(memoryStore.categories);
    return true;
  },

  // ── Products ─────────────────────────────
  async getProducts(params?: {
    category?: string;
    search?: string;
    onSale?: boolean;
    size?: string;
    color?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'name';
    isNew?: boolean;
    isFeatured?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    // Refresh from Neon if available
    const db = getDb();
    if (db) {
      try {
        const allDbProds = await db.select().from(schema.products);
        if (allDbProds.length > 0) {
          const allDbImgs = await db.select().from(schema.productImages);
          const allDbVars = await db.select().from(schema.productVariants);

          memoryStore.products = allDbProds.map((p) => {
            const imgs = allDbImgs
              .filter((img) => img.productId === p.id)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((img) => ({
                id: img.id,
                url: img.url,
                alt: img.alt || p.name,
                isPrimary: img.isPrimary,
              }));

            const vars = allDbVars
              .filter((v) => v.productId === p.id)
              .map((v) => ({
                id: v.id,
                size: v.size || undefined,
                colorName: v.colorName || undefined,
                colorHex: v.colorHex || undefined,
                sku: v.sku || '',
                stock: v.stock,
                priceDelta: v.priceDelta,
              }));

            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description,
              shortDescription: p.shortDescription || '',
              price: p.price,
              compareAtPrice: p.compareAtPrice,
              currency: p.currency,
              categoryId: p.categoryId || 'cat-clothes',
              tags: (p.tags as string[]) || [],
              rating: p.rating,
              reviewCount: p.reviewCount,
              stock: p.stock,
              sku: p.sku,
              isNew: p.isNew,
              isFeatured: p.isFeatured,
              createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
              updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
              images: imgs.length > 0 ? imgs : [
                { id: `img-${p.id}`, url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop', alt: p.name, isPrimary: true }
              ],
              variants: vars,
            };
          });
        }
      } catch (err) {
        console.warn('Neon getProducts note:', err);
      }
    }

    let list = [...memoryStore.products];

    if (params?.category) {
      const cat = memoryStore.categories.find((c) => c.slug === params.category || c.id === params.category);
      if (cat) {
        list = list.filter((p) => p.categoryId === cat.id);
      }
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (params?.onSale) {
      list = list.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    }

    if (params?.isNew) {
      list = list.filter((p) => p.isNew);
    }

    if (params?.isFeatured) {
      list = list.filter((p) => p.isFeatured);
    }

    if (params?.size) {
      const sz = params.size;
      list = list.filter((p) => p.variants?.some((v) => v.size === sz));
    }

    if (params?.color) {
      const clr = params.color.toLowerCase();
      list = list.filter((p) => p.variants?.some((v) => v.colorName?.toLowerCase() === clr));
    }

    if (params?.minPrice !== undefined) {
      list = list.filter((p) => p.price >= params.minPrice!);
    }

    if (params?.maxPrice !== undefined) {
      list = list.filter((p) => p.price <= params.maxPrice!);
    }

    // Sort
    switch (params?.sortBy) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = list.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 12;
    const start = (page - 1) * pageSize;
    const paginated = list.slice(start, start + pageSize);

    const enriched = paginated.map((p) => ({
      ...p,
      category: memoryStore.categories.find((c) => c.id === p.categoryId) || {
        id: p.categoryId,
        name: 'General',
        slug: 'general',
        description: '',
        productCount: 0,
      },
      sizes: Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean))) as string[],
      colors: Array.from(
        new Map(
          p.variants
            .filter((v) => v.colorName && v.colorHex)
            .map((v) => [v.colorName, { name: v.colorName!, hex: v.colorHex! }])
        ).values()
      ),
    }));

    return {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async getProductBySlug(slug: string) {
    await this.getProducts(); // Ensure synced
    const product = memoryStore.products.find((p) => p.slug === slug || p.id === slug);
    if (!product) return null;
    const category = memoryStore.categories.find((c) => c.id === product.categoryId) || {
      id: product.categoryId,
      name: 'General',
      slug: 'general',
      description: '',
      productCount: 0,
    };
    return {
      ...product,
      category,
      sizes: Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[],
      colors: Array.from(
        new Map(
          product.variants
            .filter((v) => v.colorName && v.colorHex)
            .map((v) => [v.colorName, { name: v.colorName!, hex: v.colorHex! }])
        ).values()
      ),
    };
  },

  async createProduct(data: any) {
    const id = `prod-${Date.now().toString(36)}`;
    const baseSlug = (data.slug || data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `item-${Date.now().toString(36)}`;
    let slug = baseSlug;
    let counter = 1;
    while (memoryStore.products.some((p) => p.slug === slug)) {
      slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
      counter++;
      if (counter > 15) {
        slug = `${baseSlug}-${Date.now().toString(36)}`;
        break;
      }
    }
    const sku = data.sku || `HC-${Math.floor(10000 + Math.random() * 90000)}`;

    const newProd = {
      id,
      name: data.name,
      slug,
      description: data.description || '',
      shortDescription: data.shortDescription || data.description?.slice(0, 80) || '',
      price: Number(data.price),
      compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
      currency: 'ETB',
      categoryId: data.categoryId || memoryStore.categories[0]?.id || 'cat-clothes',
      tags: Array.isArray(data.tags) ? data.tags : [],
      rating: 5.0,
      reviewCount: 0,
      stock: Number(data.stock ?? 10),
      sku,
      isNew: data.isNew ?? true,
      isFeatured: data.isFeatured ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [
        { id: `img-${Date.now()}`, url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop', alt: data.name, isPrimary: true },
      ],
      variants: Array.isArray(data.variants) ? data.variants : [],
    };

    // Insert into Neon Postgres
    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.products).values({
          id: newProd.id,
          name: newProd.name,
          slug: newProd.slug,
          description: newProd.description,
          shortDescription: newProd.shortDescription,
          price: newProd.price,
          compareAtPrice: newProd.compareAtPrice,
          currency: newProd.currency,
          categoryId: newProd.categoryId,
          tags: newProd.tags,
          rating: newProd.rating,
          reviewCount: newProd.reviewCount,
          stock: newProd.stock,
          sku: newProd.sku,
          isNew: newProd.isNew,
          isFeatured: newProd.isFeatured,
        });

        for (let i = 0; i < newProd.images.length; i++) {
          const img = newProd.images[i];
          await db.insert(schema.productImages).values({
            id: img.id || `img-${newProd.id}-${i}`,
            productId: newProd.id,
            url: img.url,
            alt: img.alt || newProd.name,
            isPrimary: img.isPrimary ?? (i === 0),
            sortOrder: i,
          });
        }

        for (let i = 0; i < newProd.variants.length; i++) {
          const v = newProd.variants[i];
          await db.insert(schema.productVariants).values({
            id: v.id || `var-${newProd.id}-${i}`,
            productId: newProd.id,
            size: v.size || null,
            colorName: v.colorName || null,
            colorHex: v.colorHex || null,
            sku: v.sku || `${newProd.sku}-${i}`,
            stock: v.stock || 5,
            priceDelta: v.priceDelta || 0,
          });
        }
        console.log(`✅ Product '${newProd.name}' persisted directly to Neon Postgres`);
      } catch (err) {
        console.error('Neon insert product error:', err);
      }
    }

    memoryStore.products.unshift(newProd);
    const cat = memoryStore.categories.find((c) => c.id === newProd.categoryId);
    if (cat) cat.productCount += 1;
    savePersistedProducts(memoryStore.products);

    return this.getProductBySlug(newProd.slug);
  },

  async updateProduct(id: string, data: any) {
    const idx = memoryStore.products.findIndex((p) => p.id === id || p.slug === id);
    if (idx === -1) return null;

    const existing = memoryStore.products[idx];
    const updated = {
      ...existing,
      ...data,
      price: data.price !== undefined ? Number(data.price) : existing.price,
      compareAtPrice: data.compareAtPrice !== undefined ? (data.compareAtPrice ? Number(data.compareAtPrice) : null) : existing.compareAtPrice,
      stock: data.stock !== undefined ? Number(data.stock) : existing.stock,
      updatedAt: new Date().toISOString(),
    };

    const db = getDb();
    if (db) {
      try {
        await db.update(schema.products)
          .set({
            ...(data.name && { name: data.name }),
            ...(data.slug && { slug: data.slug }),
            ...(data.description && { description: data.description }),
            ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
            ...(data.price !== undefined && { price: Number(data.price) }),
            ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null }),
            ...(data.categoryId && { categoryId: data.categoryId }),
            ...(data.tags && { tags: data.tags }),
            ...(data.stock !== undefined && { stock: Number(data.stock) }),
            ...(data.isNew !== undefined && { isNew: Boolean(data.isNew) }),
            ...(data.isFeatured !== undefined && { isFeatured: Boolean(data.isFeatured) }),
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, existing.id));

        if (Array.isArray(data.images)) {
          await db.delete(schema.productImages).where(eq(schema.productImages.productId, existing.id));
          for (let i = 0; i < data.images.length; i++) {
            const img = data.images[i];
            await db.insert(schema.productImages).values({
              id: img.id || `img-${existing.id}-${i}-${Date.now()}`,
              productId: existing.id,
              url: img.url,
              alt: img.alt || updated.name,
              isPrimary: img.isPrimary ?? (i === 0),
              sortOrder: i,
            });
          }
        }

        if (Array.isArray(data.variants)) {
          await db.delete(schema.productVariants).where(eq(schema.productVariants.productId, existing.id));
          for (let i = 0; i < data.variants.length; i++) {
            const v = data.variants[i];
            await db.insert(schema.productVariants).values({
              id: v.id || `var-${existing.id}-${i}-${Date.now()}`,
              productId: existing.id,
              size: v.size || null,
              colorName: v.colorName || null,
              colorHex: v.colorHex || null,
              sku: v.sku || `${existing.sku}-${i}`,
              stock: v.stock || 5,
              priceDelta: v.priceDelta || 0,
            });
          }
        }
      } catch (err) {
        console.error('Neon update product error:', err);
      }
    }

    memoryStore.products[idx] = updated;
    savePersistedProducts(memoryStore.products);
    return this.getProductBySlug(updated.slug);
  },

  async deleteOldNewArrivalProducts(daysOld: number = 10) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    const toDelete = memoryStore.products.filter(p => 
      p.isNew && !p.isFeatured && new Date(p.createdAt).toISOString() < cutoff
    );
    let count = 0;
    for (const prod of toDelete) {
      await this.deleteProduct(prod.id);
      count++;
    }
    return count;
  },

  async deleteProduct(id: string) {
    const idx = memoryStore.products.findIndex((p) => p.id === id || p.slug === id || String(p.id) === String(id));
    if (idx === -1) return false;
    const prod = memoryStore.products[idx];

    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.products).where(eq(schema.products.id, prod.id));
      } catch (err) {
        console.error('Neon delete product error:', err);
      }
    }

    memoryStore.products.splice(idx, 1);
    const cat = memoryStore.categories.find((c) => c.id === prod.categoryId);
    if (cat && cat.productCount > 0) cat.productCount -= 1;
    savePersistedProducts(memoryStore.products);
    return true;
  },

  // ── Auth & Users ─────────────────────────
  async checkUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
    const cleanId = username.trim().toLowerCase();
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.users).where(
          or(
            eq(schema.users.email, cleanId),
            eq(schema.users.email, `${cleanId}@shegaddis.local`)
          )
        );
        if (rows.some(r => r.id !== excludeUserId)) {
          return true;
        }
      } catch (err) {
        console.warn('Neon checkUsernameTaken note:', err);
      }
    }
    const memUser = memoryStore.users.find(
      (u) => u.id !== excludeUserId && (
        u.username?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === `${cleanId}@shegaddis.local`
      )
    );
    return !!memUser;
  },

  async findUserByUsername(identifier: string) {
    const cleanId = identifier.trim().toLowerCase();
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.users).where(
          or(
            eq(schema.users.email, cleanId),
            eq(schema.users.email, `${cleanId}@shegaddis.local`),
            ilike(schema.users.firstName, cleanId),
            ilike(schema.users.lastName, cleanId)
          )
        );
        if (rows.length > 0) {
          const user = rows[0];
          const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
          const profs = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
          return {
            id: user.id,
            username: (user as any).username || user.email.split('@')[0] || cleanId,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            passwordHash: user.passwordHash || '',
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: (roles[0]?.role as any) || 'customer',
            profile: profs[0] ? {
              id: profs[0].id,
              userId: profs[0].userId,
              phone: profs[0].phone || undefined,
              subcity: profs[0].subcity || undefined,
              woreda: profs[0].woreda || undefined,
              street: profs[0].street || undefined,
              city: profs[0].city || 'Addis Ababa',
              country: profs[0].country || 'ET',
            } : undefined,
          };
        }
      } catch (err) {
        console.warn('Neon findUserByUsername note:', err);
      }
    }

    const user = memoryStore.users.find(
      (u) =>
        u.username?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === `${cleanId}@shegaddis.local` ||
        u.fullName?.toLowerCase() === cleanId
    );
    if (!user) return null;
    const roleRecord = memoryStore.userRoles.find((r) => r.userId === user.id);
    const profile = memoryStore.profiles.find((p) => p.userId === user.id);
    return {
      ...user,
      username: user.username || user.email.split('@')[0],
      fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
      role: roleRecord?.role || 'customer',
      profile,
    };
  },

  async findUserByEmail(email: string) {
    return this.findUserByUsername(email);
  },

  async findUserById(id: string) {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.users).where(eq(schema.users.id, id));
        if (rows.length > 0) {
          const user = rows[0];
          const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
          const profs = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
          return {
            id: user.id,
            username: (user as any).username || user.email.split('@')[0],
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            passwordHash: user.passwordHash || '',
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: (roles[0]?.role as any) || 'customer',
            profile: profs[0] ? {
              id: profs[0].id,
              userId: profs[0].userId,
              phone: profs[0].phone || undefined,
              subcity: profs[0].subcity || undefined,
              woreda: profs[0].woreda || undefined,
              street: profs[0].street || undefined,
              city: profs[0].city || 'Addis Ababa',
              country: profs[0].country || 'ET',
            } : undefined,
          };
        }
      } catch (err) {
        console.warn('Neon findUserById note:', err);
      }
    }

    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) return null;
    const roleRecord = memoryStore.userRoles.find((r) => r.userId === user.id);
    const profile = memoryStore.profiles.find((p) => p.userId === user.id);
    return {
      ...user,
      username: user.username || user.email.split('@')[0],
      fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
      role: roleRecord?.role || 'customer',
      profile,
    };
  },

  async createUser(data: {
    username: string;
    fullName: string;
    email?: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role?: 'customer' | 'admin' | 'moderator';
  }) {
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanFullName = data.fullName.trim();
    
    // Check if username already taken in memoryStore
    const existing = memoryStore.users.find(
      (u) => u.username?.toLowerCase() === cleanUsername
    );
    if (existing) {
      throw new Error(`Username '${data.username}' is already taken. Please choose another username.`);
    }

    const nameParts = cleanFullName.split(' ');
    const firstName = data.firstName || nameParts[0] || data.username;
    const lastName = data.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
    const email = (data.email || `${cleanUsername}@shegaddis.local`).toLowerCase();

    const id = `usr-${Date.now().toString(36)}`;
    const role = data.role || 'customer';
    const avatar = data.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanFullName || cleanUsername)}`;

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.users).values({
          id,
          email,
          passwordHash: data.passwordHash || '',
          firstName,
          lastName,
          avatar,
        });

        await db.insert(schema.userRoles).values({
          id: `ur-${id}`,
          userId: id,
          role,
        });

        await db.insert(schema.profiles).values({
          id: `prof-${id}`,
          userId: id,
          city: 'Addis Ababa',
          country: 'ET',
        });
      } catch (err) {
        console.error('Neon insert user error:', err);
      }
    }

    const newUser = {
      id,
      username: cleanUsername,
      fullName: cleanFullName,
      email,
      passwordHash: data.passwordHash || '',
      firstName,
      lastName,
      avatar,
      role,
    };
    memoryStore.users.push(newUser);
    memoryStore.userRoles.push({ id: `ur-${id}`, userId: id, role });
    memoryStore.profiles.push({ id: `prof-${id}`, userId: id, city: 'Addis Ababa', country: 'ET' });

    return newUser;
  },

  async getAllUsers() {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.users);
        const roles = await db.select().from(schema.userRoles);
        const profs = await db.select().from(schema.profiles);
        if (rows.length > 0) {
          return rows.map((u) => {
            const roleRecord = roles.find((r) => r.userId === u.id);
            const prof = profs.find((p) => p.userId === u.id);
            return {
              id: u.id,
              username: (u as any).username || u.email.split('@')[0],
              fullName: `${u.firstName} ${u.lastName}`.trim(),
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              avatar: u.avatar,
              role: roleRecord?.role || 'customer',
              createdAt: u.createdAt.toISOString(),
              profile: prof,
            };
          });
        }
      } catch (err) {
        console.warn('Neon getAllUsers note:', err);
      }
    }

    return memoryStore.users.map((u) => {
      const roleRecord = memoryStore.userRoles.find((r) => r.userId === u.id);
      const profile = memoryStore.profiles.find((p) => p.userId === u.id);
      return {
        id: u.id,
        username: u.username || u.email.split('@')[0],
        fullName: u.fullName || `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        avatar: u.avatar,
        role: roleRecord?.role || 'customer',
        createdAt: new Date().toISOString(),
        profile,
      };
    });
  },

  async updateUserProfile(userId: string, data: { firstName: string, lastName: string, email?: string }) {
    const db = getDb();
    if (db) {
      try {
        const updateData: any = { 
          firstName: data.firstName, 
          lastName: data.lastName, 
          updatedAt: new Date() 
        };
        if (data.email) {
          updateData.email = data.email;
        }
        await db.update(schema.users).set(updateData).where(eq(schema.users.id, userId));
      } catch (err) {
        console.error('Neon updateUserProfile error:', err);
        throw err;
      }
    }
    
    // Update memoryStore for fallback
    const memUser = memoryStore.users.find(u => u.id === userId);
    if (memUser) {
      memUser.firstName = data.firstName;
      memUser.lastName = data.lastName;
      if (data.email) memUser.email = data.email;
    }
    return this.findUserById(userId);
  },

  async updateUserPassword(userId: string, passwordHash: string) {
    const db = getDb();
    if (db) {
      try {
        await db.update(schema.users).set({ passwordHash, updatedAt: new Date() }).where(eq(schema.users.id, userId));
      } catch (err) {
        console.error('Neon updateUserPassword error:', err);
      }
    }
    
    // Update memoryStore for fallback
    const memUser = memoryStore.users.find(u => u.id === userId);
    if (memUser) {
      memUser.passwordHash = passwordHash;
    }
    return true;
  },

  async updateUserRole(userId: string, role: 'customer' | 'admin' | 'moderator' | 'superadmin') {
    const db = getDb();
    if (db) {
      try {
        await db.update(schema.userRoles)
          .set({ role })
          .where(eq(schema.userRoles.userId, userId));
      } catch (err) {
        console.error('Neon updateUserRole error:', err);
      }
    }

    const roleRecord = memoryStore.userRoles.find((r) => r.userId === userId);
    if (roleRecord) {
      roleRecord.role = role as any;
    } else {
      memoryStore.userRoles.push({ id: `ur-${userId}`, userId, role: role as any });
    }
    const user = memoryStore.users.find((u) => u.id === userId);
    if (user) user.role = role as any;
    return this.findUserById(userId);
  },

  // ── Orders ───────────────────────────────
  async getOrders(userId?: string) {
    const db = getDb();
    if (db) {
      try {
        const rows = userId
          ? await db.select().from(schema.orders).where(eq(schema.orders.userId, userId))
          : await db.select().from(schema.orders);
        const orderIds = rows.map((r) => r.id);
        const items = await db.select().from(schema.orderItems);

        if (rows.length > 0) {
          const mapped = rows.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            userId: o.userId || null,
            customerName: o.customerName,
            customerEmail: o.customerEmail,
            customerPhone: o.customerPhone,
            subcity: o.subcity,
            woreda: o.woreda || '',
            street: o.street,
            city: o.city,
            subtotal: o.subtotal,
            tax: o.tax,
            shipping: o.shipping,
            total: o.total,
            status: o.status as any,
            paymentMethod: o.paymentMethod,
            paymentReceiptUrl: o.paymentReceiptUrl,
            notes: o.notes || '',
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
            items: items.filter((i) => i.orderId === o.id).map((i) => ({
              id: i.id,
              productId: i.productId || '',
              productName: i.productName,
              variantKey: i.variantKey,
              size: i.size || undefined,
              colorName: i.colorName || undefined,
              colorHex: i.colorHex || undefined,
              quantity: i.quantity,
              price: i.price,
              total: i.total,
              imageUrl: i.imageUrl || undefined,
            })),
          }));
          return mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      } catch (err) {
        console.warn('Neon getOrders note:', err);
      }
    }
    const memOrders = userId 
      ? memoryStore.orders.filter((o) => o.userId === userId)
      : memoryStore.orders;
    return memOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getOrderById(id: string) {
    const orders = await this.getOrders();
    return orders.find((o) => o.id === id || o.orderNumber === id) || null;
  },

  async createOrder(data: {
    userId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    subcity: string;
    woreda?: string;
    street: string;
    items: Array<{
      productId: string;
      productName: string;
      variantKey: string;
      size?: string;
      colorName?: string;
      colorHex?: string;
      quantity: number;
      price: number;
      imageUrl?: string;
    }>;
    deliveryDate?: string;
    deliveryTimeSlot?: string;
    paymentMethod?: string;
    notes?: string;
  }) {
    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = 0;
    const deliveryFee = 0;
    const total = subtotal;

    const orderNumber = `HC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `ord-${Date.now().toString(36)}`;

    // Build comprehensive note with schedule if available
    let combinedNotes = data.notes || '';
    if (data.deliveryDate || data.deliveryTimeSlot) {
      const schedulePrefix = `[Delivery Scheduled: ${data.deliveryDate || 'Standard'}${data.deliveryTimeSlot ? ` (${data.deliveryTimeSlot})` : ''}]`;
      combinedNotes = combinedNotes ? `${schedulePrefix} ${combinedNotes}` : schedulePrefix;
    }

    const order = {
      id,
      orderNumber,
      userId: data.userId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      subcity: data.subcity,
      woreda: data.woreda || '',
      street: data.street,
      city: 'Addis Ababa',
      subtotal,
      tax,
      shipping: deliveryFee,
      total,
      status: 'pending',
      deliveryDate: data.deliveryDate || 'Flexible / Next Available',
      deliveryTimeSlot: data.deliveryTimeSlot || 'Flexible (9:00 AM – 7:00 PM)',
      paymentMethod: data.paymentMethod || 'pay_on_delivery',
      paymentReceiptUrl: null,
      notes: combinedNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: data.items.map((i, idx) => ({
        id: `oi-${id}-${idx}`,
        ...i,
        total: i.price * i.quantity,
      })),
    };

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.orders).values({
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          subcity: order.subcity,
          woreda: order.woreda,
          street: order.street,
          city: order.city,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          notes: order.notes,
        });

        for (const item of order.items) {
          await db.insert(schema.orderItems).values({
            id: item.id,
            orderId: order.id,
            productId: item.productId || null,
            productName: item.productName,
            variantKey: item.variantKey,
            size: item.size || null,
            colorName: item.colorName || null,
            colorHex: item.colorHex || null,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            imageUrl: item.imageUrl || null,
          });
        }
        console.log(`✅ Order '${order.orderNumber}' saved directly to Neon Postgres`);
      } catch (err) {
        console.error('Neon insert order error:', err);
      }
    }

    memoryStore.orders.unshift(order);
    return order;
  },

  async updateOrderStatus(orderId: string, status: string) {
    const order = memoryStore.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) return null;

    const validTransitions: Record<string, string[]> = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(`Invalid status transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`);
    }

    const db = getDb();
    if (db) {
      try {
        await db.update(schema.orders)
          .set({ status, updatedAt: new Date() })
          .where(or(eq(schema.orders.id, orderId), eq(schema.orders.orderNumber, orderId)));
      } catch (err) {
        console.error('Neon update order status error:', err);
      }
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    return order;
  },

  async attachReceipt(orderId: string, fileUrl: string) {
    const order = memoryStore.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) return null;

    const db = getDb();
    if (db) {
      try {
        await db.update(schema.orders)
          .set({ paymentReceiptUrl: fileUrl, updatedAt: new Date() })
          .where(or(eq(schema.orders.id, orderId), eq(schema.orders.orderNumber, orderId)));
      } catch (err) {
        console.error('Neon attach receipt error:', err);
      }
    }

    order.paymentReceiptUrl = fileUrl;
    order.updatedAt = new Date().toISOString();
    return order;
  },

  // ── Settings ─────────────────────────────
  async getSettings() {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, 'general'));
        if (rows.length > 0 && rows[0].value) {
          memoryStore.settings = { ...memoryStore.settings, ...(rows[0].value as Record<string, any>) };
        }
      } catch (err) {
        console.warn('Neon getSettings note:', err);
      }
    }
    return memoryStore.settings;
  },

  async updateSettings(data: Partial<typeof initialSettings>) {
    memoryStore.settings = {
      ...memoryStore.settings,
      ...data,
      banner: data.banner
        ? { ...memoryStore.settings.banner, ...data.banner }
        : memoryStore.settings.banner,
    };

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.settings).values({
          id: 'main-settings',
          key: 'general',
          value: memoryStore.settings,
        }).onConflictDoUpdate({
          target: schema.settings.key,
          set: {
            value: memoryStore.settings,
            updatedAt: new Date(),
          },
        });
      } catch (err) {
        console.error('Neon update settings error:', err);
      }
    }

    savePersistedSettings(memoryStore.settings);
    return memoryStore.settings;
  },

  // ── Telegram Ingestion ───────────────────
  async getTelegramSources() {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.telegramSources);
        if (rows.length > 0) {
          memoryStore.telegramSources = rows.map((s) => ({
            id: s.id,
            channelUsername: s.channelUsername,
            title: s.title,
            isActive: s.isActive,
            lastScrapedAt: s.lastScrapedAt ? s.lastScrapedAt.toISOString() : undefined,
          }));
        }
      } catch (err) {
        console.warn('Neon getTelegramSources note:', err);
      }
    }
    return memoryStore.telegramSources;
  },

  async createTelegramSource(channelUsername: string, title?: string) {
    const cleanUsername = channelUsername
      .replace(/^@/, '')
      .replace(/^https?:\/\/t\.me\/(s\/)?/, '')
      .replace(/\/$/, '')
      .trim();
    if (!cleanUsername) throw new Error('Invalid channel username');

    const existing = memoryStore.telegramSources.find(
      (s) => s.channelUsername.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existing) return existing;

    const id = `src-${Date.now().toString(36)}`;
    const newSource = {
      id,
      channelUsername: cleanUsername,
      title: title || `@${cleanUsername}`,
      isActive: true,
      lastScrapedAt: undefined,
    };

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.telegramSources).values({
          id: newSource.id,
          channelUsername: newSource.channelUsername,
          title: newSource.title,
          isActive: true,
        }).onConflictDoNothing();
      } catch (err) {
        console.error('Neon insert telegram source error:', err);
      }
    }

    memoryStore.telegramSources.push(newSource);
    savePersistedTelegramSources(memoryStore.telegramSources);
    return newSource;
  },

  async deleteTelegramSource(id: string) {
    const idx = memoryStore.telegramSources.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    const src = memoryStore.telegramSources[idx];

    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.telegramSources).where(eq(schema.telegramSources.id, src.id));
      } catch (err) {
        console.error('Neon delete telegram source error:', err);
      }
    }

    memoryStore.telegramSources.splice(idx, 1);
    savePersistedTelegramSources(memoryStore.telegramSources);
    return true;
  },

  async getTelegramDrafts() {
    const db = getDb();
    if (db) {
      try {
        const rows = await db.select().from(schema.telegramDrafts);
        if (rows.length > 0) {
          memoryStore.telegramDrafts = rows
            .filter((d) => d.status !== 'archived')
            .map((d) => ({
              id: d.id,
              sourceId: d.sourceId || 'src-1',
              channel: d.channel,
              messageId: d.messageId,
              rawCaption: d.rawCaption || '',
              images: (d.images as string[]) || [],
              parsed: (d.parsed as Record<string, any>) || {},
              status: (d.status as 'draft' | 'imported' | 'archived') || 'draft',
              createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
            }));
        }
      } catch (err) {
        console.warn('Neon getTelegramDrafts note:', err);
      }
    }
    return memoryStore.telegramDrafts.filter((d) => d.status === 'draft' || d.status === 'pending');
  },

  async updateTelegramDraft(id: string, parsed: Record<string, any>, images?: string[]) {
    const draft = memoryStore.telegramDrafts.find((d) => d.id === id);
    if (!draft) return null;
    draft.parsed = { ...draft.parsed, ...parsed };
    if (images) draft.images = images;

    const db = getDb();
    if (db) {
      try {
        await db.update(schema.telegramDrafts)
          .set({
            parsed: draft.parsed,
            images: draft.images,
            updatedAt: new Date(),
          })
          .where(eq(schema.telegramDrafts.id, id));
      } catch (err) {
        console.error('Neon update telegram draft error:', err);
      }
    }

    savePersistedDrafts(memoryStore.telegramDrafts);
    return draft;
  },

  async createTelegramDraft(data: {
    channel: string;
    rawCaption: string;
    images: string[];
    parsed?: Record<string, any>;
    messageId?: number;
    sourceId?: string;
  }) {
    const cleanChannel = data.channel.replace(/^@/, '').trim();
    const source = memoryStore.telegramSources.find((s) => s.channelUsername.toLowerCase() === cleanChannel.toLowerCase()) || memoryStore.telegramSources[0];
    const messageId = data.messageId || Math.floor(1000 + Math.random() * 9000);
    const parsed = data.parsed || parseTelegramPostText(data.rawCaption, cleanChannel);
    const finalImages = data.images && data.images.length > 0 ? data.images : [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop'
    ];

    // Check if duplicate product already exists in store
    const isProdDup = isDuplicateProductItem({
      channel: `@${cleanChannel}`,
      messageId,
      name: parsed.name,
      rawCaption: data.rawCaption,
      price: parsed.price,
      images: finalImages,
    });
    if (isProdDup) {
      console.log(`Skipping draft creation for '${parsed.name || messageId}' because an identical product already exists.`);
      return null;
    }

    const existingDraft = memoryStore.telegramDrafts.find((d) => {
      const isSameChannel = d.channel.toLowerCase().replace(/^@/, '') === cleanChannel.toLowerCase();
      const isSameMsgId = Number(d.messageId) === Number(messageId);
      const isSameCaption = normalizeTextForDedup(d.rawCaption) === normalizeTextForDedup(data.rawCaption);
      const isSameName = d.parsed?.name && parsed?.name && normalizeTextForDedup(d.parsed.name) === normalizeTextForDedup(parsed.name);
      return isSameChannel && (isSameMsgId || isSameCaption || (isSameName && d.images?.some((u) => finalImages.includes(u))));
    });

    if (existingDraft) {
      existingDraft.rawCaption = data.rawCaption;
      existingDraft.parsed = { ...existingDraft.parsed, ...parsed };
      if (finalImages.length > 0) existingDraft.images = finalImages;

      const db = getDb();
      if (db) {
        try {
          await db.update(schema.telegramDrafts)
            .set({
              rawCaption: existingDraft.rawCaption,
              parsed: existingDraft.parsed,
              images: existingDraft.images,
              updatedAt: new Date(),
            })
            .where(eq(schema.telegramDrafts.id, existingDraft.id));
        } catch (err) {
          console.error('Neon update draft error:', err);
        }
      }

      savePersistedDrafts(memoryStore.telegramDrafts);
      return { draft: existingDraft, isNew: false };
    }

    const newDraft = {
      id: `draft-${Date.now().toString(36)}-${messageId}`,
      sourceId: source?.id || data.sourceId || 'src-1',
      channel: `@${cleanChannel}`,
      messageId,
      rawCaption: data.rawCaption,
      images: finalImages,
      parsed,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    if (db) {
      try {
        await db.insert(schema.telegramDrafts).values({
          id: newDraft.id,
          sourceId: newDraft.sourceId,
          channel: newDraft.channel,
          messageId: newDraft.messageId,
          rawCaption: newDraft.rawCaption,
          images: newDraft.images,
          parsed: newDraft.parsed,
          status: 'draft',
        });
        console.log(`✅ Draft '${parsed.name || messageId}' saved directly to Neon Postgres`);
      } catch (err) {
        console.error('Neon insert draft error:', err);
      }
    }

    memoryStore.telegramDrafts.unshift(newDraft);
    savePersistedDrafts(memoryStore.telegramDrafts);
    return { draft: newDraft, isNew: true };
  },

  async deleteTelegramDraft(id: string) {
    const cleanId = String(id).trim();
    const idx = memoryStore.telegramDrafts.findIndex((d) => String(d.id).trim() === cleanId);
    if (idx !== -1) {
      memoryStore.telegramDrafts.splice(idx, 1);
    }

    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.telegramDrafts).where(eq(schema.telegramDrafts.id, cleanId));
      } catch (err) {
        console.error('Neon delete draft error:', err);
      }
    }

    savePersistedDrafts(memoryStore.telegramDrafts);
    return true;
  },

  async clearAllTelegramDrafts() {
    memoryStore.telegramDrafts = [];
    for (const source of memoryStore.telegramSources) {
      source.lastScrapedMessageId = 0;
    }

    const db = getDb();
    if (db) {
      try {
        await db.delete(schema.telegramDrafts);
      } catch (err) {
        console.error('Neon clear drafts error:', err);
      }
    }

    savePersistedTelegramSources(memoryStore.telegramSources);
    savePersistedDrafts(memoryStore.telegramDrafts);
    return true;
  },

  async importDraftAsProduct(draftId: string, primaryIndex: number = 0) {
    const draft = memoryStore.telegramDrafts.find((d) => d.id === draftId);
    if (!draft) throw new Error('Draft not found');

    const p = draft.parsed || {};
    const cleanChan = (draft.channel || '').replace(/^@/, '').toLowerCase();
    const tgTag = `tg-${cleanChan}-${draft.messageId}`;
    const deliveryFee = Number(memoryStore.settings.deliveryFee || 150);
    const rawPrice = Number(p.price || 2000);
    const finalPrice = rawPrice + deliveryFee;

    let detectedCatName = p.category;
    if (!detectedCatName && draft.rawCaption) {
      const fallbackParsed = parseTelegramPostText(draft.rawCaption, cleanChan);
      detectedCatName = fallbackParsed.category;
    }

    const normalizedCat = (detectedCatName || '').toLowerCase().trim();
    const isShoeCategory = normalizedCat === 'shoes' || normalizedCat === 'shoe' || normalizedCat === 'cat-shoes';

    const matchedCategory =
      memoryStore.categories.find((c) => {
        const cName = c.name.toLowerCase();
        const cSlug = c.slug.toLowerCase();
        if (isShoeCategory) {
          return cSlug === 'shoes' || cName === 'shoes' || c.id === 'cat-shoes';
        } else {
          return cSlug === 'clothes' || cName === 'clothes' || c.id === 'cat-clothes';
        }
      }) ||
      memoryStore.categories.find((c) => c.name.toLowerCase() === normalizedCat || c.slug.toLowerCase() === normalizedCat) ||
      memoryStore.categories[0];

    const rawImages = draft.images && draft.images.length > 0 ? draft.images : [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
    ];

    const validPrimary = Math.max(0, Math.min(primaryIndex, rawImages.length - 1));
    const reorderedImages = [
      rawImages[validPrimary],
      ...rawImages.filter((_, idx) => idx !== validPrimary),
    ];

    const existingProdIdx = memoryStore.products.findIndex((prod) => {
      if (prod.tags && prod.tags.includes(tgTag)) return true;
      const isNameMatch = normalizeTextForDedup(prod.name) === normalizeTextForDedup(p.name || '');
      const isImageMatch = prod.images?.some((im) => reorderedImages.includes(im.url) && !im.url.includes('unsplash.com'));
      return isNameMatch && (isImageMatch || Math.abs(prod.price - finalPrice) <= deliveryFee);
    });

    let targetProduct: any;
    if (existingProdIdx !== -1) {
      const existing = memoryStore.products[existingProdIdx];
      existing.price = finalPrice;
      if (p.compareAtPrice !== undefined) existing.compareAtPrice = p.compareAtPrice ? Number(p.compareAtPrice) : null;
      if (p.description) existing.description = p.description;
      if (p.shortDescription) existing.shortDescription = p.shortDescription;
      if (!existing.tags.includes(tgTag)) existing.tags.push(tgTag);
      if (!existing.tags.includes('telegram-import')) existing.tags.push('telegram-import');
      existing.updatedAt = new Date().toISOString();
      await this.updateProduct(existing.id, existing);
      targetProduct = await this.getProductBySlug(existing.slug);
    } else {
      targetProduct = await this.createProduct({
        name: p.name || 'Imported Product',
        slug: p.slug,
        price: finalPrice,
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        description: p.description || '',
        shortDescription: p.shortDescription || '',
        categoryId: matchedCategory.id,
        tags: Array.from(new Set([...(p.tags || []), 'telegram-import', tgTag])),
        stock: p.stock || 15,
        isNew: p.isNew ?? true,
        isFeatured: p.isFeatured ?? false,
        images: reorderedImages.map((url: string, i: number) => ({
          id: `img-${Date.now()}-${i}`,
          url,
          alt: p.name || 'Product Image',
          isPrimary: i === 0,
        })),
        variants: (p.sizes && p.sizes.length > 0 ? p.sizes : ['Standard']).map((size: string, i: number) => ({
          id: `var-${Date.now()}-${size.replace(/[^a-zA-Z0-9]/g, '')}-${i}`,
          size,
          colorName: undefined,
          colorHex: undefined,
          sku: `HC-${size.replace(/[^a-zA-Z0-9]/g, '')}`,
          stock: 5,
          priceDelta: 0,
        })),
      });
    }

    draft.status = 'imported';
    const db = getDb();
    if (db) {
      try {
        await db.update(schema.telegramDrafts)
          .set({ status: 'imported', importedProductId: targetProduct?.id || null, updatedAt: new Date() })
          .where(eq(schema.telegramDrafts.id, draft.id));
      } catch (err) {
        console.error('Neon update draft status error:', err);
      }
    }

    savePersistedDrafts(memoryStore.telegramDrafts);
    return { product: targetProduct, draft };
  },

  async triggerTelegramScrape(channelUsername?: string) {
    const channelsToScrape = channelUsername
      ? [channelUsername]
      : memoryStore.telegramSources.map((s) => s.channelUsername);

    if (channelsToScrape.length === 0) {
      return {
        success: false,
        count: 0,
        draft: null,
        message: 'No Telegram channels configured. Please add your Telegram channel above first.',
      };
    }

    let totalNewDrafts = 0;
    const errors: string[] = [];
    const currentRunExtracted: any[] = [];

    const maxPerChannel = Math.ceil(20 / channelsToScrape.length);

    for (let cIdx = 0; cIdx < channelsToScrape.length; cIdx++) {
      if (totalNewDrafts >= 20) break;
      
      const currentChannelQuota = maxPerChannel;
      
      const rawTarget = channelsToScrape[cIdx];
      const targetChannel = rawTarget
        .replace(/^@/, '')
        .replace(/^https?:\/\/t\.me\/(s\/)?/, '')
        .replace(/\/$/, '')
        .trim();

      const source = memoryStore.telegramSources.find(
        (s) => s.channelUsername.toLowerCase() === targetChannel.toLowerCase()
      );
      if (source) {
        source.lastScrapedAt = new Date().toISOString();
        savePersistedTelegramSources(memoryStore.telegramSources);
      }

      try {
        const extractedDraftsForChannel: any[] = [];
        const seenMessageIds = new Set<number>();

        let nextBeforeUrl: string | null = `https://t.me/s/${targetChannel}`;
        let pageAttempts = 0;
        let highestSeenMessageId = source?.lastScrapedMessageId || 0;

        while (nextBeforeUrl && extractedDraftsForChannel.length < currentChannelQuota && pageAttempts < 25) {
          pageAttempts++;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 9000);

          let res: any;
          try {
            res = await fetch(nextBeforeUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
              signal: controller.signal,
            });
          } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            errors.push(`@${targetChannel}: Connection timeout (${fetchErr.message})`);
            break;
          }
          clearTimeout(timeoutId);

          if (!res.ok) {
            errors.push(`@${targetChannel}: HTTP ${res.status}`);
            break;
          }

          const html = await res.text();

          if (html.includes('tgme_page_title') && (html.includes('If you have <strong>Telegram</strong>') || html.includes('Channel not found'))) {
            if (!html.includes('tgme_widget_message')) {
              errors.push(`@${targetChannel}: Channel is private or has no public preview posts on t.me/s/${targetChannel}`);
              break;
            }
          }

          const rawSplits = html.split(/<div[^>]*class="[^"]*tgme_widget_message_wrap[^"]*"[^>]*>/i);
          const candidateBlocks = rawSplits.length > 1 
            ? rawSplits.slice(1) 
            : html.split(/(?=<div[^>]*class="[^"]*tgme_widget_message(?:\s|")[^>]*>)/i).filter((b) => b.includes('data-post='));

          const messageBlocks = candidateBlocks.filter((b) => b.includes('data-post=') || b.includes('tgme_widget_message_text'));

          if (messageBlocks.length === 0) {
            errors.push(`@${targetChannel}: No public posts found at t.me/s/${targetChannel}`);
            break;
          }

          const beforeMatch = html.match(/href="([^"]*\?before=[0-9]+)"/i);
          if (beforeMatch && beforeMatch[1]) {
            const rel = beforeMatch[1];
            nextBeforeUrl = rel.startsWith('http')
              ? rel
              : rel.startsWith('/')
              ? `https://t.me${rel}`
              : `https://t.me/s/${targetChannel}${rel}`;
          } else {
            nextBeforeUrl = null;
          }

          const avatarUrlSet = new Set<string>();
          const allUserPhotoMatches = [...html.matchAll(/class="[^"]*(?:userphoto|tgme_page_photo|tgme_page_icon|tgme_page_extra)[^"]*"[^>]*background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)];
          allUserPhotoMatches.forEach((m) => avatarUrlSet.add(m[1]));
          const allUserPhotoImgs = [...html.matchAll(/class="[^"]*(?:userphoto|tgme_page_photo|tgme_page_icon|tgme_page_extra)[^"]*"[^>]*src=['"]([^'"]+)['"]/gi)];
          allUserPhotoImgs.forEach((m) => avatarUrlSet.add(m[1]));

          for (let i = messageBlocks.length - 1; i >= 0; i--) {
            if (extractedDraftsForChannel.length >= currentChannelQuota) break;

            const block = messageBlocks[i];
            const msgIdMatch = block.match(/data-post="[^/]+\/([0-9]+)"/i);
            if (!msgIdMatch) continue;
            const messageId = parseInt(msgIdMatch[1], 10);
            if (!messageId || seenMessageIds.has(messageId)) continue;
            seenMessageIds.add(messageId);

            if (messageId > highestSeenMessageId) {
              highestSeenMessageId = messageId;
            }

            const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i);
            let rawCaption = '';
            if (textMatch && textMatch[1]) {
              rawCaption = textMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#33;/g, '!')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .trim();
            }

            const productMediaMatches = [
              ...block.matchAll(/(?:tgme_widget_message_photo_wrap|tgme_widget_message_photo_thumb|tgme_widget_message_photo|tgme_widget_message_grouped_layer)[^>]*background-image:\s*url\(['"]?([^'")]+)['"]?\)/gi)
            ].map((m) => m[1]);

            const videoPosterMatches = [...block.matchAll(/<video[^>]+poster=['"]([^'"]+)['"]/gi)].map((m) => m[1]);
            const rawMediaCandidates = [...productMediaMatches, ...videoPosterMatches];

            const isMediaUrlValid = (url: string) => {
              if (!url || !url.startsWith('http')) return false;
              const lower = url.toLowerCase();
              if (lower.includes('/emoji/') || lower.includes('t_logo') || lower.includes('data:image')) return false;
              if (lower.includes('tgme_page_photo') || lower.includes('userphoto') || lower.includes('avatar')) return false;
              if (avatarUrlSet.has(url)) return false;
              return true;
            };

            const combinedImages = Array.from(new Set(rawMediaCandidates.filter(isMediaUrlValid)));

            const channelTag = `@${targetChannel}`.toLowerCase();
            const rawDraftDuplicate = memoryStore.telegramDrafts.some(
              (d) => d.channel.toLowerCase() === channelTag && d.messageId === messageId
            );
            if (rawDraftDuplicate) continue;

            if (rawCaption.length > 5 || combinedImages.length > 0) {
              const effectiveCaption = rawCaption.length > 5 ? rawCaption : `Item #${messageId} from @${targetChannel}`;
              const parsed = parseTelegramPostText(effectiveCaption, targetChannel);
              const finalImages = combinedImages.length > 0 ? combinedImages : [];

              const isDuplicateDraft = isDuplicateDraftItem({
                channel: `@${targetChannel}`,
                messageId,
                name: parsed.name,
                rawCaption: effectiveCaption,
                images: finalImages,
              });
              if (isDuplicateDraft) continue;

              const isDuplicateProd = isDuplicateProductItem({
                channel: `@${targetChannel}`,
                messageId,
                name: parsed.name,
                rawCaption: effectiveCaption,
                price: parsed.price,
                images: finalImages,
              });
              if (isDuplicateProd) continue;

              // Ensure we don't import duplicates within this same batch
              const isDuplicateInCurrentRun = currentRunExtracted.some(d => 
                (d.name && d.name === parsed.name) || 
                (finalImages.length > 0 && d.images.some((img: string) => finalImages.includes(img) && !img.includes('unsplash.com')))
              );
              if (isDuplicateInCurrentRun) continue;

              currentRunExtracted.push({ name: parsed.name, images: finalImages });

              extractedDraftsForChannel.push({
                channel: `@${targetChannel}`,
                messageId,
                rawCaption: effectiveCaption,
                images: finalImages.length > 0 ? finalImages : [
                  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop'
                ],
                parsed,
              });
            }
          }
        }

        if (source && highestSeenMessageId > 0) {
          source.lastScrapedMessageId = highestSeenMessageId;
          savePersistedTelegramSources(memoryStore.telegramSources);
        }

        for (const draftData of extractedDraftsForChannel) {
          const created = await this.createTelegramDraft(draftData);
          if (created && created.isNew) {
            totalNewDrafts++;
          }
        }
      } catch (err: any) {
        errors.push(`@${targetChannel}: ${err.message}`);
      }
    }

    if (totalNewDrafts > 0) {
      return {
        success: true,
        count: totalNewDrafts,
        draft: memoryStore.telegramDrafts[0] || null,
        message: `Successfully fetched ${totalNewDrafts} new post(s) into your draft queue (up to 20 total limit).`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        count: 0,
        draft: null,
        message: `Telegram crawler restriction for ${errors.join(', ')}. Use "Paste Post" for direct entry.`,
      };
    }

    return {
      success: true,
      count: 0,
      draft: null,
      message: 'Scanned all channel posts — all posts are already in your queue or product catalog (no duplicates imported).',
    };
  },

  // ── Analytics ────────────────────────────
  async getAnalytics() {
    await this.getOrders();
    const totalRevenue = memoryStore.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);

    const totalOrders = memoryStore.orders.length;
    const totalCustomers = memoryStore.users.filter((u) => u.role === 'customer').length;
    const totalProducts = memoryStore.products.length;
    const pendingDrafts = memoryStore.telegramDrafts.filter((d) => d.status === 'draft').length;

    const recentOrders = [...memoryStore.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    const categoryBreakdown = memoryStore.categories.map((c) => ({
      name: c.name,
      count: memoryStore.products.filter((p) => p.categoryId === c.id).length,
    }));

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      pendingDrafts,
      recentOrders,
      categoryBreakdown,
      revenueChange: 14.8,
      ordersChange: 9.2,
    };
  },

  // ── Visitor Analytics ───────────────────────────────────────
  async logVisit(data: { sessionId: string; userId?: string | null; ipAddress?: string | null; userAgent?: string | null; path: string }) {
    // Ignore common bots to save space and keep stats accurate
    if (data.userAgent && /bot|crawler|spider|crawling|googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider/i.test(data.userAgent)) {
      return;
    }

    const db = getDb();
    
    if (db) {
      // Auto-clear logs older than 7 days randomly on some requests to keep DB small
      if (Math.random() < 0.05) {
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          await db.delete(schema.visitorLogs).where(lt(schema.visitorLogs.createdAt, sevenDaysAgo));
        } catch (e) {
          console.error('Failed to prune visitor logs', e);
        }
      }

      await db.insert(schema.visitorLogs).values({
        id: `vlog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        sessionId: data.sessionId,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        path: data.path,
      });
    } else {
      memoryStore.visitorLogs.push({
        id: `vlog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        sessionId: data.sessionId,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        path: data.path,
        createdAt: new Date().toISOString(),
      });
      // Prune memory store to last 2000
      if (memoryStore.visitorLogs.length > 2000) {
        memoryStore.visitorLogs = memoryStore.visitorLogs.slice(-2000);
      }
    }
  },

  async getVisitorAnalytics() {
    let logs: any[] = [];
    const db = getDb();
    if (db) {
      logs = await db.select().from(schema.visitorLogs).orderBy(desc(schema.visitorLogs.createdAt));
    } else {
      logs = [...memoryStore.visitorLogs].reverse();
    }

    const now = new Date();
    const activeSessionsSet = new Set();
    const uniqueVisitorsSet = new Set();
    
    // Path counts
    const pathCounts: Record<string, number> = {};

    logs.forEach(log => {
      // Use IP address combined with session ID if available, otherwise just session ID for better unique counting
      const visitorId = log.ipAddress || log.sessionId;
      uniqueVisitorsSet.add(visitorId);
      
      const logDate = new Date(log.createdAt);
      const diffMins = (now.getTime() - logDate.getTime()) / (1000 * 60);
      if (diffMins <= 15) {
        activeSessionsSet.add(visitorId);
      }

      if (pathCounts[log.path]) {
        pathCounts[log.path]++;
      } else {
        pathCounts[log.path] = 1;
      }
    });

    const topPages = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalVisits: logs.length,
      uniqueVisitors: uniqueVisitorsSet.size,
      activeSessions: activeSessionsSet.size,
      topPages,
      recentLogs: logs.slice(0, 50),
    };
  },
};
