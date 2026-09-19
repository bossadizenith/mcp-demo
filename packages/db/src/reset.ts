import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createClient, createDb, DATABASE_URL } from "./client";
import { seedDatabase } from "./seed";

const client = createClient(DATABASE_URL, { max: 1 });
const db = createDb(client);

await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
await client.unsafe("CREATE SCHEMA public");
await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
await seedDatabase(db);
await client.end();

console.log("Database reset and seeded");
