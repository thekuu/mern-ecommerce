import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '@/types';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: { name: string; slug: string; description?: string; image?: string }) => Promise<void>;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function CategoryFormDialog({ open, onOpenChange, category, onSave }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setSlug(category.slug || '');
      setDescription(category.description || '');
      setImage(category.image || '');
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setImage('https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop');
    }
  }, [category, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const file = files[0];
      const downloadUrl = await uploadImageToCloudinary(file, 'shegaddis/categories');
      setImage(downloadUrl);
      toast.success('Cover image uploaded successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload image: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    const finalSlug = slug.trim() ? slugify(slug) : slugify(name);
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        slug: finalSlug,
        description: description.trim(),
        image: image.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {category ? `Edit Category: ${category.name}` : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Clothes, Shoes, Bags, Accessories"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!category && (!slug || slug === slugify(name))) {
                  setSlug(slugify(e.target.value));
                }
              }}
              required
            />
          </div>

          <div>
            <Label htmlFor="cat-slug">URL Slug</Label>
            <Input
              id="cat-slug"
              placeholder="e.g. clothes"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Used in routes: /products?category={slug || 'slug'}</p>
          </div>

          <div>
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              rows={2}
              placeholder="Brief tagline or description of this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Cover Image URL / Upload</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="shrink-0"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Preview Banner */}
            {image && (
              <div className="relative aspect-[16/9] w-full rounded-md overflow-hidden border border-border mt-2 bg-muted">
                <img
                  src={image}
                  alt="Category Cover Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs mb-1 inline-block">
                    Live Cover Preview
                  </span>
                  <p className="font-heading font-bold text-lg">{name || 'Category Name'}</p>
                  <p className="text-xs text-white/80 line-clamp-1">{description || 'Category description preview...'}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading} className="gradient-primary text-primary-foreground">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {category ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
