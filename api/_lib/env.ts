import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

type EnvFlag = typeof globalThis & { __nidhisEnvLoaded?: boolean }
const globalEnv = globalThis as EnvFlag

if (!globalEnv.__nidhisEnvLoaded) {
  const mode = process.env.NODE_ENV ?? 'development'
  const candidates = [
    `.env.${mode}.local`,
    '.env.local',
    `.env.${mode}`,
    '.env',
  ]

  const seen = new Set<string>()
  for (const candidate of candidates) {
    const resolved = path.resolve(process.cwd(), candidate)
    if (seen.has(resolved)) continue
    if (!fs.existsSync(resolved)) continue
    config({ path: resolved, override: true })
    seen.add(resolved)
  }

  globalEnv.__nidhisEnvLoaded = true
}
