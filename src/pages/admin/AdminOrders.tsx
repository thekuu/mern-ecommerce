import { useEffect, useState } from 'react';
import { getOrders, updateOrderStatus } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import { toast } from 'sonner';
import { Eye, FileText, CheckCircle2, Phone, MapPin, Package, RefreshCw, Calendar, Clock, Banknote } from 'lucide-react';
import type { Order } from '@/types';

const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusColor: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  shipped: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders(true);
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      toast.success(`Order status updated to ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Order & Dispatch Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer fulfillment, scheduled delivery time slots, and dispatch routing across Addis Ababa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
          <Button
            key={st}
            variant={filterStatus === st ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(st)}
            className="text-xs uppercase tracking-wider font-semibold"
          >
            {st} {st !== 'all' ? `(${orders.filter((o) => o.status === st).length})` : `(${orders.length})`}
          </Button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5">Order #</th>
                <th className="p-3.5">Customer & Location</th>
                <th className="p-3.5">Delivery Schedule</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => {
                const customerName = order.customerName || `${(order as any).shippingAddress?.firstName || ''} ${(order as any).shippingAddress?.lastName || ''}`.trim() || 'Customer';
                const subcity = order.subcity || (order as any).shippingAddress?.city || 'Addis Ababa';
                const phone = order.customerPhone || (order as any).shippingAddress?.phone || 'N/A';
                const scheduleDate = order.deliveryDate || 'Scheduled';
                const scheduleSlot = order.deliveryTimeSlot || 'Standard Delivery Window';

                return (
                  <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3.5 font-mono text-xs font-semibold">
                      {order.orderNumber}
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-foreground">{customerName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {subcity} · {phone}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-accent" /> {scheduleDate}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {scheduleSlot}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                        <Banknote className="h-3 w-3" /> Pay on Delivery
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground">
                      {order.items?.length || 0} product(s)
                    </td>
                    <td className="p-3.5 font-heading font-semibold text-sm">
                      {formatETB(order.total)}
                    </td>
                    <td className="p-3.5">
                      <Select value={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <Badge variant="outline" className={`${statusColor[order.status]} text-[11px] font-semibold uppercase`}>
                            <SelectValue />
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                    No orders matching selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Order {selectedOrder.orderNumber}</DialogTitle>
              <DialogDescription>
                Placed on {new Date(selectedOrder.createdAt).toLocaleString()} · Addis Ababa Delivery Dispatch
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {/* Scheduled Time Banner */}
              <div className="p-4 rounded-md bg-accent/10 border border-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                    Customer Selected Delivery Schedule
                  </span>
                  <p className="font-heading font-bold text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-accent" /> {selectedOrder.deliveryDate || 'Flexible Schedule'}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                    Available Time Slot
                  </span>
                  <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5 sm:justify-end">
                    <Clock className="h-3.5 w-3.5 text-accent" /> {selectedOrder.deliveryTimeSlot || 'Standard Daytime'}
                  </p>
                </div>
              </div>

              {/* Customer & Location */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 rounded bg-muted/40 border border-border/60">
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Customer Details</h4>
                  <p className="font-semibold text-foreground">{selectedOrder.customerName || 'Customer'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.customerEmail || selectedOrder.customerPhone}</p>
                  <p className="text-xs text-foreground font-medium mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-accent" /> {selectedOrder.customerPhone || 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Delivery Destination</h4>
                  <p className="font-medium text-foreground">{selectedOrder.subcity}, {selectedOrder.woreda || 'Woreda Area'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.street}</p>
                  {selectedOrder.notes && (
                    <p className="text-xs bg-background p-2 rounded border border-border mt-2 text-muted-foreground">
                      <strong>Notes & Preferences:</strong> {selectedOrder.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Mode */}
              <div className="p-3 rounded border border-border bg-emerald-500/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-foreground">Payment Method: Pay on Delivery</span>
                </div>
                <span className="text-muted-foreground">Collect Cash or Mobile upon inspection</span>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Order Items</h4>
                <div className="border border-border rounded divide-y divide-border">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(item.imageUrl) || FALLBACK_PRODUCT_IMAGE}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded object-cover border border-border"
                          onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                        />
                        <div>
                          <p className="font-medium text-xs text-foreground">{item.productName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {item.quantity} {item.size ? `· Size ${item.size}` : ''} {item.colorName ? `· ${item.colorName}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-heading font-semibold text-xs">{formatETB(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-card border border-border rounded p-4 space-y-2 text-xs">
                <div className="flex justify-between font-heading font-bold text-sm text-foreground">
                  <span>Total Due on Delivery</span>
                  <span>{formatETB(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
