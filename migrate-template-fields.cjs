/**
 * Migration Script: Add new template customization fields
 * Run with: node migrate-template-fields.js
 */

const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'yamanote.proxy.rlwy.net',
    port: 17096,
    user: 'root',
    password: 'sRgpvghidoNyfVSeoXICrPGMDjxqjySs',
    database: 'railway'
  });

  try {
    console.log('🔗 Connected to Railway MySQL database');
    console.log('📝 Running migration...\n');

    // MySQL doesn't support IF NOT EXISTS with ADD COLUMN, so we'll handle errors
    const columns = [
      { name: 'borderRadius', type: "VARCHAR(16) DEFAULT '8'" },
      { name: 'labelFormat', type: "VARCHAR(16) DEFAULT 'number'" },
      { name: 'customPrefix', type: "VARCHAR(32) DEFAULT ''" },
      { name: 'customSuffix', type: "VARCHAR(32) DEFAULT ''" },
    ];

    for (const col of columns) {
      try {
        await connection.execute(
          `ALTER TABLE templates ADD COLUMN ${col.name} ${col.type}`
        );
        console.log(`✅ Added column: ${col.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column')) {
          console.log(`⏭️  Column ${col.name} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');

    // Verify the columns were added
    const [rows] = await connection.execute('DESCRIBE templates');
    
    console.log('\n📋 New template fields:');
    rows.forEach((r) => {
      if (['borderRadius', 'labelFormat', 'customPrefix', 'customSuffix'].includes(r.Field)) {
        console.log(`  - ${r.Field}: ${r.Type} (default: ${r.Default})`);
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔌 Disconnected from database');
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

