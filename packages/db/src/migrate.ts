import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createClient, createDb, DATABASE_URL } from "./client";

const client = createClient(DATABASE_URL, { max: 1 });
const db = createDb(client);

await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
await client.end();

console.log("Migrations applied");
