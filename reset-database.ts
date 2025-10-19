import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

async function resetDatabase() {
  console.log("🗑️  Dropping all tables...");
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  
  // Get all tables
  const [tables] = await connection.query("SHOW TABLES");
  
  // Drop each table
  for (const table of tables as any[]) {
    const tableName = Object.values(table)[0];
    console.log(`  Dropping table: ${tableName}`);
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  }
  
  console.log("✅ All tables dropped successfully!");
  await connection.end();
}

resetDatabase().catch(console.error);
