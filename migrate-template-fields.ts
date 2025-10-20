/**
 * Migration Script: Add new template customization fields
 * Adds: borderRadius, labelFormat, customPrefix, customSuffix
 */

import { getDb } from './server/db';

async function migrate() {
  const db = await getDb();
  
  if (!db) {
    throw new Error('Could not connect to database');
  }

  try {
    console.log('🔗 Connected to database');
    console.log('📝 Running migration...\n');

    // MySQL doesn't support IF NOT EXISTS with ADD COLUMN, so we'll catch errors
    const columns = [
      { name: 'borderRadius', type: "VARCHAR(16) DEFAULT '8'" },
      { name: 'labelFormat', type: "VARCHAR(16) DEFAULT 'number'" },
      { name: 'customPrefix', type: "VARCHAR(32) DEFAULT ''" },
      { name: 'customSuffix', type: "VARCHAR(32) DEFAULT ''" },
    ];

    for (const col of columns) {
      try {
        await db.execute(
          `ALTER TABLE templates ADD COLUMN ${col.name} ${col.type}`
        );
        console.log(`✅ Added column: ${col.name}`);
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          console.log(`⏭️  Column ${col.name} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');

    // Verify the columns
    const [rows]: any = await db.execute('DESCRIBE templates');
    
    console.log('\n📋 New template fields:');
    rows.forEach((r: any) => {
      if (['borderRadius', 'labelFormat', 'customPrefix', 'customSuffix'].includes(r.Field)) {
        console.log(`  - ${r.Field}: ${r.Type} (default: ${r.Default})`);
      }
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('\n🎉 All done! Your template customizations will now be saved properly.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
