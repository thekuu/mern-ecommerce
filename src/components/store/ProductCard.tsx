import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { useProductStore } from '@/store/productStore';
import { formatETB } from '@/lib/currency';
import { formatSizesDisplay } from '@/lib/formatSizes';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import type { Product } from '@/types';
import { motion } from 'framer-motion';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const { isInWishlist, toggleItem } = useWishlistStore();
  const prefetchProduct = useProductStore((s) => s.prefetchProduct);
  const wishlisted = isInWishlist(product.id);

  const primaryImage = getImageUrl(product.images?.[0]?.url) || FALLBACK_PRODUCT_IMAGE;
  const secondaryImage = product.images?.[1]?.url ? getImageUrl(product.images[1].url) : null;
  const sizesRange = formatSizesDisplay(product.sizes);

  const handleMouseEnter = () => {
    prefetchProduct(product.slug);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={handleMouseEnter}
      className="group relative bg-card/50 rounded-sm border border-border/40 hover:border-foreground/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between overflow-hidden"
    >
      {/* Badges */}
      {product.compareAtPrice && product.compareAtPrice > product.price && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-destructive text-destructive-foreground text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-sm shadow-sm">
            Sale
          </span>
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleItem(product);
        }}
        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/90 backdrop-blur-md border border-border/50 flex items-center justify-center text-foreground hover:text-destructive hover:scale-110 transition-all duration-300 shadow-sm"
        aria-label="Toggle wishlist"
      >
        <Heart className={`h-3.5 w-3.5 ${wishlisted ? 'fill-destructive text-destructive' : 'text-foreground/70'}`} />
      </button>

      {/* Product Image Container with Studio Framing & Tone Harmonization */}
      <Link
        to={`/products/${product.slug}`}
        onMouseEnter={handleMouseEnter}
        className="relative block aspect-[4/5] sm:aspect-square overflow-hidden bg-gradient-to-b from-stone-100/70 to-stone-200/40 dark:from-muted/30 dark:to-muted/60 p-4 flex items-center justify-center"
      >
        {/* Subtle radial studio vignette backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/70 via-transparent to-black/[0.03] dark:from-white/[0.02] dark:to-black/30 pointer-events-none" />

        {/* Primary Image with warm-toned editorial grading filter & studio containment */}
        <img
          src={primaryImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          className={`relative z-[1] h-full w-full object-contain object-center transition-all duration-700 ease-out will-change-transform filter contrast-[0.98] brightness-[1.02] saturate-[0.96] group-hover:scale-[1.08] ${
            secondaryImage ? 'group-hover:opacity-0' : ''
          }`}
          loading="lazy"
          decoding="async"
          onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
        />

        {/* Secondary Angle Image (Fade-in on Hover if present) */}
        {secondaryImage && (
          <img
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            referrerPolicy="no-referrer"
            className="absolute inset-0 z-[2] h-full w-full object-contain object-center p-4 opacity-0 transition-all duration-700 ease-out filter contrast-[0.98] brightness-[1.02] saturate-[0.96] group-hover:opacity-100 group-hover:scale-[1.08]"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </Link>

      {/* Information Container */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3 min-w-0 bg-card">
        <div className="min-w-0">
          {/* Category & Available Sizes */}
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-2">
            <span className="truncate min-w-0 font-semibold">{product.category?.name || 'Sheg Collection'}</span>
            {sizesRange && (
              <span className="font-medium px-2 py-0.5 rounded-sm bg-muted/60 text-foreground/80 border border-border/40 normal-case tracking-normal shrink-0">
                {sizesRange}
              </span>
            )}
          </div>

          <Link to={`/products/${product.slug}`} onMouseEnter={handleMouseEnter} className="block min-w-0">
            <h3 className="font-heading font-medium text-sm sm:text-base text-foreground group-hover:text-accent transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="pt-3 border-t border-border/30 flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-heading font-bold text-sm sm:text-base tracking-tight text-foreground">
              {formatETB(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-[11px] sm:text-xs text-muted-foreground/70 line-through">
                {formatETB(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
