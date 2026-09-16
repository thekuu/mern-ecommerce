import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Image as ImageIcon, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTelegramDraft, type TelegramDraft } from '@/lib/api';
import { parseTelegramPostText } from '@/lib/telegramParser';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl as resolveImageUrl, handleImageFallback } from '@/lib/images';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultChannel?: string;
  onCreated: (draft: TelegramDraft) => void;
}

export function QuickPostIngestDialog({ open, onOpenChange, defaultChannel, onCreated }: Props) {
  const [channel, setChannel] = useState(defaultChannel || 'shegaddis_channel');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImageToCloudinary(file, 'shegaddis/products');
        uploadedUrls.push(url);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded to Cloudinary`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload image: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const addImage = () => {
    const v = imageUrl.trim();
    if (!v || images.includes(v)) return;
    setImages([...images, v]);
    setImageUrl('');
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handlePasteSample = (type: 'shoe' | 'cloth' | 'bag') => {
    if (type === 'shoe') {
      setCaption(
        `🔥 Nike Air Jordan Retro High\nEU Sizes: 40, 41, 42, 43, 44\nColors: Triple White, Chicago Red\nPrice: 5600 ETB\nTop quality, cushioned sole. Fast delivery anywhere in Addis Ababa!`
      );
      setImages([
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop',
      ]);
    } else if (type === 'cloth') {
      setCaption(
        `✨ Premium Wool Blend Overcoat & Trouser Set\nSizes: M, L, XL\nColors: Charcoal Gray, Camel Brown\nPrice: 6800 ETB\nTailored fit, high-end finishing for smart casual look.`
      );
      setImages([
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop',
      ]);
    } else {
      setCaption(
        `👜 Genuine Leather Shoulder Bag\nColor: Tan Brown, Matte Black\nPrice: 3900 ETB\nStructured everyday bag with golden brass hardware.`
      );
      setImages([
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop',
      ]);
    }
  };

  const handleCreate = async () => {
    if (!caption.trim()) {
      toast.error('Please paste Telegram caption or post text');
      return;
    }

    setLoading(true);
    try {
      const cleanChan = channel.replace(/^@/, '').trim() || 'telegram_source';
      const parsed = parseTelegramPostText(caption, cleanChan);
      const draft = await createTelegramDraft({
        channel: cleanChan,
        rawCaption: caption,
        images: images.length > 0 ? images : [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop'
        ],
        parsed,
      });

      toast.success(`Parsed "${parsed.name}" from @${cleanChan} successfully!`);
      onCreated(draft);
      onOpenChange(false);
      setCaption('');
      setImages([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to ingest post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Paste Telegram Post / Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <p className="text-xs text-muted-foreground">
            Paste any text caption directly copied from your Telegram channel or post. The AI parser will automatically extract the <strong>product name</strong>, <strong>price in ETB</strong>, <strong>sizes</strong>, <strong>colors</strong>, and <strong>category</strong>.
          </p>

          <div>
            <Label className="text-xs font-semibold uppercase">Channel Handle</Label>
            <Input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="e.g. @your_channel"
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-semibold uppercase">Post Caption / Message Text</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePasteSample('shoe')}
                  className="text-[11px] text-accent hover:underline"
                >
                  + Sample Shoe
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => handlePasteSample('cloth')}
                  className="text-[11px] text-accent hover:underline"
                >
                  + Sample Clothes
                </button>
              </div>
            </div>
            <Textarea
              rows={5}
              placeholder="Paste caption copied from Telegram post (e.g. &#10;🔥 New Arrival Sneaker&#10;Size: 41, 42, 43&#10;Price: 4500 ETB)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase mb-1.5 block">Product Photos</Label>
            
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="https://... image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addImage}>
                <Plus className="h-4 w-4 mr-1" /> Add URL
              </Button>
            </div>

            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 text-accent animate-spin mb-1" />
                  <span className="text-xs font-medium text-foreground">Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-foreground">Upload from device</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP (multiple allowed)</span>
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                disabled={isUploading}
                className="hidden"
                onChange={handleDeviceUpload}
              />
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group w-16 h-16 rounded border overflow-hidden bg-muted">
                    <img
                      src={resolveImageUrl(img) || FALLBACK_PRODUCT_IMAGE}
                      alt="preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !caption.trim()} className="font-heading uppercase text-xs">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Auto-Parse & Ingest Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
