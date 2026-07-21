;(async () => {
  try {
    const fs = await import('fs/promises')
    const sql = await fs.readFile(new URL('../public/schrg.sql', import.meta.url), 'utf8')
    const credentials = process.env.SCHRG_DB_USERNAME && process.env.SCHRG_DB_PASSWORD
      ? { username: process.env.SCHRG_DB_USERNAME, password: process.env.SCHRG_DB_PASSWORD }
      : undefined
    const res = await fetch('http://localhost:3001/api/rule-result/schrg', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sql, credentials }),
    })
    const txt = await res.text()
    console.log(txt)
  } catch (err) {
    console.error('ERROR:', err)
    process.exit(1)
  }
})()
