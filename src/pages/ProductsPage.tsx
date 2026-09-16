import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ProductCard } from '@/components/store/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useCategoryStore } from '@/store/categoryStore';
import { FALLBACK_CATEGORY_IMAGE, handleImageFallback } from '@/lib/images';
import type { Product, ProductFilters } from '@/types';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchProductsWithFilters = useProductStore((s) => s.fetchProductsWithFilters);
  const { categories, fetchCategories } = useCategoryStore();
  const hasSaleItems = useProductStore(s => s.products.some(p => p.onSale || (p.compareAtPrice && p.compareAtPrice > p.price) || p.tags?.includes('sale')));

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const page = Number(searchParams.get('page')) || 1;
  const sortBy = (searchParams.get('sortBy') as ProductFilters['sortBy']) || undefined;
  const category = searchParams.get('category') || undefined;
  const onSale = searchParams.get('sale') === 'true';
  const isFeatured = searchParams.get('featured') === 'true' || searchParams.get('isFeatured') === 'true' || searchParams.get('filter') === 'featured';
  const isNew = searchParams.get('new') === 'true' || searchParams.get('isNew') === 'true' || searchParams.get('filter') === 'new';
  const view = searchParams.get('view');
  const isCategoriesView = view === 'categories';

  useEffect(() => {
    if (isCategoriesView) return;
    let isCurrent = true;

    // Fast-path cached fetch: returns instantly if in cache, fetches in background if stale
    fetchProductsWithFilters({
      page,
      sortBy,
      category,
      onSale,
      isFeatured: isFeatured || undefined,
      isNew: isNew || undefined,
      pageSize: 12,
    }).then((res) => {
      if (!isCurrent) return;
      setProducts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [page, sortBy, category, onSale, isFeatured, isNew, isCategoriesView, fetchProductsWithFilters]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (sortBy) params.set('sortBy', sortBy);
    setSearchParams(params);
  };

  const hasActiveFilters = !!(category || onSale || isFeatured || isNew);

  const toggleCategory = (slug: string) => {
    updateParam('category', category === slug ? '' : slug);
  };

  // ─── Categories overview ───
  if (isCategoriesView) {
    return (
      <div className="container py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-heading mb-2">Categories</h1>
          <p className="text-sm text-muted-foreground">Browse products by category</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={cat.image || FALLBACK_CATEGORY_IMAGE}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
                onError={(e) => handleImageFallback(e, FALLBACK_CATEGORY_IMAGE)}
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-4 text-white">
                <h3 className="font-semibold text-base font-heading">{cat.name}</h3>
                <p className="text-xs text-white/80">{cat.productCount} items</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ─── Product list view ───
  return (
    <div className="container py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading">
            {category
              ? categories.find(c => c.slug === category)?.name || 'Products'
              : onSale
              ? 'Sale Items'
              : isFeatured
              ? 'Featured Products'
              : isNew
              ? 'New Arrivals'
              : 'All Products'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {loading && products.length === 0 ? 'Loading items...' : `${total} items available`}
          </p>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Sort by:</span>
          <Select
            value={sortBy || 'newest'}
            onValueChange={(val) => updateParam('sortBy', val === 'newest' ? '' : val)}
          >
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="Newest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 mb-6 scrollbar-none snap-x">
        <button
          onClick={() => updateParam('category', '')}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border snap-start text-xs sm:text-sm font-medium ${
            !category && !onSale && !isFeatured && !isNew
              ? 'bg-foreground text-background border-foreground shadow-md'
              : 'bg-background text-foreground border-border hover:border-foreground/30 hover:bg-muted'
          }`}
        >
          All Products
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.slug)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border snap-start text-xs sm:text-sm font-medium ${
              category === cat.slug
                ? 'bg-foreground text-background border-foreground shadow-md'
                : 'bg-background text-foreground border-border hover:border-foreground/30 hover:bg-muted'
            }`}
          >
            {cat.name}
          </button>
        ))}
        {hasSaleItems && (
          <button
            onClick={() => updateParam('sale', onSale ? '' : 'true')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border snap-start text-xs sm:text-sm font-medium flex items-center gap-1.5 ${
              onSale
                ? 'bg-destructive text-destructive-foreground border-destructive shadow-md shadow-destructive/20'
                : 'bg-background text-destructive border-border hover:border-destructive/30 hover:bg-destructive/5'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${onSale ? 'bg-destructive-foreground' : 'bg-destructive'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${onSale ? 'bg-destructive-foreground' : 'bg-destructive'}`}></span>
            </span>
            Sale
          </button>
        )}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-full whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium snap-start ml-2 border border-transparent"
          >
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">No products match those filters.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
