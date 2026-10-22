import { describe, it, expect } from 'vitest';
import { repository } from '../db/index';

describe('deleteOldNewArrivalProducts service', () => {
  it('correctly deletes products marked only as new and older than 10 days', async () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Product marked ONLY new (>10 days old) -> MUST BE DELETED
    const oldOnlyNew = await repository.createProduct({
      name: 'Old Only New Shoes',
      slug: 'old-only-new-shoes-' + Date.now(),
      description: 'Test product',
      price: 2500,
      currency: 'ETB',
      sku: 'TEST-OLD-NEW',
      isNew: true,
      isFeatured: false,
      createdAt: elevenDaysAgo,
    });

    // 2. Product marked as new BUT ALSO featured (>10 days old) -> MUST NOT BE DELETED
    const oldFeatured = await repository.createProduct({
      name: 'Old Featured Shoes',
      slug: 'old-featured-shoes-' + Date.now(),
      description: 'Test product',
      price: 3500,
      currency: 'ETB',
      sku: 'TEST-OLD-FEAT',
      isNew: true,
      isFeatured: true,
      createdAt: elevenDaysAgo,
    });

    // 3. Product marked only new but RECENT (<10 days old) -> MUST NOT BE DELETED
    const recentOnlyNew = await repository.createProduct({
      name: 'Recent Only New Shoes',
      slug: 'recent-only-new-shoes-' + Date.now(),
      description: 'Test product',
      price: 2200,
      currency: 'ETB',
      sku: 'TEST-RECENT-NEW',
      isNew: true,
      isFeatured: false,
      createdAt: twoDaysAgo,
    });

    // 4. Product NOT marked new (>10 days old) -> MUST NOT BE DELETED
    const oldRegular = await repository.createProduct({
      name: 'Old Regular Shoes',
      slug: 'old-regular-shoes-' + Date.now(),
      description: 'Test product',
      price: 1800,
      currency: 'ETB',
      sku: 'TEST-OLD-REG',
      isNew: false,
      isFeatured: false,
      createdAt: elevenDaysAgo,
    });

    // Run the deletion service
    const deletedCount = await repository.deleteOldNewArrivalProducts(10);
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    // Verify expectations
    const check1 = await repository.getProductBySlug(oldOnlyNew.slug);
    expect(check1).toBeNull(); // Deleted!

    // Verify that full catalog refresh does not resurrect the deleted product
    const allProducts = await repository.getProducts({ pageSize: 100 });
    const existsInList = allProducts.data.some((p) => p.id === oldOnlyNew.id || p.slug === oldOnlyNew.slug);
    expect(existsInList).toBe(false);

    const check2 = await repository.getProductBySlug(oldFeatured.slug);
    expect(check2).not.toBeNull(); // Kept because it is featured!

    const check3 = await repository.getProductBySlug(recentOnlyNew.slug);
    expect(check3).not.toBeNull(); // Kept because it is recent!

    const check4 = await repository.getProductBySlug(oldRegular.slug);
    expect(check4).not.toBeNull(); // Kept because it is not marked new!

    // Cleanup leftover test products
    if (check2) await repository.deleteProduct(check2.id);
    if (check3) await repository.deleteProduct(check3.id);
    if (check4) await repository.deleteProduct(check4.id);
  });

  it('guarantees unique IDs on rapid creation and permanently deletes products across refreshes', async () => {
    const p1 = await repository.createProduct({
      name: 'Rapid Shoes A',
      price: 1500,
      sku: 'RAPID-A',
    });
    const p2 = await repository.createProduct({
      name: 'Rapid Shoes B',
      price: 1600,
      sku: 'RAPID-B',
    });

    expect(p1.id).not.toEqual(p2.id);

    // Delete p1
    const deleted = await repository.deleteProduct(p1.id);
    expect(deleted).toBe(true);

    // Simulate page refresh fetching products from scratch
    const refreshed = await repository.getProducts({ pageSize: 100 });
    expect(refreshed.data.some((p) => p.id === p1.id)).toBe(false);
    expect(refreshed.data.some((p) => p.id === p2.id)).toBe(true);

    const lookup1 = await repository.getProductBySlug(p1.slug);
    expect(lookup1).toBeNull();

    const lookup2 = await repository.getProductBySlug(p2.slug);
    expect(lookup2).not.toBeNull();

    // Clean up
    await repository.deleteProduct(p2.id);
  });

  it('preserves products marked as new if they are also on sale or have other badges/tags', async () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Product on Sale (compareAtPrice > price) -> MUST NOT BE DELETED
    const oldSale = await repository.createProduct({
      name: 'Old Sale Sneakers',
      slug: 'old-sale-sneakers-' + Date.now(),
      description: 'Sale product',
      price: 2000,
      compareAtPrice: 3000,
      currency: 'ETB',
      sku: 'TEST-OLD-SALE',
      isNew: true,
      isFeatured: false,
      createdAt: elevenDaysAgo,
    });

    // 2. Product with 'bestseller' tag -> MUST NOT BE DELETED
    const oldBestseller = await repository.createProduct({
      name: 'Old Bestseller Hoodie',
      slug: 'old-bestseller-hoodie-' + Date.now(),
      description: 'Bestseller product',
      price: 1800,
      currency: 'ETB',
      sku: 'TEST-OLD-BEST',
      isNew: true,
      isFeatured: false,
      tags: ['bestseller'],
      createdAt: elevenDaysAgo,
    });

    // 3. Product marked ONLY as new (>10 days old) -> MUST BE DELETED
    const oldOnlyNew = await repository.createProduct({
      name: 'Old Qualifying Shoe',
      slug: 'old-qualifying-shoe-' + Date.now(),
      description: 'Clean me up',
      price: 1900,
      currency: 'ETB',
      sku: 'TEST-CLEANUP-TARGET',
      isNew: true,
      isFeatured: false,
      createdAt: elevenDaysAgo,
    });

    // Run cleanup
    const deletedCount = await repository.deleteOldNewArrivalProducts(10);
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    // Verify oldOnlyNew is completely deleted
    const checkTarget = await repository.getProductBySlug(oldOnlyNew.slug);
    expect(checkTarget).toBeNull();

    // Verify catalog does not include oldOnlyNew in refreshed list
    const catalog = await repository.getProducts({ pageSize: 100 });
    expect(catalog.data.some((p) => p.id === oldOnlyNew.id || p.slug === oldOnlyNew.slug)).toBe(false);

    // Verify sale product is preserved
    const checkSale = await repository.getProductBySlug(oldSale.slug);
    expect(checkSale).not.toBeNull();
    expect(checkSale?.isNew).toBe(true);

    // Verify bestseller product is preserved
    const checkBestseller = await repository.getProductBySlug(oldBestseller.slug);
    expect(checkBestseller).not.toBeNull();

    // Cleanup test products
    if (checkSale) await repository.deleteProduct(checkSale.id);
    if (checkBestseller) await repository.deleteProduct(checkBestseller.id);
  });
});
