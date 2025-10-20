/**
 * Clear Database Script
 * 
 * WARNING: This will delete ALL data from the database!
 * Use this to start fresh with a clean database.
 * 
 * Run with: npx tsx clear-database.ts
 */

import { db } from './server/db';
import { 
  users, 
  projects, 
  episodes, 
  templates, 
  artworkBatches,
  rssFeedUpdates 
} from './drizzle/schema';

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Delete in order to respect foreign key constraints
    console.log('Deleting RSS feed updates...');
    await db.delete(rssFeedUpdates);
    console.log('✓ RSS feed updates deleted');

    console.log('Deleting artwork batches...');
    await db.delete(artworkBatches);
    console.log('✓ Artwork batches deleted');

    console.log('Deleting templates...');
    await db.delete(templates);
    console.log('✓ Templates deleted');

    console.log('Deleting episodes...');
    await db.delete(episodes);
    console.log('✓ Episodes deleted');

    console.log('Deleting projects...');
    await db.delete(projects);
    console.log('✓ Projects deleted');

    console.log('Deleting users...');
    await db.delete(users);
    console.log('✓ Users deleted');

    console.log('\n✅ Database cleared successfully!');
    console.log('All tables are now empty. You can start fresh.');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
clearDatabase();

