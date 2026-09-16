/**
 * Core domain types for the e-commerce platform.
 */

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: ProductImage[];
  category: Category;
  tags: string[];
  /** Available sizes for this product (e.g. "S", "M", "L" or "EU 41") */
  sizes?: string[];
  /** Available colors for this product */
  colors?: ProductColor[];
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  productCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  /** Composite key identifying this variant line (product + size + color) */
  variantKey: string;
  size?: string;
  color?: ProductColor;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subcity?: string;
  woreda?: string;
  street?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  paymentMethod?: string;
  paymentReceiptUrl?: string | null;
  notes?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Address {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface User {
  id: string;
  username?: string;
  fullName?: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'customer' | 'admin' | 'moderator' | 'superadmin';
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'name';
  search?: string;
  onSale?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  size?: string;
  color?: string;
  page?: number;
  pageSize?: number;
}
