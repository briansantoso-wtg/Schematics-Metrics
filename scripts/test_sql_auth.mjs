import sql from 'mssql'

const config = {
  server: 'ediprod.db.corporate.cargowise.com',
  port: 1433,
  database: 'edidb',
  user: 'brian.santoso@wisetechglobal.com',
  password: 'WISETECHyaoloh28!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    requestTimeout: 30000,
  },
}

try {
  const pool = await sql.connect(config)
  const result = await pool.request().query('SELECT TOP 1 1 AS ok')
  console.log(result.recordset)
  await pool.close()
} catch (err) {
  console.error('ERROR:', err)
  process.exit(1)
}
