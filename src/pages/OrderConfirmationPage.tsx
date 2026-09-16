import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Banknote,
  ShieldCheck,
  PackageCheck,
  PhoneCall,
  ShoppingBag,
  Home,
  Copy,
  Check,
  Truck,
  ReceiptText,
} from 'lucide-react';
import { getOrderById } from '@/lib/api';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, handleImageFallback } from '@/lib/images';
import { toast } from 'sonner';
import type { Order } from '@/types';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || `HC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orderNumber) {
      getOrderById(orderNumber)
        .then((data) => {
          if (data) setOrder(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderNumber]);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    toast.success('Order number copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container py-10 max-w-2xl text-center">
      {/* Success Badge & Animated Header */}
      <div className="flex justify-center mb-5">
        <div className="h-20 w-20 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10 animate-in zoom-in-75 duration-300">
          <CheckCircle2 className="h-11 w-11 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/15 px-3 py-1 rounded-full mb-3">
        <Truck className="h-3.5 w-3.5" />
        Order Confirmed & Delivery Scheduled
      </div>

      <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2 text-foreground">
        Thank You for Your Order!
      </h1>
      <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed mb-6">
        We have successfully received your order and reserved your scheduled delivery window.
      </p>

      {/* Order Reference Pill */}
      <div className="inline-flex items-center gap-2 p-2 px-4 rounded-lg bg-card border border-border text-sm mb-6 shadow-xs">
        <span className="text-muted-foreground text-xs font-medium">Order Reference:</span>
        <span className="font-mono font-bold text-foreground">{orderNumber}</span>
        <button
          type="button"
          onClick={handleCopyOrderNumber}
          className="ml-1 p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
          title="Copy order number"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Main Order Details Card */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 text-left shadow-xs mb-6 space-y-5">
        {/* Delivery Schedule Section */}
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="font-heading font-semibold text-sm sm:text-base text-foreground">Delivery Schedule</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-foreground">
              {order?.deliveryDate || 'Scheduled Date'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Delivery Window</span>
              <p className="text-foreground font-semibold text-sm flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {order?.deliveryTimeSlot || 'Selected Delivery Window'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Destination Address</span>
              <p className="text-foreground font-semibold text-sm flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {order?.subcity || 'Addis Ababa'}{order?.street ? `, ${order.street}` : ''}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Ordered Items Summary if available */}
        {order?.items && order.items.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ReceiptText className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold text-sm text-foreground">Items Ordered ({order.items.length})</h3>
            </div>
            <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded object-cover border border-border shrink-0"
                        onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted border border-border flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{item.productName}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Qty: {item.quantity} {item.size ? `· Size ${item.size}` : ''} {item.colorName ? `· ${item.colorName}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-foreground shrink-0">{formatETB(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="p-3 bg-muted/40 flex justify-between items-center text-xs font-semibold">
                <span>Total Amount</span>
                <span className="text-sm font-bold text-foreground">{formatETB(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment on Delivery Notice */}
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-300">
            <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Payment on Delivery (Cash or Mobile Banking)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
            You can inspect your items before completing payment with cash, Telebirr, CBE Birr, or mobile transfer.
          </p>
        </div>

        {/* Driver Contact Notice */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
          <PhoneCall className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Our delivery courier will contact you {order?.customerPhone ? `at ${order.customerPhone}` : 'by phone'} prior to arrival.</span>
        </div>
      </div>

      {/* Action Buttons: Return to Home + View Orders + Continue Shopping */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
        <Button
          className="gradient-primary text-primary-foreground font-heading font-semibold h-11 shadow-sm gap-2"
          asChild
        >
          <Link to="/">
            <Home className="h-4 w-4" /> Return to Home Page
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-11 gap-2">
          <Link to="/profile">
            <PackageCheck className="h-4 w-4" /> View My Orders
          </Link>
        </Button>

        <Button variant="ghost" asChild className="h-11 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/products">
            <ShoppingBag className="h-4 w-4" /> Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-8">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>ShegAddis Addis Ababa Delivery Guarantee</span>
      </div>
    </div>
  );
}
