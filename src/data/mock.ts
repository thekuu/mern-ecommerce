import type { Product, Category, Order, User, Review, ProductColor } from '@/types';

/**
 * Mock data for development. Replace with real API calls when backend is ready.
 * Scaling note: to add more categories, append to `mockCategories`. Products
 * reference their category by object — no other code changes required.
 */

// ─── Categories (start with 2, scale later) ─────────────────

export const mockCategories: Category[] = [
  {
    id: 'cat-clothes',
    name: 'Clothes',
    slug: 'clothes',
    description: 'Everyday heavy tees, linen overshirts, denim, and fine knitwear.',
    productCount: 8,
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop',
  },
  {
    id: 'cat-shoes',
    name: 'Shoes',
    slug: 'shoes',
    description: 'Leather court sneakers, trail runners, desert boots, and canvas slip-ons.',
    productCount: 8,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&h=1200&fit=crop',
  },
];

// ─── Shared style tokens ────────────────────────────────────

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'];

const COLOR: Record<string, ProductColor> = {
  black: { name: 'Black', hex: '#111111' },
  white: { name: 'White', hex: '#F5F5F0' },
  cream: { name: 'Cream', hex: '#EEE8D6' },
  navy: { name: 'Navy', hex: '#1E2A44' },
  olive: { name: 'Olive', hex: '#6B7248' },
  charcoal: { name: 'Charcoal', hex: '#3A3A3A' },
  tan: { name: 'Tan', hex: '#B58860' },
  red: { name: 'Red', hex: '#B03A2E' },
};

// ─── Products ───────────────────────────────────────────────

type Seed = Omit<Product, 'id' | 'slug' | 'currency' | 'createdAt' | 'updatedAt' | 'sku' | 'reviewCount' | 'rating'> & {
  slug: string;
  rating?: number;
  reviewCount?: number;
};

const seeds: Seed[] = [
  // ── Clothes ──
  {
    slug: 'oversized-cotton-tee',
    name: 'Oversized Cotton Tee',
    description: 'Heavyweight 100% organic cotton with a relaxed drop-shoulder cut. Pre-shrunk, softens beautifully with every wash.',
    shortDescription: 'Heavyweight organic cotton, drop-shoulder cut.',
    price: 1400,
    compareAtPrice: 1800,
    images: img('photo-1521572163474-6864f9cf17ab', 'photo-1583743814966-8936f5b7be1a'),
    category: mockCategories[0],
    tags: ['essentials', 'unisex'],
    sizes: CLOTHING_SIZES,
    colors: [COLOR.white, COLOR.black, COLOR.olive],
    stock: 48,
    isFeatured: true,
    isNew: true,
    rating: 4.7, reviewCount: 42,
  },
  {
    slug: 'linen-overshirt',
    name: 'Linen Overshirt',
    description: 'Lightweight European linen with mother-of-pearl buttons. Wears easy over a tee or on its own.',
    shortDescription: 'Breathable linen with a modern fit.',
    price: 3200,
    images: img('photo-1594938298603-c8148c4dae35', 'photo-1591047139829-d91aecb6caea'),
    category: mockCategories[0],
    tags: ['linen', 'seasonal'],
    sizes: CLOTHING_SIZES,
    colors: [COLOR.cream, COLOR.navy, COLOR.charcoal],
    stock: 22,
    isFeatured: true,
    rating: 4.8, reviewCount: 31,
  },
  {
    slug: 'straight-leg-denim',
    name: 'Straight-Leg Denim',
    description: 'Rigid selvedge denim with a clean straight leg. Cut for comfort, built to break in over time.',
    shortDescription: 'Selvedge denim, straight cut.',
    price: 3800,
    images: img('photo-1542272604-787c3835535d', 'photo-1594633312681-425c7b97ccd1'),
    category: mockCategories[0],
    tags: ['denim'],
    sizes: CLOTHING_SIZES,
    colors: [COLOR.navy, COLOR.black],
    stock: 35,
    rating: 4.6, reviewCount: 58,
  },
  {
    slug: 'merino-crew-sweater',
    name: 'Merino Crew Sweater',
    description: 'Fine-gauge extra-fine merino wool. Warm without weight, itch-free and machine washable.',
    shortDescription: 'Extra-fine merino, everyday knit.',
    price: 4200,
    compareAtPrice: 5200,
    images: img('photo-1620799140408-edc6dcb6d633', 'photo-1434389677669-e08b4cac3105'),
    category: mockCategories[0],
    tags: ['knitwear', 'sale'],
    sizes: CLOTHING_SIZES,
    colors: [COLOR.cream, COLOR.charcoal, COLOR.olive],
    stock: 18,
    isFeatured: true,
    rating: 4.9, reviewCount: 27,
  },

  // ── Shoes ──
  {
    slug: 'court-classic-sneaker',
    name: 'Court Classic Sneaker',
    description: 'Full-grain leather uppers on a cupsole. A quiet, versatile sneaker that pairs with everything.',
    shortDescription: 'Leather cupsole sneaker.',
    price: 4800,
    images: img('photo-1549298916-b41d501d3772', 'photo-1600185365483-26d7a4cc7519'),
    category: mockCategories[1],
    tags: ['leather'],
    sizes: SHOE_SIZES,
    colors: [COLOR.white, COLOR.black],
    stock: 40,
    isFeatured: true,
    isNew: true,
    rating: 4.8, reviewCount: 65,
  },
  {
    slug: 'trail-runner-v2',
    name: 'Trail Runner V2',
    description: 'Grippy Vibram outsole with a breathable mesh upper. Built for city streets and weekend trails alike.',
    shortDescription: 'Grippy runner for city and trail.',
    price: 5400,
    compareAtPrice: 6200,
    images: img('photo-1595950653106-6c9ebd614d3a', 'photo-1606107557195-0e29a4b5b4aa'),
    category: mockCategories[1],
    tags: ['performance', 'sale'],
    sizes: SHOE_SIZES,
    colors: [COLOR.black, COLOR.olive, COLOR.red],
    stock: 24,
    isFeatured: true,
    rating: 4.7, reviewCount: 89,
  },
  {
    slug: 'suede-desert-boot',
    name: 'Suede Desert Boot',
    description: 'Waxed suede with a crepe sole. A quiet, considered boot that gets better with wear.',
    shortDescription: 'Waxed suede, crepe sole.',
    price: 5900,
    images: img('photo-1520639888713-7851133b1ed0', 'photo-1608231387042-66d1773070a5'),
    category: mockCategories[1],
    tags: ['boot'],
    sizes: SHOE_SIZES,
    colors: [COLOR.tan, COLOR.charcoal],
    stock: 16,
    rating: 4.6, reviewCount: 34,
  },
  {
    slug: 'canvas-slip-on',
    name: 'Canvas Slip-On',
    description: 'Heavyweight cotton canvas on a vulcanized rubber sole. The easiest shoe you\'ll own.',
    shortDescription: 'Everyday canvas slip-on.',
    price: 2400,
    images: img('photo-1525966222134-fcfa99b8ae77', 'photo-1512374382149-233c42b6a83b'),
    category: mockCategories[1],
    tags: ['casual'],
    sizes: SHOE_SIZES,
    colors: [COLOR.white, COLOR.black, COLOR.navy],
    stock: 52,
    isNew: true,
    rating: 4.5, reviewCount: 71,
  },
];

function img(...ids: string[]) {
  return ids.map((id, i) => ({
    id: `img-${id}-${i}`,
    url: `https://images.unsplash.com/${id}?w=800&h=800&fit=crop`,
    alt: '',
    isPrimary: i === 0,
  }));
}

export const mockProducts: Product[] = seeds.map((s, i) => ({
  ...s,
  id: String(i + 1),
  currency: 'ETB',
  sku: `HC-${String(i + 1).padStart(5, '0')}`,
  rating: s.rating ?? 4.5,
  reviewCount: s.reviewCount ?? 12,
  // Recent-relative dates so "New Arrivals" (2-week window) stays meaningful in demo data
  createdAt: new Date(Date.now() - (i + 1) * 3 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}));

export const featuredProducts = mockProducts.filter(p => p.isFeatured);

// ─── Orders / Users / Reviews ───────────────────────────────

export const mockOrders: Order[] = [
  {
    id: '1', orderNumber: 'ORD-2025-001',
    items: [
      { product: mockProducts[0], quantity: 1, variantKey: `${mockProducts[0].id}::M::White`, size: 'M', color: COLOR.white },
    ],
    subtotal: 1400, tax: 0, shipping: 150, total: 1550,
    status: 'delivered',
    shippingAddress: { firstName: 'John', lastName: 'Doe', street: 'Bole, Woreda 03', city: 'Addis Ababa', state: 'AA', zipCode: '1000', country: 'ET' },
    createdAt: '2025-06-15T10:30:00Z',
  },
  {
    id: '2', orderNumber: 'ORD-2025-002',
    items: [
      { product: mockProducts[4], quantity: 1, variantKey: `${mockProducts[4].id}::EU 42::White`, size: 'EU 42', color: COLOR.white },
    ],
    subtotal: 4800, tax: 0, shipping: 150, total: 4950,
    status: 'shipped',
    shippingAddress: { firstName: 'John', lastName: 'Doe', street: 'Bole, Woreda 03', city: 'Addis Ababa', state: 'AA', zipCode: '1000', country: 'ET' },
    createdAt: '2025-07-20T14:15:00Z',
  },
];

export const mockUsers: User[] = [
  { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe', role: 'customer', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'admin', createdAt: '2023-06-01T00:00:00Z' },
  { id: '3', email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith', role: 'customer', createdAt: '2024-03-15T00:00:00Z' },
];

export const mockReviews: Review[] = [
  { id: '1', productId: '1', user: { id: '1', firstName: 'John', lastName: 'D.' }, rating: 5, title: 'Best tee I own', comment: 'The cotton is genuinely heavyweight — feels like a $60 tee elsewhere.', createdAt: '2025-07-01T10:00:00Z' },
  { id: '2', productId: '5', user: { id: '3', firstName: 'Jane', lastName: 'S.' }, rating: 5, title: 'Clean and comfortable', comment: 'True to size, and the leather is softening in nicely.', createdAt: '2025-07-10T14:00:00Z' },
];
