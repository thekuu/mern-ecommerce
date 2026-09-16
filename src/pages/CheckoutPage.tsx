import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useOrderStore } from '@/store/orderStore';
import { createOrder } from '@/lib/api';
import {
  LogIn,
  Truck,
  Calendar,
  Clock,
  Sunrise,
  Sun,
  Sunset,
  CheckCircle2,
  ShieldCheck,
  PhoneCall,
  CalendarDays,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';

const ADDIS_SUBCITIES = [
  'Bole',
  'Kirkos',
  'Yeka',
  'Arada',
  'Lideta',
  'Nifas Silk-Lafto',
  'Kolfe Keranio',
  'Gulele',
  'Akaky Kaliti',
  'Addis Ketema',
  'Lemi Kura',
];

interface TimeSlotOption {
  id: string;
  label: string;
  timeRange: string;
  startHour: number; // 24-hr format (e.g. 9 for 9 AM, 13 for 1 PM, 16 for 4 PM)
  endHour: number;
  icon: React.ComponentType<{ className?: string }>;
}

const TIME_SLOTS: TimeSlotOption[] = [
  {
    id: 'morning',
    label: 'Morning',
    timeRange: '9:00 AM – 12:00 PM',
    startHour: 9,
    endHour: 12,
    icon: Sunrise,
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    timeRange: '1:00 PM – 4:00 PM',
    startHour: 13,
    endHour: 16,
    icon: Sun,
  },
  {
    id: 'evening',
    label: 'Evening',
    timeRange: '4:00 PM – 7:00 PM',
    startHour: 16,
    endHour: 19,
    icon: Sunset,
  },
  {
    id: 'flexible',
    label: 'Flexible Anytime',
    timeRange: '9:00 AM – 7:00 PM',
    startHour: 9,
    endHour: 19,
    icon: Clock,
  },
];

// Helper to check if a slot is available on a given date (requires >= 2 hours lead time for today)
function isSlotAvailable(slot: TimeSlotOption, isToday: boolean): boolean {
  if (!isToday) return true;
  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  
  // Flexible anytime requires at least 2 hours before evening slot start (14:00 cutoff)
  if (slot.id === 'flexible') {
    return currentDecimalHour + 2 <= 16;
  }
  
  // Standard slot cutoff: must be at least 2 hours before slot start time
  return currentDecimalHour + 2 <= slot.startHour;
}

export default function CheckoutPage() {
  const [placing, setPlacing] = useState(false);
  const [subcity, setSubcity] = useState('Bole');
  const [street, setStreet] = useState('');
  const [phone, setPhone] = useState('+251 9');
  const [selectedDateIndex, setSelectedDateIndex] = useState(1);
  const [selectedSlotId, setSelectedSlotId] = useState('morning');
  const [callBeforeArrival, setCallBeforeArrival] = useState(true);
  const [notes, setNotes] = useState('');

  const { items, subtotal, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const { deliveryFee, fetchSettings } = useSettingsStore();
  const navigate = useNavigate();

  const isOrderPlaced = useRef(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (items.length === 0 && isAuthenticated && !isOrderPlaced.current) {
      navigate('/cart');
    }
  }, [items.length, isAuthenticated, navigate]);

  // Generate the next 6 available delivery dates dynamically
  const availableDates = useMemo(() => {
    const dates = [];
    const now = new Date();

    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();

      let mainLabel = `${dayName}, ${monthName} ${dayNum}`;
      let tag = '';
      const isToday = false; // We are skipping today

      // Check how many slots are open for this day
      const openSlotsCount = TIME_SLOTS.filter((s) => isSlotAvailable(s, isToday)).length;

      if (i === 1) {
        mainLabel = `Tomorrow (${monthName} ${dayNum})`;
        tag = 'Next Day';
      }

      dates.push({
        index: i,
        formatted: `${monthName} ${dayNum}, ${d.getFullYear()}`,
        display: mainLabel,
        dayName,
        dayNum,
        monthName,
        tag,
        isToday,
        hasAvailableSlots: openSlotsCount > 0,
        dateObj: d,
      });
    }
    return dates;
  }, []);

  // When date changes or on mount, ensure selectedSlotId is valid for that date
  useEffect(() => {
    const isToday = selectedDateIndex === 0;
    const currentSlot = TIME_SLOTS.find((s) => s.id === selectedSlotId);
    if (!currentSlot || !isSlotAvailable(currentSlot, isToday)) {
      const firstAvailable = TIME_SLOTS.find((s) => isSlotAvailable(s, isToday));
      if (firstAvailable) {
        setSelectedSlotId(firstAvailable.id);
      }
    }
  }, [selectedDateIndex, selectedSlotId]);

  if (!isAuthenticated) {
    return (
      <div className="container py-20 max-w-md text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-muted/60 flex items-center justify-center mb-6">
          <LogIn className="h-8 w-8 text-foreground/70" />
        </div>
        <h1 className="font-heading text-2xl font-bold mb-2">Account Required</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Please log in or create an account to complete your order.
        </p>
        <Link to="/login?redirect=/checkout">
          <Button className="w-full font-heading font-semibold text-sm h-11 rounded-lg gradient-primary text-primary-foreground" size="lg">
            Sign In / Register
          </Button>
        </Link>
      </div>
    );
  }

  const currentSubtotal = subtotal();
  const total = currentSubtotal;

  const isSelectedDateToday = selectedDateIndex === 0;
  const selectedDate = availableDates[selectedDateIndex] || availableDates[0];
  const selectedSlot = TIME_SLOTS.find((s) => s.id === selectedSlotId) || TIME_SLOTS[0];

  const handlePlaceOrder = async () => {
    if (!subcity.trim()) {
      toast.error('Please select your Addis Ababa sub-city.');
      return;
    }
    if (!street.trim()) {
      toast.error('Please provide a specific street, area, or landmark.');
      return;
    }
    if (!phone.trim() || phone.length < 9) {
      toast.error('Please provide a valid phone number so our delivery driver can reach you.');
      return;
    }

    if (!isSlotAvailable(selectedSlot, isSelectedDateToday)) {
      toast.error('The selected time slot is no longer available. Please choose an open slot.');
      return;
    }

    setPlacing(true);
    try {
      const scheduleString = `${selectedDate.display} · ${selectedSlot.label} (${selectedSlot.timeRange})`;
      const driverPreference = callBeforeArrival ? 'Driver to call 20–30 min before arrival' : 'Standard dispatch';
      
      const structuredNotes = notes.trim()
        ? `[Schedule: ${scheduleString}] [${driverPreference}] ${notes.trim()}`
        : `[Schedule: ${scheduleString}] [${driverPreference}]`;

      const orderPayload = {
        subcity,
        street,
        phone,
        deliveryDate: selectedDate.display,
        deliveryTimeSlot: `${selectedSlot.label} (${selectedSlot.timeRange})`,
        paymentMethod: 'pay_on_delivery',
        notes: structuredNotes,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          variantKey: i.variantKey,
          size: i.size,
          colorName: i.color?.name,
          colorHex: i.color?.hex,
          quantity: i.quantity,
          price: i.product.price,
          imageUrl: i.imageUrl || i.product.images?.[0]?.url,
        })),
      };

      const order = await createOrder(orderPayload);
      useOrderStore.getState().addOrder(order);
      // Background re-sync to ensure exact state matching
      useOrderStore.getState().fetchOrders(true);
      isOrderPlaced.current = true;
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-confirmation?orderNumber=${order.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="pb-4 mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Complete Your Order</h1>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Left Column: Address, Schedule & Payment on Delivery */}
        <div className="md:col-span-7 space-y-6">
          {/* Section 1: Location details */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Truck className="h-4 w-4 text-accent" />
              <h2 className="font-heading font-semibold text-base">Delivery Address</h2>
            </div>
            <div>
              <Label>Sub-City</Label>
              <div className="relative mt-1.5">
                <select
                  value={subcity}
                  onChange={(e) => setSubcity(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-10 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground appearance-none cursor-pointer"
                >
                  {ADDIS_SUBCITIES.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <Label>Street / Location</Label>
              <Input
                placeholder=""
                className="mt-1.5 h-10 rounded"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder=""
                className="mt-1.5 h-10 rounded"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Delivery Schedule & Time Slot Selection */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <h2 className="font-heading font-semibold text-base">Delivery Schedule</h2>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <Label className="block mb-2">
                Select Delivery Day
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {availableDates.map((d) => {
                  const isSelected = selectedDateIndex === d.index;
                  const isDisabled = d.isToday && !d.hasAvailableSlots;

                  return (
                    <button
                      key={d.index}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedDateIndex(d.index)}
                      className={`p-2.5 rounded text-center border transition-all flex flex-col items-center justify-center ${
                        isDisabled
                          ? 'opacity-45 bg-muted/30 border-border cursor-not-allowed text-muted-foreground'
                          : isSelected
                          ? 'border-foreground bg-foreground text-background shadow-xs'
                          : 'border-border bg-background hover:bg-muted/40 text-foreground'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-semibold tracking-wider ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
                        {d.index === 0 ? 'Today' : d.index === 1 ? 'Tmrw' : d.dayName}
                      </span>
                      <span className="text-sm font-heading font-bold mt-0.5">
                        {d.monthName} {d.dayNum}
                      </span>
                      {d.tag && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded mt-1 font-medium ${
                            isDisabled
                              ? 'bg-muted text-muted-foreground'
                              : isSelected
                              ? 'bg-background/20 text-background'
                              : 'bg-accent/10 text-accent dark:text-accent-foreground'
                          }`}
                        >
                          {d.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean, Simple Time Slot Selection */}
            <div>
              <Label className="block mb-2">
                Select Time Slot
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                {TIME_SLOTS.map((slot) => {
                  const isAvailable = isSlotAvailable(slot, isSelectedDateToday);
                  const isSelected = selectedSlotId === slot.id && isAvailable;
                  const Icon = slot.icon;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`p-3 rounded border text-left transition-all relative flex flex-col justify-between ${
                        !isAvailable
                          ? 'opacity-40 bg-muted/20 border-border/60 cursor-not-allowed'
                          : isSelected
                          ? 'border-foreground bg-muted/40 ring-1 ring-foreground'
                          : 'border-border bg-background hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Icon className={`h-3.5 w-3.5 ${isAvailable ? 'text-accent' : 'text-muted-foreground'}`} />
                          <span>{slot.label}</span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>

                      <div className="mt-1.5 flex items-baseline justify-between gap-1">
                        <span className="font-heading font-medium text-xs text-foreground">
                          {slot.timeRange}
                        </span>
                        {!isAvailable && (
                          <span className="text-[10px] text-destructive/80 font-medium whitespace-nowrap">
                            Passed
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isSelectedDateToday && !TIME_SLOTS.some((s) => isSlotAvailable(s, true)) && (
                <div className="mt-2.5 p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>All time slots for today have passed the 2-hour preparation cutoff. Please select tomorrow.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary with Scheduled Time */}
        <div className="md:col-span-5">
          <div className="sticky top-24 bg-card border border-border rounded-lg p-5 space-y-5">
            <h2 className="font-heading font-semibold text-base border-b border-border pb-3">Order Breakdown</h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {items.map(({ product, quantity, variantKey, size, color, imageUrl }) => (
                <div key={variantKey} className="flex items-center gap-3 text-sm">
                  <img
                    src={getImageUrl(imageUrl || product.images?.[0]?.url) || FALLBACK_PRODUCT_IMAGE}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded object-cover border border-border/60"
                    onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Qty: {quantity}{size ? ` · ${size}` : ''}{color ? ` · ${color.name}` : ''}
                    </p>
                  </div>
                  <span className="font-heading font-semibold text-xs">{formatETB(product.price * quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-xs">
              <div className="flex justify-between font-heading font-bold text-base text-foreground">
                <span>Total</span>
                <span>{formatETB(total)}</span>
              </div>
            </div>

            <Button
              className="w-full font-heading font-semibold text-sm h-12 rounded-lg gradient-primary text-primary-foreground"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={placing || (isSelectedDateToday && !isSlotAvailable(selectedSlot, true))}
            >
              {placing ? 'Processing...' : 'Complete Order'}
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
