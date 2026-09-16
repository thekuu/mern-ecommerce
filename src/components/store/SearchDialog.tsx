import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { searchProducts } from '@/lib/api';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import type { Product } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchProducts(query).then(r => { setResults(r); setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = (slug: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(`/products/${slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-12 text-base"
            autoFocus
          />
        </div>
        {(results.length > 0 || loading) && (
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Searching...</p>
            ) : (
              results.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product.slug)}
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <img
                    src={getImageUrl(product.images?.[0]?.url) || FALLBACK_PRODUCT_IMAGE}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-md object-cover"
                    onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatETB(product.price)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
        {query && !loading && results.length === 0 && (
          <p className="text-sm text-muted-foreground p-6 text-center">No products found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
