import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { formatETB } from '@/lib/currency';
import { FALLBACK_PRODUCT_IMAGE, getImageUrl, handleImageFallback } from '@/lib/images';
import { useProductStore } from '@/store/productStore';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';

export default function AdminProducts() {
  const products = useProductStore((s) => s.products);
  const isLoading = useProductStore((s) => s.isLoading);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const remove = useProductStore((s) => s.remove);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const productToDelete = products.find((p) => p.id === deleteId);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setFormOpen(true); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await remove(deleteId);
      toast.success(productToDelete ? `Deleted "${productToDelete.name}"` : 'Product deleted');
    } catch (err: any) {
      toast.error('Failed to delete product: ' + (err.message || 'Error'));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold">Products ({products.length})</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchProducts(true);
              toast.info('Products refreshed from database');
            }}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="gradient-primary text-primary-foreground font-heading" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-heading font-semibold">Product</th>
                <th className="text-left p-3 font-heading font-semibold">Category</th>
                <th className="text-left p-3 font-heading font-semibold">Price</th>
                <th className="text-left p-3 font-heading font-semibold">Variants</th>
                <th className="text-left p-3 font-heading font-semibold">Stock</th>
                <th className="text-left p-3 font-heading font-semibold">Status</th>
                <th className="text-right p-3 font-heading font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={getImageUrl(p.images?.[0]?.url) || FALLBACK_PRODUCT_IMAGE}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-md object-cover"
                        onError={(e) => handleImageFallback(e, FALLBACK_PRODUCT_IMAGE)}
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category.name}</td>
                  <td className="p-3 font-heading font-semibold">{formatETB(p.price)}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span>{p.sizes?.length ?? 0} sizes</span>
                      <div className="flex items-center gap-1">
                        {(p.colors ?? []).slice(0, 4).map((c) => (
                          <span key={c.name} className="h-3 w-3 rounded-full border border-border" style={{ background: c.hex }} title={c.name} />
                        ))}
                        {(p.colors?.length ?? 0) > 4 && <span>+{p.colors!.length - 4}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">
                    <Badge variant={p.stock > 0 ? 'secondary' : 'destructive'} className="text-xs">
                      {p.stock > 0 ? 'Active' : 'Out of Stock'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && !isDeleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete
                ? `Are you sure you want to delete "${productToDelete.name}"? This action will remove it from the catalog permanently.`
                : 'Are you sure you want to delete this product? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
