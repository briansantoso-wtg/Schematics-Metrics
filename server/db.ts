import { createRequire } from 'module'
import sql_ from 'mssql'

// Use createRequire so that the msnodesqlv8 CJS module can be loaded
// conditionally at runtime (it is only available on Windows).
const _require = createRequire(import.meta.url)

export interface DbCredentials {
  username: string
  password: string
}

function serverAddress() {
  return process.env.DB_SERVER ?? 'ediprod.db.corporate.cargowise.com'
}

function buildIntegratedConfig(): sql_.config {
  return {
    server: serverAddress(),
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    database: process.env.DB_DATABASE ?? 'edidb',
    driver: process.env.DB_ODBC_DRIVER ?? 'ODBC Driver 18 for SQL Server',
    options: {
      trustedConnection: true,
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 15000,
      requestTimeout: 30000,
    },
  }
}

function buildSqlAuthConfig(creds: DbCredentials): sql_.config {
  return {
    server: serverAddress(),
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    database: process.env.DB_DATABASE ?? 'edidb',
    user: creds.username,
    password: creds.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 15000,
      requestTimeout: 30000,
    },
  }
}

// Load the appropriate mssql variant.
// On Windows with msnodesqlv8 installed → use integrated auth driver.
// Otherwise → use standard mssql (SQL Server auth).
function getSql(integrated: boolean): typeof sql_ {
  if (integrated) {
    try {
      return _require('mssql/msnodesqlv8') as typeof sql_
    } catch {
      throw new Error(
        'Windows integrated authentication requires the msnodesqlv8 package. ' +
        'Run: npm install msnodesqlv8'
      )
    }
  }
  return sql_
}

export async function testConnection(creds?: DbCredentials): Promise<{ ok: boolean; error?: string }> {
  const integrated = !creds
  const sql = getSql(integrated)
  let pool: sql_.ConnectionPool | null = null
  try {
    pool = await sql.connect(integrated ? buildIntegratedConfig() : buildSqlAuthConfig(creds!))
    await pool.request().query('SELECT 1 AS ok')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    await pool?.close()
  }
}

export async function queryRaw(
  sql: string,
  creds?: DbCredentials,
): Promise<Record<string, unknown>[]> {
  const integrated = !creds
  const sqlModule = getSql(integrated)
  const pool = await sqlModule.connect(integrated ? buildIntegratedConfig() : buildSqlAuthConfig(creds!))
  try {
    const result = await pool.request().query(sql)
    return result.recordset as Record<string, unknown>[]
  } finally {
    await pool.close()
  }
}

export async function queryPreview(
  schema: string,
  tableName: string,
  columns: string[],
  creds?: DbCredentials,
): Promise<Record<string, unknown>[]> {
  if (columns.length === 0) return []

  const safeSchema = schema.replace(/[^\w]/g, '')
  const safeTable = tableName.replace(/[^\w]/g, '')
  const safeCols = columns.map(c => `[${c.replace(/]/g, '')}]`).join(', ')

  const integrated = !creds
  const sql = getSql(integrated)
  const pool = await sql.connect(integrated ? buildIntegratedConfig() : buildSqlAuthConfig(creds!))
  try {
    const result = await pool.request().query(
      `SELECT TOP 100 ${safeCols} FROM [${safeSchema}].[${safeTable}]`
    )
    return result.recordset as Record<string, unknown>[]
  } finally {
    await pool.close()
  }
}
