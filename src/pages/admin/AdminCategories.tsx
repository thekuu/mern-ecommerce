import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '@/types';
import { useCategoryStore } from '@/store/categoryStore';
import { useProductStore } from '@/store/productStore';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import { Link } from 'react-router-dom';

export default function AdminCategories() {
  const categories = useCategoryStore((s) => s.categories);
  const isLoading = useCategoryStore((s) => s.isLoading);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const editCategory = useCategoryStore((s) => s.editCategory);
  const removeCategory = useCategoryStore((s) => s.removeCategory);

  const products = useProductStore((s) => s.products);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const categoryToDelete = categories.find((c) => c.id === deleteId);

  const openNew = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingCategory(c);
    setFormOpen(true);
  };

  const handleSave = async (data: { name: string; slug: string; description?: string; image?: string }) => {
    if (editingCategory) {
      await editCategory(editingCategory.id, data);
      toast.success(`Updated category "${data.name}"`);
    } else {
      await addCategory(data);
      toast.success(`Created category "${data.name}"`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await removeCategory(deleteId);
      toast.success(categoryToDelete ? `Deleted "${categoryToDelete.name}"` : 'Category deleted');
    } catch (err: any) {
      toast.error('Failed to delete category: ' + (err.message || 'Error'));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Helper to get real product count for this category from current catalog
  const getProductCountForCat = (cat: Category) => {
    const liveCount = products.filter((p) => p.category?.id === cat.id || p.category?.slug === cat.slug).length;
    return liveCount || cat.productCount || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Categories ({categories.length})</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your store collections and sync cover banners with the Home page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCategories();
              toast.info('Categories refreshed');
            }}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="gradient-primary text-primary-foreground font-heading text-xs" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories by name or slug..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Categories Grid Card View with Home-style Cover Image Previews */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((cat) => {
          const productCount = getProductCountForCat(cat);
          const coverImg = cat.image || (cat.slug === 'shoes'
            ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&h=1200&fit=crop'
            : 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop');

          return (
            <div
              key={cat.id}
              className="group bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all shadow-xs"
            >
              {/* Cover Banner mimicking Home Page collection card */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={coverImg}
                  alt={cat.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.85]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1000&h=1200&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Badge tags overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-white/20 text-[11px] font-mono">
                    /{cat.slug}
                  </Badge>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white font-medium">
                    {productCount} {productCount === 1 ? 'product' : 'products'}
                  </span>
                </div>

                {/* Bottom title & tagline */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-heading font-bold text-xl">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{cat.description}</p>
                  )}
                </div>
              </div>

              {/* Card Body & Quick Actions */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[180px]">ID: {cat.id}</span>
                  <Link
                    to={`/products?category=${cat.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 hover:text-primary font-medium transition-colors"
                  >
                    View in Store <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Cover & Info
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-sm">No categories found matching "{search}"</p>
            <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Category
            </Button>
          </div>
        )}
      </div>

      {/* Form Dialog for Add / Edit */}
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSave={handleSave}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete category{' '}
              <strong>"{categoryToDelete?.name}"</strong>?
              {categoryToDelete && getProductCountForCat(categoryToDelete) > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: There are {getProductCountForCat(categoryToDelete)} products assigned to this category.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
