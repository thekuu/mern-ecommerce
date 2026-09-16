import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Clock, Footprints, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/store/ProductCard';
import { useBannerStore } from '@/store/bannerStore';
import { useProductStore } from '@/store/productStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCategoryStore } from '@/store/categoryStore';

const NEW_ARRIVAL_WINDOW_DAYS = 10;

const HERO_IMAGES = [
  {
    id: 'shoes-1',
    url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=2400&auto=format&fit=crop&q=85',
    fallbackUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=2400&auto=format&fit=crop&q=85',
    alt: 'Urban Footwear on Dark Asphalt',
    badge: 'Footwear',
    type: 'shoes' as const,
    titleLine1: 'Footwear & Apparel.',
    titleLine2: 'Wear The Moment.',
    subtitle: 'Specializing in premium sneakers and handpicked clothing. Fast delivery right to your door at your comfort.',
    imageClassName: 'object-[68%_center] sm:object-center',
  },
  {
    id: 'clothes-1',
    url: '/hero-apparel.webp',
    fallbackUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=2400&auto=format&fit=crop&q=85',
    alt: 'Modern Streetwear Apparel',
    badge: 'Modern Apparel',
    type: 'clothes' as const,
    titleLine1: 'Footwear & Apparel.',
    titleLine2: 'Wear The Moment.',
    subtitle: 'Specializing in premium sneakers and handpicked clothing. Fast delivery right to your door at your comfort.',
    imageClassName: 'object-[68%_center] sm:object-center',
  },
  {
    id: 'shoes-2',
    url: '/hero-shoes.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=2400&auto=format&fit=crop&q=85',
    alt: 'Classic Urban Street Footwear',
    badge: 'Sneakers & Shoes',
    type: 'shoes' as const,
    titleLine1: 'Footwear & Apparel.',
    titleLine2: 'Delivered in Addis.',
    subtitle: 'Specializing in premium sneakers and handpicked clothing. Fast delivery right to your door at your comfort.',
    imageClassName: 'object-[68%_center] sm:object-center',
  },
];

function useRowSize() {
  const [count, setCount] = useState(4);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 640) return 2;
      if (w < 1024) return 3;
      if (w < 1536) return 4;
      return 5;
    };
    const update = () => setCount(compute());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return count;
}

export default function HomePage() {
  const { banner, fetchBanner } = useBannerStore();
  const { products, fetchProducts } = useProductStore();
  const { fetchSettings, heroImage, heroImage2, heroImage3, mobileHeroImage, mobileHeroImage2, mobileHeroImage3 } = useSettingsStore();
  const { categories, fetchCategories } = useCategoryStore();
  const rowSize = useRowSize();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamically inject custom hero images from settings if available
  const activeHeroImages = HERO_IMAGES.map((img, idx) => {
    let url = img.url;
    let mobileUrl = img.url; // fallback to desktop
    if (idx === 0) {
      if (heroImage) url = heroImage;
      if (mobileHeroImage) mobileUrl = mobileHeroImage;
      else if (heroImage) mobileUrl = heroImage;
    }
    if (idx === 1) {
      if (heroImage2) url = heroImage2;
      if (mobileHeroImage2) mobileUrl = mobileHeroImage2;
      else if (heroImage2) mobileUrl = heroImage2;
    }
    if (idx === 2) {
      if (heroImage3) url = heroImage3;
      if (mobileHeroImage3) mobileUrl = mobileHeroImage3;
      else if (heroImage3) mobileUrl = heroImage3;
    }
    return { ...img, url, mobileUrl };
  });

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % activeHeroImages.length);
  }, [activeHeroImages.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + activeHeroImages.length) % activeHeroImages.length);
  }, [activeHeroImages.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Auto-play timer (advances every 5.5s unless hovered)
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, isPaused]);

  useEffect(() => {
    fetchProducts();
    fetchBanner();
    fetchSettings();
    fetchCategories();
  }, [fetchProducts, fetchBanner, fetchSettings, fetchCategories]);

  const newArrivalsTargetCount = rowSize * 2;
  const featuredTargetCount = Math.min(rowSize * 2, 8);

  const cutoff = Date.now() - NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  // Exclude products marked as featured from the new arrivals prelist section
  let recent = products
    .filter((p) => p.isNew && !p.isFeatured && new Date(p.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // If items within the 14-day window are fewer than 2 full rows, include other new or recently imported non-featured items
  if (recent.length < newArrivalsTargetCount) {
    const additionalNew = products
      .filter((p) => !p.isFeatured && !recent.some((r) => r.id === p.id) && (p.isNew || p.tags?.includes('telegram-import')))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    recent = [...recent, ...additionalNew];
  }

  // If still fewer than 2 rows, fill with other latest non-featured catalog items so up to two rows are cleanly displayed
  if (recent.length < newArrivalsTargetCount) {
    const remaining = products
      .filter((p) => !p.isFeatured && !recent.some((r) => r.id === p.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    recent = [...recent, ...remaining];
  }

  // If still fewer than targetCount, supplement with any remaining catalog items
  if (recent.length < newArrivalsTargetCount) {
    const allRemaining = products
      .filter((p) => !recent.some((r) => r.id === p.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    recent = [...recent, ...allRemaining];
  }

  // Display exactly 2 full rows based on responsive column layout (4, 6, 8, or 10 items)
  const newArrivals = recent.slice(0, newArrivalsTargetCount);

  // Featured prelist on Home: explicitly check isFeatured
  const featured = products.filter((p) => p.isFeatured);
  const totalFeaturedCount = featured.length;
  const totalNewCount = products.filter((p) => p.isNew).length;

  // Do NOT auto-fill the featured section if the admin hasn't explicitly featured anything
  // If there are featured items, just show them up to the target count
  const featuredDisplay = featured.slice(0, featuredTargetCount);

  const now = new Date().toISOString().split('T')[0];
  const isBannerActive =
    banner.enabled &&
    (!banner.startDate || banner.startDate <= now) &&
    (!banner.endDate || banner.endDate >= now);

  return (
    <div className="flex flex-col gap-12 sm:gap-16 md:gap-24 pb-20 w-full overflow-x-hidden">
      {/* Premium Split Hero */}
      <section className="relative w-full min-h-[85vh] flex flex-col lg:flex-row bg-zinc-950 overflow-hidden">
        {/* Left Content Column */}
        <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-20 lg:pt-20 lg:pb-32 border-r border-white/10">
          <div className="flex flex-col items-start max-w-xl pb-12 lg:pb-0 w-full">
            <div className="mb-6 lg:mb-10 min-h-[32px] flex items-center relative w-full">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={activeHeroImages[currentSlide].badge}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2 px-3 py-1.5 border border-white/20 rounded-full text-[10px] uppercase tracking-[0.2em] font-medium text-white/80 w-fit"
                >
                  {activeHeroImages[currentSlide].type === 'clothes' ? (
                    <Shirt className="h-3.5 w-3.5" />
                  ) : (
                    <Footprints className="h-3.5 w-3.5" />
                  )}
                  {activeHeroImages[currentSlide].badge}
                </motion.div>
              </AnimatePresence>
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] text-white flex flex-col w-full relative">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={activeHeroImages[currentSlide].titleLine1}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="block w-full origin-left"
                >
                  {activeHeroImages[currentSlide].titleLine1}
                </motion.span>
              </AnimatePresence>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={activeHeroImages[currentSlide].titleLine2}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-zinc-500 2xl:whitespace-nowrap block w-full origin-left mt-1"
                >
                  {activeHeroImages[currentSlide].titleLine2}
                </motion.span>
              </AnimatePresence>
            </h1>

            <div className="mt-6 relative w-full min-h-[56px]">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={activeHeroImages[currentSlide].subtitle}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-base lg:text-lg text-zinc-400 font-light leading-relaxed max-w-md w-full origin-left"
                >
                  {activeHeroImages[currentSlide].subtitle}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto relative z-20">
              <Link to={`/products?category=${activeHeroImages[currentSlide].type}`} className="w-full sm:w-auto flex">
                <Button size="lg" className="w-full bg-white text-black hover:bg-zinc-200 font-semibold uppercase tracking-widest text-xs px-8 h-14 rounded-none transition-transform hover:scale-[1.02]">
                  Shop Collection
                </Button>
              </Link>
              <Link to="/products" className="w-full sm:w-auto flex">
                <Button variant="outline" size="lg" className="w-full bg-transparent border-white/20 text-white hover:bg-white hover:text-black font-semibold uppercase tracking-widest text-xs px-8 h-14 rounded-none transition-colors">
                  Explore All
                </Button>
              </Link>
            </div>

            {/* Mobile Trust Badges */}
            <div className="flex lg:hidden flex-col gap-4 mt-12 w-full border-t border-white/10 pt-8 relative z-20">
              <div className="flex items-center gap-4 text-white">
                <Truck className="h-5 w-5 text-zinc-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Free Delivery</span>
                  <span className="text-[10px] text-zinc-500">Addis Ababa Area</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-white">
                <ShieldCheck className="h-5 w-5 text-zinc-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Pay on Arrival</span>
                  <span className="text-[10px] text-zinc-500">Cash or Transfer</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-white">
                <Clock className="h-5 w-5 text-zinc-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">24-48h Delivery</span>
                  <span className="text-[10px] text-zinc-500">Fast routing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Navigation (Bottom Left) */}
          <div className="absolute bottom-8 left-6 sm:left-12 lg:left-20 flex items-center gap-6 hidden lg:flex">
            <div className="flex gap-2">
              {activeHeroImages.map((img, idx) => (
                <button
                  key={`dot-${img.id}`}
                  onClick={() => goToSlide(idx)}
                  className="group py-2 flex items-center justify-center"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <div className={`transition-all duration-500 rounded-full ${
                    idx === currentSlide ? 'w-8 h-1 bg-white' : 'w-2 h-1 bg-white/20 group-hover:bg-white/50'
                  }`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2 text-white/50">
               <button onClick={prevSlide} className="p-2 hover:text-white transition-colors">
                 <ChevronLeft className="h-5 w-5" />
               </button>
               <button onClick={nextSlide} className="p-2 hover:text-white transition-colors">
                 <ChevronRight className="h-5 w-5" />
               </button>
            </div>
          </div>
        </div>

        {/* Right Image Column */}
        <div 
          className="relative w-full lg:w-1/2 h-[60vh] lg:h-auto overflow-hidden bg-zinc-900"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Mobile Overlay Nav */}
          <div className="absolute bottom-6 left-6 z-20 flex lg:hidden items-center gap-6">
            <div className="flex gap-2">
              {activeHeroImages.map((img, idx) => (
                <button
                  key={`dot-mob-${img.id}`}
                  onClick={() => goToSlide(idx)}
                  className="group py-2 flex items-center justify-center"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <div className={`transition-all duration-500 rounded-full ${
                    idx === currentSlide ? 'w-8 h-1 bg-white shadow-sm' : 'w-2 h-1 bg-white/40 shadow-sm'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {activeHeroImages.map((img, idx) => (
            <div
              key={img.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <picture>
                <source media="(max-width: 1023px)" srcSet={img.mobileUrl} />
                <source media="(min-width: 1024px)" srcSet={img.url} />
                <img
                  src={img.url}
                  alt={img.alt}
                  width={1200}
                  height={1200}
                  referrerPolicy="no-referrer"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  onError={(e) => {
                    if (img.fallbackUrl && e.currentTarget.src !== img.fallbackUrl) {
                      e.currentTarget.src = img.fallbackUrl;
                    }
                  }}
                  className={`h-full w-full object-cover ${
                    img.imageClassName || 'object-center'
                  } transition-transform duration-[15000ms] ease-out ${
                    idx === currentSlide ? 'scale-110' : 'scale-100'
                  }`}
                />
              </picture>
              <div className="absolute inset-0 bg-black/10 lg:bg-black/0" />
            </div>
          ))}
          
          {/* Trust Badges over image on Desktop */}
          <div className="absolute right-6 bottom-6 lg:right-8 lg:bottom-8 z-20 hidden lg:flex flex-col gap-3">
             <div className="backdrop-blur-md bg-black/40 border border-white/10 px-5 py-4 flex items-center gap-4 text-white hover:bg-black/60 transition-colors cursor-default">
                <Truck className="h-5 w-5 text-white/70" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Free Delivery</span>
                  <span className="text-[10px] text-white/60">Addis Ababa Area</span>
                </div>
             </div>
             <div className="backdrop-blur-md bg-black/40 border border-white/10 px-5 py-4 flex items-center gap-4 text-white hover:bg-black/60 transition-colors cursor-default">
                <ShieldCheck className="h-5 w-5 text-white/70" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Pay on Arrival</span>
                  <span className="text-[10px] text-white/60">Cash or Transfer</span>
                </div>
             </div>
             <div className="backdrop-blur-md bg-black/40 border border-white/10 px-5 py-4 flex items-center gap-4 text-white hover:bg-black/60 transition-colors cursor-default">
                <Clock className="h-5 w-5 text-white/70" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">24-48h Delivery</span>
                  <span className="text-[10px] text-white/60">Fast routing</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Categories: THE COLLECTION */}
      <section className="container pt-16 md:pt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 md:mb-14">
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2 block">Categories</span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">THE COLLECTION</h2>
          </div>
          <Link to="/products" className="text-[11px] uppercase tracking-[0.15em] font-semibold hover:text-muted-foreground transition-colors flex items-center gap-2 group pb-1 border-b border-transparent hover:border-foreground">
            Explore Full Catalog <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className={`grid gap-4 sm:gap-6 md:gap-8 ${categories.length === 1 ? 'grid-cols-1 max-w-2xl' : categories.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {categories.map((cat) => {
            const fallbackImg = cat.slug === 'shoes'
              ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&h=1200&fit=crop'
              : 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop';
            const coverImg = cat.image || fallbackImg;

            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group relative aspect-[4/5] md:aspect-[3/4] rounded-sm overflow-hidden bg-muted border border-border"
              >
                <img
                  src={coverImg}
                  alt={`${cat.name} Collection`}
                  referrerPolicy="no-referrer" loading="lazy" decoding="async"
                  className="h-full w-full object-cover group-hover:scale-[1.05] transition-transform duration-1000 ease-out filter brightness-[0.85] contrast-[1.05]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImg;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-500 opacity-80 group-hover:opacity-100" />
                <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end text-white">
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                    <h3 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight mb-2">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs md:text-sm text-white/70 line-clamp-2 max-w-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-6 overflow-hidden">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] font-semibold text-white/90 transform translate-y-[150%] group-hover:translate-y-0 transition-transform duration-500 delay-150 pb-1 border-b border-white/30">
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* New Arrivals with responsive 1-row pagination & 14-day cutoff */}
      {newArrivals.length > 0 && (
        <section className="container pt-16 md:pt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 md:mb-14">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold block">Just In</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">New Arrivals</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          <div className="mt-12 md:mt-16 flex justify-center w-full">
            <Link to="/products?filter=new" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold gap-3 px-12 h-14 rounded-none border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group shadow-sm">
                View All ({totalNewCount}) <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Promo Announcement Banner */}
      {isBannerActive && (
        <section className="container pt-16 md:pt-24">
          <div className="relative overflow-hidden rounded bg-zinc-950 text-white p-8 sm:p-12 md:p-16 lg:p-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 sm:gap-12 shadow-2xl">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
            <div className="max-w-2xl relative z-10">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-white/70 font-bold mb-3 block">Special Campaign</span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                {banner.title}
              </h2>
              <p className="text-white/70 text-sm md:text-base mt-4 sm:mt-6 leading-relaxed max-w-xl">
                {banner.description}
              </p>
            </div>
            <Link to={banner.linkUrl || '/products?sortBy=newest'} className="w-full sm:w-auto relative z-10 shrink-0">
              <Button size="lg" className="w-full sm:w-auto bg-white text-zinc-950 hover:bg-white/90 text-[11px] sm:text-xs tracking-[0.15em] uppercase font-bold px-10 h-14 rounded-none transition-transform active:scale-95 shadow-lg">
                {banner.buttonText || 'Shop Collection'}
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Featured Products - Only show if there are explicitly featured items */}
      {featuredDisplay.length > 0 && (
        <section className="container pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 md:mb-14">
            <div>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2 block">Handpicked</span>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Featured Essentials</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {featuredDisplay.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-12 md:mt-16 flex justify-center w-full">
            <Link to="/products?filter=featured" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold gap-3 px-12 h-14 rounded-none border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-300 group shadow-sm">
                Browse All ({totalFeaturedCount}) <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
