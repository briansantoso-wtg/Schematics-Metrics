import { readAppData, writeAppData } from '../server/dataStore.js'

const data = readAppData()
writeAppData(data)
console.log(`Validated JSON seed data: ${data.tables.length} tables, ${data.columns.length} columns, ${data.domains.length} domains`)
