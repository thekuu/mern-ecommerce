import { pgTable, text, timestamp, boolean, integer, doublePrecision, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('user_role', ['customer', 'admin', 'moderator']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const draftStatusEnum = pgEnum('draft_status', ['draft', 'imported', 'archived']);

// 1. Users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  avatar: text('avatar'),
  isGoogleUser: boolean('is_google_user').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. User Roles (Separated from profiles for strict RBAC and privilege escalation protection)
export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('customer'), // 'customer' | 'admin' | 'moderator'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. User Profiles
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  phone: text('phone'),
  subcity: text('subcity'),
  woreda: text('woreda'),
  street: text('street'),
  city: text('city').default('Addis Ababa'),
  country: text('country').default('ET'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Categories
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  image: text('image'),
  parentId: text('parent_id'),
  productCount: integer('product_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Products
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  shortDescription: text('short_description'),
  price: doublePrecision('price').notNull(),
  compareAtPrice: doublePrecision('compare_at_price'),
  currency: text('currency').default('ETB').notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  rating: doublePrecision('rating').default(4.5).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  stock: integer('stock').default(0).notNull(),
  sku: text('sku').notNull(),
  isNew: boolean('is_new').default(false).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Product Images
export const productImages = pgTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: text('alt').default(''),
  isPrimary: boolean('is_primary').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Product Variants (Size, Color, SKU, Stock)
export const productVariants = pgTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  size: text('size'),
  colorName: text('color_name'),
  colorHex: text('color_hex'),
  sku: text('sku'),
  stock: integer('stock').default(0).notNull(),
  priceDelta: doublePrecision('price_delta').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Carts
export const carts = pgTable('carts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Cart Items
export const cartItems = pgTable('cart_items', {
  id: text('id').primaryKey(),
  cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantKey: text('variant_key').notNull(),
  size: text('size'),
  colorName: text('color_name'),
  colorHex: text('color_hex'),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Orders
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  subcity: text('subcity').notNull(),
  woreda: text('woreda'),
  street: text('street').notNull(),
  city: text('city').default('Addis Ababa').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  tax: doublePrecision('tax').default(0).notNull(),
  shipping: doublePrecision('shipping').default(0).notNull(),
  total: doublePrecision('total').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentMethod: text('payment_method').default('cash_on_delivery').notNull(),
  paymentReceiptUrl: text('payment_receipt_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Order Items
export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  variantKey: text('variant_key').notNull(),
  size: text('size'),
  colorName: text('color_name'),
  colorHex: text('color_hex'),
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
  total: doublePrecision('total').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. Payment Receipts
export const paymentReceipts = pgTable('payment_receipts', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  fileType: text('file_type'),
  status: text('status').default('submitted').notNull(), // 'submitted' | 'verified' | 'rejected'
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Settings (Key/Value configuration store)
export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Telegram Sources (Channel ingestion)
export const telegramSources = pgTable('telegram_sources', {
  id: text('id').primaryKey(),
  channelUsername: text('channel_username').notNull().unique(),
  title: text('title').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 15. Telegram Drafts
export const telegramDrafts = pgTable('telegram_drafts', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').references(() => telegramSources.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(),
  messageId: integer('message_id').notNull(),
  rawCaption: text('raw_caption'),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  parsed: jsonb('parsed').$type<Record<string, any>>().default({}).notNull(),
  status: text('status').default('draft').notNull(), // 'draft' | 'imported' | 'archived'
  importedProductId: text('imported_product_id').references(() => products.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 16. Reviews
export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Wishlists
export const wishlists = pgTable('wishlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const visitorLogs = pgTable('visitor_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  path: text('path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  roles: many(userRoles),
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  orders: many(orders),
  reviews: many(reviews),
  wishlists: many(wishlists),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  receipts: many(paymentReceipts),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
