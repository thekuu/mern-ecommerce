/**
 * Cloudinary File Storage Utility
 * Supports both Server-Side Cloudinary API upload (/api/upload)
 * and Direct Unsigned Client-Side Upload for maximum reliability.
 */

const DEFAULT_CLOUD_NAME = 'hfj6afxi';
const DEFAULT_UPLOAD_PRESET = 'shegaddis_uploads';

export interface CloudinaryUploadResult {
  secure_url?: string;
  url?: string;
  public_id?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

/**
 * Uploads a local image File directly to Cloudinary via server API or direct CDN fallback
 */
export async function uploadImageToCloudinary(file: File, folder = 'shegaddis/products'): Promise<string> {
  // 1. Try server API upload first
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const isAdmin = sessionStorage.getItem('admin_auth') === 'true';
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (isAdmin) headers['x-admin-session'] = 'true';

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (serverErr) {
    console.warn('Server upload endpoint fallback to direct Cloudinary:', serverErr);
  }

  // 2. Direct Unsigned Client Upload Fallback
  const directFormData = new FormData();
  directFormData.append('file', file);
  directFormData.append('upload_preset', DEFAULT_UPLOAD_PRESET);
  if (folder) {
    directFormData.append('folder', folder);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${DEFAULT_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: directFormData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Upload failed with status ${response.status}`;
    throw new Error(`Cloudinary upload error: ${message}`);
  }

  const data: CloudinaryUploadResult = await response.json();
  return data.secure_url || data.url || '';
}

/**
 * Uploads an image by URL or Base64 string directly to Cloudinary
 */
export async function uploadImageUrlToCloudinary(imageUrlOrBase64: string, folder = 'shegaddis/products'): Promise<string> {
  // 1. Try server API upload first
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const isAdmin = sessionStorage.getItem('admin_auth') === 'true';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (isAdmin) headers['x-admin-session'] = 'true';

    const res = await fetch('/api/upload/url', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: imageUrlOrBase64, folder }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (serverErr) {
    console.warn('Server url upload endpoint fallback to direct Cloudinary:', serverErr);
  }

  // 2. Direct Unsigned Client Upload Fallback
  const formData = new FormData();
  formData.append('file', imageUrlOrBase64);
  formData.append('upload_preset', DEFAULT_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${DEFAULT_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Upload failed with status ${response.status}`;
    throw new Error(`Cloudinary upload error: ${message}`);
  }

  const data: CloudinaryUploadResult = await response.json();
  return data.secure_url || data.url || '';
}

/**
 * Generates an optimized Cloudinary delivery URL with auto formatting and responsive sizing
 */
export function getOptimizedCloudinaryUrl(url: string, width?: number, quality: 'auto' | 'good' | 'eco' = 'auto'): string {
  if (!url || !url.includes('res.cloudinary.com')) {
    return url;
  }
  const transforms = [`f_auto`, `q_${quality}`];
  if (width) transforms.push(`w_${width}`);

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}
