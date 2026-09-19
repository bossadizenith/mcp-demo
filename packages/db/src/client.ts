import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/incido";

export function createClient(
  url = DATABASE_URL,
  options?: postgres.Options<Record<string, never>>,
) {
  return postgres(url, options);
}

export function createDb(client: postgres.Sql) {
  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;

let singleton: Database | undefined;
let singletonClient: postgres.Sql | undefined;

export function getDb() {
  if (!singleton) {
    singletonClient = createClient();
    singleton = createDb(singletonClient);
  }
  return singleton;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});
