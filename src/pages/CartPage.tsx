import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import { AuthPromptDialog } from '@/components/store/AuthPromptDialog';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const navigate = useNavigate();
  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="font-heading text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
        <Link to="/products"><Button className="gradient-primary text-primary-foreground font-heading">Start Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold mb-8">Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3.5">
          {items.map(item => {
            const { product, quantity, variantKey, size, color, imageUrl } = item;
            return (
              <div key={variantKey} className="flex gap-3 sm:gap-4 p-3.5 sm:p-4 border border-border rounded-lg bg-card">
                <img
                  src={getImageUrl(imageUrl || product.images?.[0]?.url) || FALLBACK_PRODUCT_IMAGE}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-md object-cover shrink-0 bg-muted border border-border/50"
                  onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/products/${product.slug}`} className="font-heading font-semibold text-xs sm:text-sm hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 -mr-1 -mt-1"
                        onClick={() => removeItem(variantKey)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-0.5">{product.category.name}</p>

                    {(size || color) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
                        {color && (
                          <span className="inline-flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded">
                            <span className="h-2.5 w-2.5 rounded-full border border-border shrink-0" style={{ backgroundColor: color.hex }} />
                            <span>{color.name}</span>
                          </span>
                        )}
                        {size && (
                          <span className="bg-muted/60 px-2 py-0.5 rounded font-medium">
                            Size: {size}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity and Price row with clear spacing and alignment */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/40">
                    <div className="flex items-center border border-border rounded-md bg-background/50 h-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 rounded-l-md hover:bg-muted"
                        onClick={() => updateQuantity(variantKey, quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 text-center font-heading font-bold text-xs sm:text-sm select-none">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 rounded-r-md hover:bg-muted"
                        onClick={() => updateQuantity(variantKey, quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-right">
                      <div className="font-heading font-bold text-xs sm:text-sm text-foreground whitespace-nowrap">
                        {formatETB(product.price * quantity)}
                      </div>
                      {quantity > 1 && (
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatETB(product.price)} each
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-lg p-6 h-fit sticky top-24">
          <h2 className="font-heading font-semibold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between font-heading font-bold text-base">
              <span>Total</span><span>{formatETB(total)}</span>
            </div>
          </div>
          <Button 
            className="w-full mt-6 gradient-primary text-primary-foreground font-heading font-semibold" 
            size="lg"
            onClick={() => isAuthenticated ? navigate('/checkout') : setAuthPromptOpen(true)}
          >
            Complete Order
          </Button>
          <Link to="/products" className="block mt-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full font-heading font-bold text-xs sm:text-sm tracking-wider uppercase h-11 rounded-lg border-2 border-foreground/25 hover:border-foreground/60 bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Continue Shopping</span>
            </Button>
          </Link>
        </div>
      </div>
      <AuthPromptDialog open={authPromptOpen} onOpenChange={setAuthPromptOpen} redirectUrl="/checkout" />
    </div>
  );
}
