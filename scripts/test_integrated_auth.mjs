import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const sql = require('mssql/msnodesqlv8')

const config = {
  server: 'ediprod.db.corporate.cargowise.com',
  database: 'edidb',
  driver: 'ODBC Driver 18 for SQL Server',
  options: {
    trustedConnection: true,
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    requestTimeout: 30000,
  },
}

try {
  const pool = await sql.connect(config)
  const result = await pool.request().query('SELECT SUSER_SNAME() AS suser, ORIGINAL_LOGIN() AS originalLogin')
  console.log(result.recordset)
  await pool.close()
} catch (err) {
  console.error('ERROR:', err)
  process.exit(1)
}
