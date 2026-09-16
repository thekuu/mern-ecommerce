import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadReceipt, logout } from '@/lib/api';
import { Upload, FileText, CheckCircle, X, Loader2, Calendar, Clock, MapPin, Banknote, Package, RefreshCw, LogOut, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/orderStore';
import { useAuthStore } from '@/store/authStore';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, handleImageFallback } from '@/lib/images';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { orders, loading, hasFetched, fetchOrders } = useOrderStore();
  const { user, clearAuth } = useAuthStore();
  const [receipts, setReceipts] = useState<Record<string, { file?: File; name: string; uploaded: boolean }>>({});
  const [uploadingOrder, setUploadingOrder] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const navigate = useNavigate();

  useEffect(() => {
    // Silently revalidates in the background without blocking UI
    fetchOrders();
  }, [fetchOrders]);

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    shipped: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  };

  const handleFileSelect = (orderId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    setReceipts((prev) => ({ ...prev, [orderId]: { file, name: file.name, uploaded: false } }));
  };

  const handleUpload = async (orderId: string) => {
    const item = receipts[orderId];
    if (!item || !item.file) {
      toast.error('Please select a receipt image first');
      return;
    }
    setUploadingOrder(orderId);
    try {
      const receiptUrl = await uploadImageToCloudinary(item.file, 'shegaddis/receipts');
      await uploadReceipt(orderId, receiptUrl);
      setReceipts((prev) => ({ ...prev, [orderId]: { ...prev[orderId], uploaded: true } }));
      toast.success('Receipt uploaded and attached to your order!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload receipt: ' + (err.message || 'Error'));
    } finally {
      setUploadingOrder(null);
    }
  };

  const handleRemove = (orderId: string) => {
    setReceipts((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    const input = fileInputRefs.current[orderId];
    if (input) input.value = '';
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    } finally {
      clearAuth();
      navigate('/');
      toast.success('Logged out successfully');
    }
  };

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-start justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">My Account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Addis Ababa orders, delivery schedules, and account preferences.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders">My Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="settings">Account Details</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {loading && !hasFetched ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="border border-border rounded-lg bg-card p-4 space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-5 w-20 bg-muted rounded"></div>
                  </div>
                  <div className="h-10 bg-muted/60 rounded"></div>
                  <div className="h-4 w-48 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center bg-card">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="font-medium text-foreground text-sm">No orders yet</p>
              <p className="text-muted-foreground text-xs mt-1">
                Your placed orders and scheduled delivery time slots will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const receipt = receipts[order.id];
                return (
                  <div key={order.id} className="border border-border rounded-lg bg-card overflow-hidden shadow-xs">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-semibold text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="outline" className={`${statusColor[order.status]} text-xs font-semibold uppercase`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>

                      {/* Scheduled Delivery Banner */}
                      <div className="p-2.5 rounded bg-muted/40 border border-border/60 text-xs grid sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-accent" />
                          <span>Delivery: <strong>{order.deliveryDate || 'Scheduled Day'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground sm:justify-end">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                          <span>{order.deliveryTimeSlot || 'Standard Daytime'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm pt-1 pb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-accent" />
                          <span>{order.subcity || (order as any).shippingAddress?.city || 'Addis Ababa'}</span>
                          <span>•</span>
                          <span>{order.items?.length || 0} item(s)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">Total (Pay on Delivery)</span>
                          <span className="font-heading font-bold text-sm text-foreground">{formatETB(order.total)}</span>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="border-t border-border pt-3 mt-1">
                          <div className="space-y-3">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.productName || item.product?.name}
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
                                    <p className="font-medium text-foreground truncate">{item.productName || item.product?.name}</p>
                                    <p className="text-muted-foreground text-[11px]">
                                      Qty: {item.quantity} {item.size ? `· Size ${item.size}` : ''} {item.colorName ? `· ${item.colorName}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-medium text-foreground shrink-0">{formatETB((item.price || item.product?.price || 0) * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Optional Receipt Attachment / Status */}
                    <div className="border-t border-border bg-muted/20 p-3.5 text-xs">
                      {order.paymentReceiptUrl || receipt?.uploaded ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-medium">
                          <CheckCircle className="h-4 w-4" />
                          <span>Mobile transfer receipt attached to order</span>
                        </div>
                      ) : receipt ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs truncate max-w-xs">{receipt.name}</span>
                          <button
                            onClick={() => handleRemove(order.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <Button
                            size="sm"
                            disabled={uploadingOrder === order.id}
                            className="ml-auto gradient-primary text-primary-foreground font-heading h-8 text-xs px-3"
                            onClick={() => handleUpload(order.id)}
                          >
                            {uploadingOrder === order.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Uploading…
                              </>
                            ) : (
                              'Upload Receipt'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Pay in cash or mobile payment upon arrival
                          </span>
                          {/* 
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => fileInputRefs.current[order.id]?.click()}
                          >
                            Attach Transfer Slip (Optional)
                          </Button>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[order.id] = el;
                            }}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(order.id, file);
                            }}
                          />
                          */}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input defaultValue={user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer'} className="mt-1.5" />
            </div>
            <div>
              <Label>Username (Unique Handle)</Label>
              <Input defaultValue={user?.username || 'user'} className="mt-1.5 font-mono" readOnly />
              <p className="text-xs text-muted-foreground mt-1">Unique identifier used for logging in.</p>
            </div>
            <Button className="gradient-primary text-primary-foreground font-heading">
              Save Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
