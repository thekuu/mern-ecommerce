import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductBySlug, getProductReviews } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductStore } from '@/store/productStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/store/ProductCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Heart, Minus, Plus, ShoppingCart, ShoppingBag, ChevronLeft, ChevronRight, Check, ArrowRight, Ruler } from 'lucide-react';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import { toast } from 'sonner';
import type { Product, ProductColor, Review } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthPromptDialog } from '@/components/store/AuthPromptDialog';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>();
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const addItem = useCartStore(s => s.addItem);
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { products: allProducts, fetchProducts, getProduct } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!slug) return;
    setAddedToCart(false);
    setSelectedSize(undefined);
    setSelectedColor(undefined);
    setSelectedImage(0);

    let isMounted = true;

    // First check instant cached result
    getProduct(slug).then((p) => {
      if (!isMounted) return;
      if (p) {
        setProduct(p);
        if (p.colors && p.colors.length > 0) setSelectedColor(p.colors[0]);
        setLoading(false);
        getProductReviews(p.id).then((revs) => {
          if (isMounted) setReviews(revs);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [slug, getProduct]);

  if (loading) {
    return (
      <div className="container py-8 grid md:grid-cols-2 gap-10">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-2xl font-bold mb-4">Product Not Found</h1>
        <Link to="/products"><Button>Back to Products</Button></Link>
      </div>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const requiresSize = !!product.sizes?.length;
  const requiresColor = !!product.colors?.length;

  // Strictly filter related products in the same category (shoes for shoes, clothes for clothes)
  const isShoe = product.category?.slug === 'shoes' || product.categoryId === 'cat-shoes' || product.name.toLowerCase().includes('shoe') || product.name.toLowerCase().includes('sneaker') || product.name.toLowerCase().includes('boot');
  
  const finalRelated = allProducts
    .filter(p => {
      if (p.id === product.id) return false;
      const isPShoe = p.category?.slug === 'shoes' || p.categoryId === 'cat-shoes' || p.name.toLowerCase().includes('shoe') || p.name.toLowerCase().includes('sneaker') || p.name.toLowerCase().includes('boot');
      
      if (isShoe) {
        return isPShoe || p.category?.slug === 'shoes' || p.categoryId === 'cat-shoes';
      } else {
        return !isPShoe && (p.category?.slug === 'clothes' || p.categoryId === 'cat-clothes' || p.categoryId === product.categoryId || p.category?.slug === product.category?.slug);
      }
    })
    .slice(0, 4);

  const handleAddToCart = () => {
    if (requiresSize && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (requiresColor && !selectedColor) {
      toast.error('Please select a color');
      return;
    }
    addItem(product, quantity, { 
      size: selectedSize, 
      color: selectedColor,
      imageUrl: product.images?.[selectedImage]?.url 
    });
    toast.success(`${product.name} added to cart`);
    setAddedToCart(true);
  };

  return (
    <div className="container py-4 sm:py-8 max-w-full overflow-x-hidden">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link to="/products" className="hover:text-foreground transition-colors">Products</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        {product.category?.name && (
          <>
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-foreground transition-colors">
              {product.category.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          </>
        )}
        <span className="text-foreground font-medium truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3 sm:space-y-4 min-w-0 w-full">
          {/* Main Stage Image with uncropped object-contain and studio framing */}
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-b from-stone-100/90 to-stone-200/70 dark:from-muted/40 dark:to-muted/70 border border-border/70 p-3 sm:p-6 md:p-8 flex items-center justify-center select-none">
            <img 
              src={getImageUrl(product.images?.[selectedImage]?.url) || FALLBACK_PRODUCT_IMAGE} 
              alt={product.name} 
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain filter contrast-[0.98] brightness-[1.02] saturate-[0.96] transition-all duration-300 pointer-events-none" 
              onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
            />

            {/* Carousel navigation arrows - hidden on mobile for clean full-width viewing, visible on desktop/tablet */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length)}
                  className="hidden sm:flex absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/80 text-foreground items-center justify-center shadow-md hover:bg-background active:scale-95 transition-all z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImage((prev) => (prev + 1) % product.images.length)}
                  className="hidden sm:flex absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/80 text-foreground items-center justify-center shadow-md hover:bg-background active:scale-95 transition-all z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[11px] text-white font-medium tracking-wide z-10 shadow-xs">
                  {selectedImage + 1} of {product.images.length}
                </div>
              </>
            )}
          </div>

          {/* Related / Alternate Angles Gallery Carousel - Smooth Horizontal Scroll for ANY number of images */}
          {product.images.length > 1 && (
            <div className="w-full min-w-0">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  All Angles & Views ({product.images.length})
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  Swipe for more →
                </span>
              </div>
              
              <div className="relative w-full">
                <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 px-0.5 no-scrollbar scroll-smooth w-full">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => setSelectedImage(i)}
                      className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all p-1 bg-gradient-to-b from-stone-100/60 to-stone-200/40 dark:from-muted/20 dark:to-muted/40 ${
                        i === selectedImage
                          ? 'border-primary ring-2 ring-primary/20 scale-100 shadow-xs'
                          : 'border-border/60 hover:border-foreground/40 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={getImageUrl(img.url) || FALLBACK_PRODUCT_IMAGE} 
                        alt={img.alt || `${product.name} angle ${i + 1}`} 
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain" 
                        onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{product.category.name}</Badge>
            {product.isNew && <Badge className="gradient-primary border-0 text-primary-foreground text-xs">NEW</Badge>}
            {product.isFeatured && (
              <Badge variant="outline" className="text-xs">
                Featured
              </Badge>
            )}
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 text-foreground break-words">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-5 flex-wrap">
            <span className="font-heading text-2xl sm:text-3xl font-bold">{formatETB(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-base sm:text-lg text-muted-foreground line-through">{formatETB(product.compareAtPrice)}</span>
            )}
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                Save {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-5">{product.description}</p>
          )}

          {/* Color selector */}
          {requiresColor && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Color</p>
                <p className="text-xs font-medium text-foreground">{selectedColor?.name ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.colors!.map(c => {
                  const active = selectedColor?.name === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c)}
                      aria-label={c.name}
                      className={`h-9 w-9 rounded-full border-2 transition-all ${active ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-border/80 hover:border-foreground/40'}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size selector & Size Guide (100% visible on mobile, no clipping) */}
          {requiresSize && (
            <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Select Size</p>
                  {selectedSize && (
                    <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/15 rounded-sm">
                      {selectedSize}
                    </span>
                  )}
                </div>
                
                {/* Size Guide Action Button - Always 100% visible on mobile with pill accent */}
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/25 border border-primary/30 rounded-md px-2.5 py-1 transition-all shadow-xs shrink-0"
                >
                  <Ruler className="h-3.5 w-3.5 shrink-0" />
                  <span>Size Guide</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes!.map(s => {
                  const active = selectedSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[3.25rem] px-3 h-10 text-sm font-semibold rounded-md border transition-all ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                          : 'border-border bg-card hover:border-foreground/40 text-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart / Post-add options */}
          <AnimatePresence mode="wait">
            {!addedToCart ? (
              <motion.div
                key="add-to-cart"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2.5 sm:gap-3.5 mb-4 w-full"
              >
                <div className="flex items-center border border-border rounded-lg bg-card h-12 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-9 rounded-l-lg hover:bg-muted"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-heading font-bold text-sm select-none">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-9 rounded-r-lg hover:bg-muted"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="flex-1 gradient-primary text-primary-foreground font-heading font-semibold text-xs sm:text-sm tracking-wider uppercase h-12 rounded-lg shadow-sm active:scale-[0.99] transition-transform"
                  disabled={product.stock === 0}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4 shrink-0" />
                  <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-lg border-border hover:bg-muted active:scale-95 transition-all"
                  onClick={() => toggleItem(product)}
                  aria-label="Save to wishlist"
                >
                  <Heart className={`h-5 w-5 ${wishlisted ? 'fill-destructive text-destructive' : 'text-foreground/80'}`} />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="post-add"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-5 space-y-3 w-full"
              >
                {/* Visual feedback banner */}
                <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm">
                  <div className="h-5 w-5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0 font-medium truncate">
                    <span className="font-semibold">Added to cart:</span> {quantity}x {product.name}
                    {selectedSize ? ` (${selectedSize})` : ''}
                    {selectedColor ? ` · ${selectedColor.name}` : ''}
                  </div>
                </div>

                {/* Full-width ergonomic mobile action buttons (side-by-side on sm+ screens) */}
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full">
                  <Button
                    size="lg"
                    className="w-full sm:flex-1 gradient-primary text-primary-foreground font-heading font-semibold text-xs sm:text-sm tracking-wider uppercase h-12 rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAuthPromptOpen(true);
                      } else {
                        navigate('/checkout');
                      }
                    }}
                  >
                    <span>Complete Order</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:flex-1 font-heading font-bold text-xs sm:text-sm tracking-wider uppercase h-12 rounded-lg border-2 border-foreground/30 hover:border-foreground/70 bg-secondary/90 hover:bg-secondary text-foreground flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all"
                    onClick={() => { setAddedToCart(false); setQuantity(1); }}
                  >
                    <ShoppingBag className="h-4 w-4 shrink-0 text-foreground" />
                    <span>Continue Shopping</span>
                  </Button>
                </div>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => navigate('/cart')}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors font-medium"
                  >
                    Or view full shopping cart
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>

      {/* Related Products Section */}
      {finalRelated.length > 0 && (
        <section className="mt-16 sm:mt-20 pt-10 border-t border-border">
          <div className="flex items-end justify-between mb-6 pb-2">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Explore More</span>
              <h2 className="font-heading text-xl sm:text-2xl font-bold mt-0.5">Related Products</h2>
            </div>
            <Link to="/products" className="text-xs uppercase tracking-wider font-semibold hover:underline flex items-center gap-1">
              View Catalog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 md:gap-6">
            {finalRelated.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Dialog */}
      <AuthPromptDialog open={authPromptOpen} onOpenChange={setAuthPromptOpen} redirectUrl="/checkout" />
      <Dialog open={isSizeGuideOpen} onOpenChange={setIsSizeGuideOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="text-left pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-primary" />
              <DialogTitle className="font-heading text-lg sm:text-xl font-bold">
                {product.category?.slug === 'shoes' ? 'Footwear Size Guide' : 'Apparel & Sizing Guide'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Standard measurements for Ethiopian and international fits.
            </DialogDescription>
          </DialogHeader>

          {product.category?.slug === 'shoes' ? (
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-muted-foreground">
                All shoe sizes are listed in standard EU sizing. If you are between sizes, we recommend ordering half a size up.
              </p>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/80 border-b border-border">
                      <th className="p-2.5 font-semibold">EU (Addis)</th>
                      <th className="p-2.5 font-semibold">US Men</th>
                      <th className="p-2.5 font-semibold">UK</th>
                      <th className="p-2.5 font-semibold">CM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr><td className="p-2.5 font-medium">39</td><td className="p-2.5 text-muted-foreground">6.5</td><td className="p-2.5 text-muted-foreground">6.0</td><td className="p-2.5 text-muted-foreground">24.5</td></tr>
                    <tr><td className="p-2.5 font-medium">40</td><td className="p-2.5 text-muted-foreground">7.5</td><td className="p-2.5 text-muted-foreground">6.5</td><td className="p-2.5 text-muted-foreground">25.0</td></tr>
                    <tr><td className="p-2.5 font-medium">41</td><td className="p-2.5 text-muted-foreground">8.0</td><td className="p-2.5 text-muted-foreground">7.0</td><td className="p-2.5 text-muted-foreground">26.0</td></tr>
                    <tr><td className="p-2.5 font-medium">42</td><td className="p-2.5 text-muted-foreground">8.5</td><td className="p-2.5 text-muted-foreground">7.5</td><td className="p-2.5 text-muted-foreground">26.5</td></tr>
                    <tr><td className="p-2.5 font-medium">43</td><td className="p-2.5 text-muted-foreground">9.5</td><td className="p-2.5 text-muted-foreground">8.5</td><td className="p-2.5 text-muted-foreground">27.5</td></tr>
                    <tr><td className="p-2.5 font-medium">44</td><td className="p-2.5 text-muted-foreground">10.0</td><td className="p-2.5 text-muted-foreground">9.0</td><td className="p-2.5 text-muted-foreground">28.0</td></tr>
                    <tr><td className="p-2.5 font-medium">45</td><td className="p-2.5 text-muted-foreground">11.0</td><td className="p-2.5 text-muted-foreground">10.0</td><td className="p-2.5 text-muted-foreground">29.0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-muted-foreground">
                Apparel measurements in centimeters (cm). Fits are standard modern fit.
              </p>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/80 border-b border-border">
                      <th className="p-2.5 font-semibold">Size</th>
                      <th className="p-2.5 font-semibold">Chest (cm)</th>
                      <th className="p-2.5 font-semibold">Length (cm)</th>
                      <th className="p-2.5 font-semibold">Shoulder (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr><td className="p-2.5 font-medium">S</td><td className="p-2.5 text-muted-foreground">96-100</td><td className="p-2.5 text-muted-foreground">69</td><td className="p-2.5 text-muted-foreground">44</td></tr>
                    <tr><td className="p-2.5 font-medium">M</td><td className="p-2.5 text-muted-foreground">101-106</td><td className="p-2.5 text-muted-foreground">71</td><td className="p-2.5 text-muted-foreground">46</td></tr>
                    <tr><td className="p-2.5 font-medium">L</td><td className="p-2.5 text-muted-foreground">107-112</td><td className="p-2.5 text-muted-foreground">73</td><td className="p-2.5 text-muted-foreground">48</td></tr>
                    <tr><td className="p-2.5 font-medium">XL</td><td className="p-2.5 text-muted-foreground">113-118</td><td className="p-2.5 text-muted-foreground">75</td><td className="p-2.5 text-muted-foreground">50</td></tr>
                    <tr><td className="p-2.5 font-medium">XXL</td><td className="p-2.5 text-muted-foreground">119-124</td><td className="p-2.5 text-muted-foreground">77</td><td className="p-2.5 text-muted-foreground">52</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2 text-center sm:text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSizeGuideOpen(false)}
              className="text-xs uppercase tracking-wider font-medium"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
