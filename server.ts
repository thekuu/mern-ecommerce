import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { repository } from './src/db/index.js';

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shegaddis-super-secret-jwt-token-2026';

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// ── Cloudinary Configuration ──────────────────────────────────
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'hfj6afxi';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'shegaddis_uploads';

if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    secure: true,
  });
}

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// ── Middlewares ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Auth Types & Helpers ──────────────────────────────────────
interface AuthUserPayload {
  userId: string;
  email: string;
  role: 'customer' | 'admin' | 'moderator';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

function generateToken(payload: AuthUserPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
  } catch (err) {
    // Token expired or invalid
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Admin privilege required' });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin privilege required' });
  }
  next();
}


app.use(authMiddleware);

// ── Validation Schemas ────────────────────────────────────────
const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(30),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => data.username || data.email, {
  message: 'Username is required',
});

const orderSchema = z.object({
  subcity: z.string().min(1, 'Sub-city is required'),
  woreda: z.string().optional(),
  street: z.string().min(1, 'Street / Area is required'),
  phone: z.string().min(8, 'Phone number is required'),
  deliveryDate: z.string().optional(),
  deliveryTimeSlot: z.string().optional(),
  paymentMethod: z.string().default('pay_on_delivery'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      variantKey: z.string(),
      size: z.string().optional(),
      colorName: z.string().optional(),
      colorHex: z.string().optional(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
      imageUrl: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
});

// ─────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Cloudinary File Upload Endpoints ──────────────────────────

app.get('/api/cloudinary/status', (req, res) => {
  res.json({
    status: 'ok',
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    isConfigured: true,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
  });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const folder = (req.body.folder as string) || 'shegaddis/uploads';

    // If API credentials are provided, use secure upload stream
    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Upload failed'));
            }
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        stream.end(req.file!.buffer);
      });

      const result = await uploadPromise;
      return res.json({
        url: result.secure_url,
        public_id: result.public_id,
        success: true,
      });
    }

    // Direct Unsigned HTTP Upload Fallback to Cloudinary CDN
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errJson: any = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errJson?.error?.message || 'Failed to upload image to Cloudinary',
      });
    }

    const data: any = await response.json();
    return res.json({
      url: data.secure_url,
      public_id: data.public_id,
      success: true,
    });
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

app.post('/api/upload/url', async (req, res) => {
  try {
    const { url, base64, folder = 'shegaddis/uploads' } = req.body;
    const target = url || base64;
    if (!target) {
      return res.status(400).json({ error: 'URL or Base64 payload required' });
    }

    if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const result = await cloudinary.uploader.upload(target, {
        folder,
        resource_type: 'auto',
      });
      return res.json({
        url: result.secure_url,
        public_id: result.public_id,
        success: true,
      });
    }

    // Unsigned direct fetch
    const formData = new FormData();
    formData.append('file', target);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (folder) formData.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errJson: any = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errJson?.error?.message || 'Failed to upload image to Cloudinary',
      });
    }

    const data: any = await response.json();
    return res.json({
      url: data.secure_url,
      public_id: data.public_id,
      success: true,
    });
  } catch (err: any) {
    console.error('Cloudinary url upload error:', err);
    res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

// Neutral SVG Placeholder used when an external image cannot be fetched
const SVG_FALLBACK = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><rect width="400" height="400" fill="#f3f4f6"/><g fill="#9ca3af"><path d="M200 140c-22.09 0-40 17.91-40 40s17.91 40 40 40 40-17.91 40-40-17.91-40-40-40zm0 60c-11.03 0-20-8.97-20-20s8.97-20 20-20 20 8.97 20 20-8.97 20-20 20z"/><path d="M290 260H110c-5.52 0-10-4.48-10-10 0-27.57 22.43-50 50-50h100c27.57 0 50 22.43 50 50 0 5.52-4.48 10-10 10zm-136.63-20h93.26c-3.8-11.39-14.54-20-27.63-20h-38c-13.09 0-23.83 8.61-27.63 20z"/></g><text x="200" y="300" font-family="sans-serif" font-size="14" font-weight="500" fill="#9ca3af" text-anchor="middle">ShegAddis</text></svg>`
);

// High-speed Image Proxy to safely resolve Telegram and third-party images without referrer blocks
app.get('/api/image-proxy', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || !imageUrl.startsWith('http')) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(SVG_FALLBACK);
  }

  try {
    const isTelegram = imageUrl.includes('telesco.pe') || imageUrl.includes('telegram.org') || imageUrl.includes('t.me');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        ...(isTelegram ? { 'Referer': 'https://t.me/' } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(SVG_FALLBACK);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(SVG_FALLBACK);
  }
});

// ── Auth Endpoints ────────────────────────────────────────────

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const cleanUsername = data.username.trim().toLowerCase();
    
    // Check if username is already taken
    const isTaken = await repository.checkUsernameTaken(cleanUsername, '');
    if (isTaken) {
      return res.status(409).json({ error: `Username '${data.username}' is already taken. Please choose another username.` });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await repository.createUser({
      username: cleanUsername,
      fullName: data.fullName,
      passwordHash,
      role: 'customer',
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const identifier = (data.username || data.email || '').trim();
    const user = await repository.findUserByUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = user.passwordHash ? await bcrypt.compare(data.password, user.passwordHash) : false;

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken({ userId: user.id, email: user.email || `${user.username}@shegaddis.local`, role: user.role });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await repository.findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role,
    profile: user.profile,
  });
});

app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, username } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    const updateData: any = { firstName, lastName };
    if (username) {
      // If we support username updates by changing the email alias
      const cleanUsername = username.trim().toLowerCase();
      // Check if another user has this username
      const isTaken = await repository.checkUsernameTaken(cleanUsername, req.user!.userId);
      if (isTaken) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      updateData.email = `${cleanUsername}@shegaddis.local`;
    }
    
    const updatedUser = await repository.updateUserProfile(req.user!.userId, updateData);
    res.json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

app.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const user = await repository.findUserById(req.user!.userId);
    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: 'User not found or cannot change password' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await repository.updateUserPassword(req.user!.userId, passwordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Google OAuth simulation/handler
app.post('/api/auth/google', authLimiter, async (req, res) => {
  const { email, firstName, lastName, avatar } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  let user = await repository.findUserByEmail(email);
  if (!user) {
    user = await repository.createUser({
      email,
      firstName: firstName || 'Google',
      lastName: lastName || 'User',
      avatar,
      role: 'customer',
    });
  }

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
    },
    token,
  });
});

// ── Categories Endpoints ──────────────────────────────────────

app.get('/api/categories', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const categories = await repository.getCategories();
  res.json(categories);
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, image } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });
    const category = await repository.createCategory({ name, slug, description, image });
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await repository.updateCategory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Category not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  const success = await repository.deleteCategory(req.params.id);
  if (!success) return res.status(404).json({ error: 'Category not found' });
  res.json({ message: 'Category deleted' });
});

// ── Products Endpoints ────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const {
      category,
      search,
      onSale,
      size,
      color,
      minPrice,
      maxPrice,
      sortBy,
      isNew,
      isFeatured,
      page,
      pageSize,
    } = req.query;

    const result = await repository.getProducts({
      category: category as string,
      search: search as string,
      onSale: onSale === 'true',
      size: size as string,
      color: color as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy as any,
      isNew: isNew === 'true',
      isFeatured: isFeatured === 'true',
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 12,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const product = await repository.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const newProduct = await repository.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await repository.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const deleted = await repository.deleteProduct(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

// ── Orders Endpoints ──────────────────────────────────────────

app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    // If admin, can retrieve all orders, otherwise only own orders
    const userId = (req.user?.role === 'admin' || req.user?.role === 'superadmin') && req.query.all === 'true' ? undefined : req.user?.userId;
    const orders = await repository.getOrders(userId);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const order = await repository.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Ensure customer only views their own order
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && order.userId && order.userId !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const data = orderSchema.parse(req.body);
    const user = await repository.findUserById(req.user!.userId);

    const order = await repository.createOrder({
      userId: req.user!.userId,
      customerName: user ? `${user.firstName} ${user.lastName}` : 'Valued Customer',
      customerEmail: user?.email || req.user!.email,
      customerPhone: data.phone,
      subcity: data.subcity,
      woreda: data.woreda,
      street: data.street,
      items: data.items,
      deliveryDate: data.deliveryDate,
      deliveryTimeSlot: data.deliveryTimeSlot,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });

    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order creation failed' });
  }
});

app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const order = await repository.updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/orders/:id/receipt', requireAuth, async (req, res) => {
  try {
    const { receiptUrl } = req.body;
    if (!receiptUrl) return res.status(400).json({ error: 'Receipt URL or payload is required' });
    
    // Check ownership to prevent IDOR
    const existingOrder = await repository.getOrderById(req.params.id);
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && existingOrder.userId && existingOrder.userId !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const order = await repository.attachReceipt(req.params.id, receiptUrl);
    res.json({ message: 'Receipt attached successfully', order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Settings Endpoints ────────────────────────────────────────

app.get('/api/express-test', (req, res) => res.json({ success: true, url: req.url }));
app.get('/api/settings', async (req, res) => {
  const settings = await repository.getSettings();
  res.json(settings);
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  try {
    const updated = await repository.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Telegram Pipeline Endpoints ───────────────────────────────

app.get('/api/telegram/sources', requireAdmin, async (req, res) => {
  const sources = await repository.getTelegramSources();
  res.json(sources);
});

app.post('/api/telegram/sources', requireAdmin, async (req, res) => {
  try {
    const { channelUsername, title } = req.body;
    if (!channelUsername) return res.status(400).json({ error: 'Channel username required' });
    const source = await repository.createTelegramSource(channelUsername, title);
    res.status(201).json(source);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/telegram/sources/:id', requireAdmin, async (req, res) => {
  const success = await repository.deleteTelegramSource(req.params.id);
  if (!success) return res.status(404).json({ error: 'Source not found' });
  res.json({ message: 'Source deleted' });
});

app.get('/api/telegram/drafts', requireAdmin, async (req, res) => {
  const drafts = await repository.getTelegramDrafts();
  res.json(drafts);
});

app.post('/api/telegram/drafts', requireAdmin, async (req, res) => {
  try {
    const result = await repository.createTelegramDraft(req.body);
    res.status(201).json(result ? result.draft : null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/scrape', requireAdmin, async (req, res) => {
  try {
    const draft = await repository.triggerTelegramScrape(req.body.channelUsername);
    res.status(201).json(draft);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/telegram/drafts/:id', requireAdmin, async (req, res) => {
  try {
    const { parsed, images } = req.body;
    const draft = await repository.updateTelegramDraft(req.params.id, parsed, images);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    res.json(draft);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/telegram/drafts', requireAdmin, async (req, res) => {
  try {
    await repository.clearAllTelegramDrafts();
    res.json({ message: 'All drafts cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/telegram/drafts/:id', requireAdmin, async (req, res) => {
  try {
    await repository.deleteTelegramDraft(req.params.id);
    res.json({ message: 'Draft deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to upload Telegram images directly to Cloudinary
async function uploadTelegramImageToCloudinary(imageUrl: string): Promise<string> {
  if (!imageUrl.includes('telesco.pe') && !imageUrl.includes('telegram.org')) {
    return imageUrl; // Not a Telegram image
  }

  // 1. Download image from Telegram
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': 'https://t.me/',
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch image from Telegram: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Upload to Cloudinary
  if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'shegaddis/products', resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });
  }

  // Unsigned fallback
  const formData = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  formData.append('file', blob, 'telegram_image.jpg');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'shegaddis/products');

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error('Failed to upload image to Cloudinary via unsigned HTTP');
  }

  const data: any = await uploadRes.json();
  return data.secure_url;
}

app.post('/api/telegram/drafts/:id/import', requireAdmin, async (req, res) => {
  try {
    const primaryIndex = typeof req.body?.primaryIndex === 'number' ? req.body.primaryIndex : 0;
    
    // Process Draft Images to Cloudinary before importing
    const drafts = await repository.getTelegramDrafts();
    const draft = drafts.find(d => d.id === req.params.id);
    if (draft && draft.images && draft.images.length > 0) {
      const uploadedImages = [];
      for (const imgUrl of draft.images) {
        try {
          const cloudUrl = await uploadTelegramImageToCloudinary(imgUrl);
          uploadedImages.push(cloudUrl);
        } catch (err) {
          console.error(`Failed to upload ${imgUrl} to Cloudinary:`, err);
          uploadedImages.push(imgUrl); // fallback to original
        }
      }
      // Update draft with cloudinary URLs
      await repository.updateTelegramDraft(draft.id, draft.parsed, uploadedImages);
    }
    
    const result = await repository.importDraftAsProduct(req.params.id, primaryIndex);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Users Management & Analytics (Admin) ──────────────────────

app.get('/api/users', requireAdmin, async (req, res) => {
  const users = await repository.getAllUsers();
  res.json(users);
});

app.patch('/api/users/:id/role', requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin', 'moderator', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await repository.updateUserRole(req.params.id, role);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id/reset-password', requireSuperAdmin, async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('0000', salt);
    await repository.updateUserPassword(req.params.id, passwordHash);
    res.json({ message: 'Password reset to 0000 successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics', requireAdmin, async (req, res) => {
  const analytics = await repository.getAnalytics();
  res.json(analytics);
});

app.post('/api/analytics/track', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'Path is required' });

    // Handle sessionId cookie
    let sessionId = req.cookies.visitor_session_id;
    if (!sessionId) {
      sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      res.cookie('visitor_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Optional decoding if token exists for logged in users
    let userId = null;
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
        userId = decoded.userId;
      } catch (e) {
        // ignore invalid tokens
      }
    }

    await repository.logVisit({
      sessionId,
      userId,
      ipAddress,
      userAgent,
      path,
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/visitors', requireAdmin, async (req, res) => {
  try {
    const data = await repository.getVisitorAnalytics();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Development / Production Vite Integration ─────────────────

async function startServer() {
  // Start background auto-cleanup job for old new arrivals (10 days old)
  const cleanupOldProducts = async () => {
    try {
      const deletedCount = await repository.deleteOldNewArrivalProducts(10);
      if (deletedCount > 0) {
        console.log(`🧹 Auto-cleanup: Deleted ${deletedCount} old new-arrival products (older than 10 days).`);
      }
    } catch (err) {
      console.error('Error during auto-cleanup:', err);
    }
  };
  
  // Only run the interval if we are NOT in a Serverless environment like Vercel
  // Serverless functions are ephemeral and do not support long-running setIntervals
  if (!process.env.VERCEL) {
    setTimeout(cleanupOldProducts, 5000);
    setInterval(cleanupOldProducts, 12 * 60 * 60 * 1000);
  } else {
    // Run once on cold boot in serverless
    cleanupOldProducts();
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✨ ShegAddis server running on http://0.0.0.0:${PORT}`);
    });
  }
}
startServer();

// Export for Vercel Serverless Functions
export default app;
// Trigger UI update for GitHub Export
// Trigger UI update for GitHub Export 2
// Trigger UI update for GitHub Export 3
// Trigger UI update for GitHub Export 4
// Trigger UI update for GitHub Export 5
// Trigger UI update for GitHub Export 6
// Trigger UI update for GitHub Export 7
// Trigger UI update for GitHub Export 8
// Trigger UI update for GitHub Export 9
// Trigger UI update for GitHub Export 10
