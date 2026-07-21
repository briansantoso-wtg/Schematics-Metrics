import fs from 'fs/promises'

const sql = await fs.readFile(new URL('../public/schrg.sql', import.meta.url), 'utf8')
const body = {
  sql,
  credentials: {
    username: 'brian.santoso@wisetechglobal.com',
    password: 'WISETECHyaoloh28!',
  },
}

const res = await fetch('http://localhost:3001/api/rule-result/schrg', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const text = await res.text()
console.log(text)
if (!res.ok) process.exit(1)
