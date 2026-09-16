import { Link } from 'react-router-dom';
import { useWishlistStore } from '@/store/wishlistStore';
import { ProductCard } from '@/components/store/ProductCard';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function WishlistPage() {
  const items = useWishlistStore(s => s.items);

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">Your Wishlist is Empty</h1>
        <p className="text-muted-foreground mb-6">Save items you love for later.</p>
        <Link to="/products"><Button className="gradient-primary text-primary-foreground font-heading">Browse Products</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold mb-8">Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
