/**
 * Fallback image assets & error handlers across ShegAddis
 */

// Crisp minimalist editorial studio fallback for products
export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop';

// Fallback for categories
export const FALLBACK_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop';

// Fallback for user avatars
export const FALLBACK_AVATAR_IMAGE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop';

// Fallback for payment receipts
export const FALLBACK_RECEIPT_IMAGE =
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80';

// SVG Data URI fallback that is 100% offline & never fails network requests
export const SVG_PLACEHOLDER_PRODUCT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Cg fill='%239ca3af'%3E%3Cpath d='M200 140c-22.09 0-40 17.91-40 40s17.91 40 40 40 40-17.91 40-40-17.91-40-40-40zm0 60c-11.03 0-20-8.97-20-20s8.97-20 20-20 20 8.97 20 20-8.97 20-20 20z'/%3E%3Cpath d='M290 260H110c-5.52 0-10-4.48-10-10 0-27.57 22.43-50 50-50h100c27.57 0 50 22.43 50 50 0 5.52-4.48 10-10 10zm-136.63-20h93.26c-3.8-11.39-14.54-20-27.63-20h-38c-13.09 0-23.83 8.61-27.63 20z'/%3E%3C/g%3E%3Ctext x='200' y='300' font-family='sans-serif' font-size='14' font-weight='500' fill='%239ca3af' text-anchor='middle'%3EShegAddis%3C/text%3E%3C/svg%3E";

/**
 * Safely resolves image URLs, routing Telegram and hotlink-protected CDNs through server proxy
 */
export function getImageUrl(url?: string): string {
  if (!url) return FALLBACK_PRODUCT_IMAGE;
  if (url.startsWith('data:') || url.startsWith('/')) return url;

  // If the image is from Telegram CDN, proxy it to prevent referrer blocking
  if (url.includes('telesco.pe') || url.includes('telegram.org') || url.includes('t.me')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Standard image onError handler to prevent broken image icons and recursive error loops
 */
export function handleImageFallback(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback = FALLBACK_PRODUCT_IMAGE
) {
  const target = event.currentTarget;
  const currentSrc = target.src || '';

  // Step 1: If raw external image failed, try fetching via server image proxy
  if (
    !target.dataset.triedProxy &&
    currentSrc.startsWith('http') &&
    !currentSrc.includes('/api/image-proxy') &&
    !currentSrc.includes('unsplash.com')
  ) {
    target.dataset.triedProxy = 'true';
    target.src = `/api/image-proxy?url=${encodeURIComponent(currentSrc)}`;
    return;
  }

  // Step 2: Use standard fallback image
  if (target.dataset.failedOnce !== 'true') {
    target.dataset.failedOnce = 'true';
    target.src = fallback;
    return;
  }

  // Step 3: If fallback also fails, use infallible offline SVG
  target.src = SVG_PLACEHOLDER_PRODUCT;
}
