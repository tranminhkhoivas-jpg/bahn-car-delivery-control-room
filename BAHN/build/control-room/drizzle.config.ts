import { defineConfig } from "drizzle-kit"

// Only used to generate ./drizzle (the SQL the in-memory database is built from). Run `npm run db:generate` after editing lib/schema.ts.
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
})
