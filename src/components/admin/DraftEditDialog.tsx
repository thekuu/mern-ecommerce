import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Check, Upload, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateTelegramDraft } from '@/lib/api';
import { useCategoryStore } from '@/store/categoryStore';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';

export interface DraftParsed {
  name?: string;
  slug?: string;
  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string | null;
  sizes?: string[];
  colors?: string[];
  colorHex?: Record<string, string>;
  category?: string | null;
  description?: string;
  shortDescription?: string;
  tags?: string[];
  stock?: number | null;
  isFeatured?: boolean;
  isNew?: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export interface EditableDraft {
  id: string;
  channel: string;
  message_id: number;
  raw_caption: string | null;
  images: string[];
  parsed: DraftParsed | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: EditableDraft | null;
  primaryIndex?: number;
  onSaved: (draftId: string, parsed: DraftParsed, images: string[], primaryIndex: number) => void;
  onDelete?: (draftId: string, name: string) => void;
}

export function DraftEditDialog({ open, onOpenChange, draft, primaryIndex = 0, onSaved, onDelete }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState<string>('');
  const [compareAtPrice, setCompareAtPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('10');
  const [shortDescription, setShortDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [colorHex, setColorHex] = useState<Record<string, string>>({});
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const downloadUrl = await uploadImageToCloudinary(file, 'shegaddis/products');
        uploadedUrls.push(downloadUrl);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded to Cloudinary`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload image: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const categories = useCategoryStore((s) => s.categories);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [category, setCategory] = useState<string>('Clothes');
  const [description, setDescription] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [primary, setPrimary] = useState(0);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draft) return;
    const p = draft.parsed ?? {};
    setName(p.name ?? '');
    setSlug(p.slug ?? '');
    setPrice(typeof p.price === 'number' ? String(p.price) : '');
    setCompareAtPrice(typeof p.compareAtPrice === 'number' ? String(p.compareAtPrice) : '');
    setStock(typeof p.stock === 'number' ? String(p.stock) : '10');
    setShortDescription(p.shortDescription ?? '');
    setTags(p.tags ?? []);
    setColorHex(p.colorHex ?? {});
    setIsFeatured(!!p.isFeatured);
    setIsNew(p.isNew ?? true);
    setTagInput('');
    setImageUrl('');
    setNewColorHex('#000000');
    setCategory(
      categories.find((c) => c.name.toLowerCase() === (p.category ?? '').toLowerCase())?.name ??
        (categories[0]?.name || 'Clothes')
    );
    setDescription(p.description ?? draft.raw_caption ?? '');
    setSizes(p.sizes ?? []);
    setColors(p.colors ?? []);
    setImages(draft.images ?? []);
    setPrimary(Math.min(primaryIndex, Math.max((draft.images?.length ?? 1) - 1, 0)));
    setSizeInput('');
    setColorInput('');
  }, [draft, primaryIndex, open, categories]);

  const addSize = () => {
    const v = sizeInput.trim();
    if (!v || sizes.includes(v)) return;
    setSizes([...sizes, v]);
    setSizeInput('');
  };
  const addColor = () => {
    const v = colorInput.trim();
    if (!v || colors.includes(v)) return;
    setColors([...colors, v]);
    setColorHex({ ...colorHex, [v]: newColorHex });
    setColorInput('');
    setNewColorHex('#000000');
  };
  const addTag = () => {
    const v = tagInput.trim();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
    setTagInput('');
  };
  const addImage = () => {
    const v = imageUrl.trim();
    if (!v || images.includes(v)) return;
    setImages([...images, v]);
    setImageUrl('');
  };
  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    setPrimary((p) => (idx === p ? 0 : idx < p ? p - 1 : p));
  };

  const save = async () => {
    if (!draft) return;
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const parsed: DraftParsed = {
      ...(draft.parsed ?? {}),
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      price: price ? Number(price) : null,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      stock: stock ? Number(stock) : 0,
      shortDescription: shortDescription.trim(),
      tags,
      colorHex,
      isFeatured,
      isNew,
      currency: draft.parsed?.currency ?? 'ETB',
      category,
      description: description.trim(),
      sizes,
      colors,
    };
    setSaving(true);
    try {
      await updateTelegramDraft(draft.id, parsed, images);
      onSaved(draft.id, parsed, images, primary);
      toast.success('Draft updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update draft');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Edit draft</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Price (ETB)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Slug <span className="text-xs text-muted-foreground">(auto if blank)</span></Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name)} />
            </div>
            <div>
              <Label>Compare at <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="number" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label>Short description <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Shown on cards" />
            </div>
            <div className="col-span-3">
              <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed product details (optional)" />
            </div>
          </div>

          <div>
            <Label>Sizes</Label>
            <div className="flex gap-2">
              <Input
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder="e.g. M or 42"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
              />
              <Button type="button" variant="secondary" onClick={addSize}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {sizes.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1">
                  {s}
                  <button onClick={() => setSizes(sizes.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Colors</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder="e.g. black"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
              />
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer"
              />
              <Button type="button" variant="secondary" onClick={addColor}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {colors.map((c) => (
                <Badge key={c} variant="outline" className="gap-2 pl-1">
                  <span className="h-4 w-4 rounded-full border border-border" style={{ background: colorHex[c] ?? '#888888' }} />
                  {c}
                  <button onClick={() => setColors(colors.filter((x) => x !== c))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. summer"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label className="cursor-pointer">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isNew} onCheckedChange={setIsNew} />
              <Label className="cursor-pointer">New arrival</Label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold uppercase">Product Images ({images.length})</Label>
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
                      Upload Image
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Click any image below to select it as the <strong>Front Card Cover</strong>
            </p>

            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 my-2">
                {images.map((url, i) => {
                  const isPrimary = i === primary;
                  return (
                    <div
                      key={url + i}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all aspect-square bg-muted ${
                        isPrimary
                          ? 'border-primary ring-2 ring-primary/30 shadow-md'
                          : 'border-border hover:border-foreground/40 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getImageUrl(url) || FALLBACK_PRODUCT_IMAGE}
                        alt={`Draft Image ${i + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                      />
                      
                      {/* Click overlay to set as card cover */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrimary(i);
                          toast.success(`Image #${i + 1} set as main cover`);
                        }}
                        className="absolute inset-0 w-full h-full flex flex-col justify-between p-1.5 bg-black/10 hover:bg-black/20 transition-all text-left"
                      >
                        {isPrimary ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground shadow-sm">
                            <Check className="h-3 w-3" /> Card Cover
                          </span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] font-medium bg-black/70 text-white px-1.5 py-0.5 rounded transition">
                            Set as Cover
                          </span>
                        )}
                      </button>

                      {/* Remove / Omit button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(i);
                        }}
                        title="Omit this image"
                        className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm opacity-90 group-hover:opacity-100 transition z-10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic my-2">No images attached. Upload or paste a URL below.</p>
            )}

            <div className="flex gap-2 mt-3">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Add image URL (https://...)"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" variant="secondary" onClick={addImage}><Plus className="h-4 w-4 mr-1" /> Add URL</Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          {onDelete && draft ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => {
                onOpenChange(false);
                onDelete(draft.id, name || draft.parsed?.name || 'Untitled Draft');
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Draft
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground font-heading" onClick={save} disabled={saving}>
              Save draft
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
