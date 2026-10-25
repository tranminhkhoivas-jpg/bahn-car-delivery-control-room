import "server-only"

import { join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema"
import { seed } from "./seed"

// ponytail: in-process Postgres (PGlite, in memory) rebuilt from the JSONL snapshot on every server start,
// so no Docker is needed. The snapshot is read only; agent state lives in n8n Data Tables (lib/agent.ts).
async function open(): Promise<PgliteDatabase<typeof schema>> {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") })
  await seed(db)
  return db
}

// One database per server process, kept across dev hot reloads.
const cache = globalThis as { controlRoomDb?: Promise<PgliteDatabase<typeof schema>> }
export const db = await (cache.controlRoomDb ??= open())
