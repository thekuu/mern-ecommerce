import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, ProductColor, ProductImage } from '@/types';
import { useProductStore } from '@/store/productStore';
import { useCategoryStore } from '@/store/categoryStore';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

const emptyForm = (defaultCategoryId = 'cat-clothes') => ({
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  price: 0,
  compareAtPrice: undefined as number | undefined,
  categoryId: defaultCategoryId,
  stock: 0,
  tags: [] as string[],
  sizes: [] as string[],
  colors: [] as ProductColor[],
  images: [] as ProductImage[],
  isFeatured: false,
  isNew: false,
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const upsert = useProductStore((s) => s.upsert);
  const categories = useCategoryStore((s) => s.categories);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const defaultCatId = categories[0]?.id || 'cat-clothes';
  const [form, setForm] = useState(emptyForm(defaultCatId));
  const [sizeInput, setSizeInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const downloadUrl = await uploadImageToCloudinary(file, 'shegaddis/products');
        const image: ProductImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: downloadUrl,
          alt: form.name || file.name,
          isPrimary: form.images.length === 0,
        };
        setForm((prev) => ({ ...prev, images: [...prev.images, image] }));
      }
      toast.success('Image uploaded to Cloudinary');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload image: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        categoryId: product.category?.id || defaultCatId,
        stock: product.stock,
        tags: product.tags,
        sizes: product.sizes ?? [],
        colors: product.colors ?? [],
        images: product.images,
        isFeatured: !!product.isFeatured,
        isNew: !!product.isNew,
      });
    } else {
      setForm(emptyForm(defaultCatId));
    }
  }, [product, open, defaultCatId]);

  const addSize = () => {
    const v = sizeInput.trim();
    if (!v || form.sizes.includes(v)) return;
    setForm({ ...form, sizes: [...form.sizes, v] });
    setSizeInput('');
  };
  const addTag = () => {
    const v = tagInput.trim();
    if (!v || form.tags.includes(v)) return;
    setForm({ ...form, tags: [...form.tags, v] });
    setTagInput('');
  };
  const addColor = () => {
    const name = colorName.trim();
    if (!name) return;
    if (form.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setForm({ ...form, colors: [...form.colors, { name, hex: colorHex }] });
    setColorName('');
    setColorHex('#000000');
  };
  const addImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    const image: ProductImage = {
      id: `img-${Date.now()}`,
      url,
      alt: form.name,
      isPrimary: form.images.length === 0,
    };
    setForm({ ...form, images: [...form.images, image] });
    setImageUrl('');
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (form.images.length === 0) {
      toast.error('Add at least one image');
      return;
    }
    const category = categories.find((c) => c.id === form.categoryId) || categories[0] || {
      id: form.categoryId,
      name: 'General',
      slug: 'general',
      description: '',
      image: '',
      productCount: 0,
    };
    const slug = form.slug.trim() || slugify(form.name);
    const now = new Date().toISOString();
    const next: Product = {
      id: product?.id ?? `p-${Date.now()}`,
      name: form.name.trim(),
      slug,
      description: form.description.trim(),
      shortDescription: form.shortDescription.trim() || form.description.slice(0, 80),
      price: form.price,
      compareAtPrice: form.compareAtPrice && form.compareAtPrice > 0 ? form.compareAtPrice : undefined,
      currency: 'ETB',
      images: form.images,
      category,
      tags: form.tags,
      sizes: form.sizes.length ? form.sizes : undefined,
      colors: form.colors.length ? form.colors : undefined,
      rating: product?.rating ?? 0,
      reviewCount: product?.reviewCount ?? 0,
      stock: form.stock,
      sku: product?.sku ?? `HC-${Date.now().toString().slice(-6)}`,
      isFeatured: form.isFeatured,
      isNew: form.isNew,
      createdAt: product?.createdAt ?? now,
      updatedAt: now,
    };
    upsert(next);
    toast.success(product ? 'Product updated' : 'Product created');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {product ? 'Edit product' : 'Add product'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Basics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug <span className="text-xs text-muted-foreground">(auto if blank)</span></Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.name)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Short description <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief summary" />
            </div>
            <div className="col-span-2">
              <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed product details (optional)" />
            </div>
          </div>

          {/* Pricing & stock */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Price (ETB)</Label>
              <Input type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Compare at <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="number" value={form.compareAtPrice ?? ''} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <Label>Sizes</Label>
            <div className="flex gap-2">
              <Input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} placeholder="e.g. M or EU 42" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())} />
              <Button type="button" variant="secondary" onClick={addSize}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.sizes.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1">
                  {s}
                  <button onClick={() => setForm({ ...form, sizes: form.sizes.filter((x) => x !== s) })}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <Label>Colors</Label>
            <div className="flex gap-2 items-center">
              <Input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Color name (e.g. Navy)" />
              <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-10 w-14 rounded border border-border cursor-pointer" />
              <Button type="button" variant="secondary" onClick={addColor}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.colors.map((c) => (
                <Badge key={c.name} variant="secondary" className="gap-2 pl-1">
                  <span className="h-4 w-4 rounded-full border border-border" style={{ background: c.hex }} />
                  {c.name}
                  <button onClick={() => setForm({ ...form, colors: form.colors.filter((x) => x.name !== c.name) })}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Images</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading to Cloudinary...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload Images
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste image URL (https://...)"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" variant="secondary" onClick={addImage}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.images.map((im, index) => (
                <div 
                  key={im.id + index} 
                  className="relative group cursor-pointer"
                  onClick={(e) => {
                    if (index === 0) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setForm(prev => {
                      if (!prev.images) return prev;
                      const newImages = [...prev.images].map(img => ({ ...img, isPrimary: false }));
                      const target = newImages.splice(index, 1)[0];
                      target.isPrimary = true;
                      newImages.unshift(target);
                      return { ...prev, images: newImages };
                    });
                  }}
                >
                  <img
                    src={getImageUrl(im.url) || FALLBACK_PRODUCT_IMAGE}
                    alt=""
                    referrerPolicy="no-referrer"
                    className={`h-16 w-16 rounded object-cover border-2 transition-all ${index === 0 ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                    onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setForm(prev => ({ ...prev, images: prev.images?.filter((x) => x.id !== im.id) || [] }));
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded shadow-sm z-10 pointer-events-none">
                      COVER
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="e.g. leather, sale" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.tags.map((t) => (
                <Badge key={t} variant="outline" className="gap-1">
                  {t}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
              <span className="text-sm">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={form.isNew} onCheckedChange={(v) => setForm({ ...form, isNew: v })} />
              <span className="text-sm">Mark as new</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gradient-primary text-primary-foreground font-heading" onClick={handleSubmit}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
