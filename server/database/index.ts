import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { neon } from '@neondatabase/serverless'
import postgres from 'postgres'
import * as schema from './schema'

type Db = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePostgres<typeof schema>>

let _db: Db | null = null

function createDb(): Db {
  const config = useRuntimeConfig()
  const url = config.databaseUrl

  // Use standard postgres driver for local (docker) connections,
  // Neon HTTP driver for production (serverless)
  const isNeon = url.includes('neon.tech') || url.includes('neon.') || config.storageDriver === 'r2'

  if (isNeon) {
    const sql = neon(url)
    return drizzleNeon(sql, { schema })
  } else {
    const sql = postgres(url)
    return drizzlePostgres(sql, { schema })
  }
}

export function useDb() {
  if (!_db) {
    _db = createDb()
  }
  return _db
}
