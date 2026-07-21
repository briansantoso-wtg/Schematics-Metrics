import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../data')
const TABLES_FILE = resolve(DATA_DIR, 'tables.json')
const META_FILE = resolve(DATA_DIR, 'meta.json')

// Path to the CSV file
const CSV_FILE = resolve(
  process.env.USERPROFILE || '',
  'OneDrive - WiseTech Global Pty Ltd/Downloads/Staff Data for Data governance.csv'
)

// --- Parse CSV ---
const csvRaw = readFileSync(CSV_FILE, 'utf-8').replace(/^\uFEFF/, '')
const lines = csvRaw.split(/\r?\n/).filter(l => l.trim())
const header = lines[0].split(',')
const codeIdx = header.indexOf('GS_Code')
const nameIdx = header.indexOf('GS_FullName')
const titleIdx = header.indexOf('GS_Title')
const deptIdx = header.indexOf('GE_Desc')
const empDateIdx = header.indexOf('GS_EmploymentDate')
const lastDayIdx = header.indexOf('GS_LastDayOfWork')

if (nameIdx === -1) {
  console.error('Could not find GS_FullName column')
  process.exit(1)
}

function parseRow(line) {
  const cols = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue }
    current += ch
  }
  cols.push(current.trim())
  return cols
}

function cleanDate(val) {
  if (!val || val === 'NULL') return null
  // "2015-08-27 00:00:00" → "2015-08-27"
  return val.split(' ')[0]
}

const staffRecords = []
const seenCodes = new Set()

for (let i = 1; i < lines.length; i++) {
  const cols = parseRow(lines[i])

  const code = cols[codeIdx] || ''
  const name = cols[nameIdx] || ''
  const title = cols[titleIdx] || ''
  const dept = cols[deptIdx] || ''
  const empDate = cols[empDateIdx] || 'NULL'
  const lastDay = cols[lastDayIdx] || 'NULL'

  // Skip empty names, service accounts, machine accounts
  if (!name) continue
  if (name.startsWith('s_')) continue
  if (name.startsWith('WTGS') || name.startsWith('WTG')) continue
  if (name.startsWith('vpt.')) continue
  if (!title) continue
  if (name.includes('@')) continue

  // Skip staff who have already left
  if (lastDay !== 'NULL') {
    const d = new Date(lastDay)
    if (!isNaN(d.getTime()) && d < new Date()) continue
  }

  // Deduplicate by code
  if (seenCodes.has(code)) continue
  seenCodes.add(code)

  staffRecords.push({
    code,
    fullName: name,
    title: title || null,
    department: dept || null,
    employmentDate: cleanDate(empDate),
    lastDayOfWork: cleanDate(lastDay),
  })
}

// Sort by name
staffRecords.sort((a, b) => a.fullName.localeCompare(b.fullName))

console.log(`Parsed ${staffRecords.length} active staff members from CSV`)

// --- Update meta.json ---
const meta = JSON.parse(readFileSync(META_FILE, 'utf-8'))
const oldOwnersCount = meta.owners.length
meta.owners = staffRecords
writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + '\n')
console.log(`Updated meta.json: replaced ${oldOwnersCount} owners with ${staffRecords.length} staff records`)

// --- Clear owners from tables.json ---
const tables = JSON.parse(readFileSync(TABLES_FILE, 'utf-8'))
let cleared = 0
for (const table of tables) {
  if (table.primaryOwner) { table.primaryOwner = null; cleared++ }
  if (table.secondaryOwner) { table.secondaryOwner = null; cleared++ }
  if (Array.isArray(table.subtables)) {
    for (const sub of table.subtables) {
      if (sub.primaryOwner) { sub.primaryOwner = null; cleared++ }
      if (sub.secondaryOwner) { sub.secondaryOwner = null; cleared++ }
    }
  }
}
writeFileSync(TABLES_FILE, JSON.stringify(tables, null, 2) + '\n')
console.log(`Cleared ${cleared} owner assignments from tables.json`)

console.log('Done!')
