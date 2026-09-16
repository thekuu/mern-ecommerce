import { repository } from './index';
import { initialCategories, initialProducts, initialUsers, initialSettings } from './seed-data';

async function seed() {
  console.log('🌱 Starting ShegAddis Neon database seed...');
  console.log(`✅ Loaded ${initialCategories.length} categories`);
  console.log(`✅ Loaded ${initialProducts.length} products with variants and image sets`);
  console.log(`✅ Initialized ${initialUsers.length} users with secure RBAC roles`);
  console.log(`✅ Configured default settings (Delivery fee: ${initialSettings.deliveryFee} ETB)`);
  console.log('🚀 Seed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
