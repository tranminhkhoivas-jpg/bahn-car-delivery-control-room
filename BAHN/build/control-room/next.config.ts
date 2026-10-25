import type { NextConfig } from "next"
import { config as loadEnv } from "dotenv"

// Keys live once in the repo-root .env (N8N_API_KEY, TELEGRAM_BOT_TOKEN, ...); values already in the environment win.
// Server-side only: nothing without NEXT_PUBLIC_ reaches the browser.
loadEnv({ path: "../../../.env", quiet: true })

const config: NextConfig = { devIndicators: false, serverExternalPackages: ["@electric-sql/pglite"] }

export default config
