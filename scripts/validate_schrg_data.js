import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Windows native driver (msnodesqlv8)
let msnodesqlv8;
try {
  msnodesqlv8 = require('msnodesqlv8');
} catch (e) {
  console.error('msnodesqlv8 not available. Install it with: npm install msnodesqlv8');
  process.exit(1);
}

const config = {
  server: 'ediprod.db.corporate.cargowise.com',
  port: 1433,
  database: 'edidb',
  driver: msnodesqlv8,
  options: {
    trustedConnection: true,
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    requestTimeout: 30000,
  },
};

const queries = {
  yearly: `
    DECLARE @Mode NVARCHAR(10) = 'Yearly';
    DECLARE @StartDate DATETIME = '2024-09-01';
    DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
    DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';
    ;WITH Staffs AS (
        SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
    ), ExcludedPriorities AS (
        SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
    )
    SELECT
        YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
        WF.P9_GS_NKAssignedStaffMember AS StaffMember,
        IM.IM_Priority AS Priority,
        COUNT(DISTINCT IM.IM_ID) AS IncidentCount,
        ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS AvgDaysToClose,
        ROUND(MIN(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS MinDays,
        ROUND(MAX(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS MaxDays
    FROM IncidentMain IM
    INNER JOIN (
        SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
        FROM WorkflowTask
        WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
    ) WF ON IM.IM_ID = WF.P9_ParentID AND WF.rn = 1
    WHERE IM.IM_Status = 'CLS'
        AND IM.IM_SystemCreateTimeUtc >= @StartDate
        AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
    GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), WF.P9_GS_NKAssignedStaffMember, IM.IM_Priority
    ORDER BY Year DESC, StaffMember, Priority;
  `,
  monthly: `
    DECLARE @Mode NVARCHAR(10) = 'Monthly';
    DECLARE @StartDate DATETIME = '2024-09-01';
    DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
    DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';
    ;WITH Staffs AS (
        SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
    ), ExcludedPriorities AS (
        SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
    )
    SELECT
        YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
        MONTH(IM.IM_SystemCreateTimeUtc) AS Month,
        FORMAT(IM.IM_SystemCreateTimeUtc, 'yyyy-MM') AS YearMonth,
        WF.P9_GS_NKAssignedStaffMember AS StaffMember,
        COUNT(DISTINCT IM.IM_ID) AS IncidentCount,
        ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS AvgDaysToClose
    FROM IncidentMain IM
    INNER JOIN (
        SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
        FROM WorkflowTask
        WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
    ) WF ON IM.IM_ID = WF.P9_ParentID AND WF.rn = 1
    WHERE IM.IM_Status = 'CLS'
        AND IM.IM_SystemCreateTimeUtc >= @StartDate
        AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
    GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), MONTH(IM.IM_SystemCreateTimeUtc), FORMAT(IM.IM_SystemCreateTimeUtc, 'yyyy-MM'), WF.P9_GS_NKAssignedStaffMember
    ORDER BY Year DESC, Month DESC, StaffMember;
  `,
  yoy: `
    DECLARE @Mode NVARCHAR(10) = 'YoY';
    DECLARE @StartDate DATETIME = '2024-09-01';
    DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
    DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';
    ;WITH Staffs AS (
        SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
    ), ExcludedPriorities AS (
        SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
    ), YearlyStats AS (
        SELECT
            YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
            WF.P9_GS_NKAssignedStaffMember AS StaffMember,
            ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_SystemUpdateTimeUtc) / 86400.0), 4) AS AvgDays,
            COUNT(DISTINCT IM.IM_ID) AS IncidentCount
        FROM IncidentMain IM
        INNER JOIN (
            SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
            FROM WorkflowTask
            WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
        ) WF ON IM.IM_ID = WF.P9_ParentID AND WF.rn = 1
        WHERE IM.IM_Status = 'CLS'
            AND IM.IM_SystemCreateTimeUtc >= @StartDate
            AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
        GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), WF.P9_GS_NKAssignedStaffMember
    )
    SELECT
        Curr.Year AS CurrentYear,
        Curr.StaffMember,
        Curr.AvgDays AS CurrentAvgDays,
        Curr.IncidentCount AS CurrentCount,
        Prv.AvgDays AS PriorAvgDays,
        Prv.IncidentCount AS PriorCount,
        ROUND(((Prv.AvgDays - Curr.AvgDays) / NULLIF(Prv.AvgDays, 0) * 100), 2) AS ImprovementPercent
    FROM YearlyStats Curr
    LEFT JOIN YearlyStats Prv ON Curr.StaffMember = Prv.StaffMember AND Curr.Year = Prv.Year + 1
    ORDER BY CurrentYear DESC, StaffMember;
  `,
};

async function validateData() {
  const pool = new sql.ConnectionPool(config);

  try {
    console.log('Connecting to ediprod database...');
    await pool.connect();
    console.log('✓ Connected\n');

    console.log('Running yearly query...');
    const yearlyResult = await pool.request().query(queries.yearly);
    console.log(`✓ Found ${yearlyResult.recordset.length} yearly records\n`);

    console.log('Running monthly query...');
    const monthlyResult = await pool.request().query(queries.monthly);
    console.log(`✓ Found ${monthlyResult.recordset.length} monthly records\n`);

    console.log('Running YoY query...');
    const yoyResult = await pool.request().query(queries.yoy);
    console.log(`✓ Found ${yoyResult.recordset.length} YoY records\n`);

    // Load CSV data
    const publicDir = path.join(__dirname, '../public');
    const parseCSV = (content) => {
      const lines = content.trim().split('\n');
      if (lines.length === 0) return [];
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, i) => {
          const value = values[i];
          row[header] = isNaN(Number(value)) ? value : Number(value);
        });
        return row;
      });
    };

    const csvYearly = parseCSV(fs.readFileSync(path.join(publicDir, 'schrg_yearly.csv'), 'utf-8'));
    const csvMonthly = parseCSV(fs.readFileSync(path.join(publicDir, 'schrg_monthly.csv'), 'utf-8'));
    const csvYoy = parseCSV(fs.readFileSync(path.join(publicDir, 'schrg_yoy.csv'), 'utf-8'));

    console.log('CSV Data Summary:');
    console.log(`  Yearly: ${csvYearly.length} records`);
    console.log(`  Monthly: ${csvMonthly.length} records`);
    console.log(`  YoY: ${csvYoy.length} records\n`);

    // Compare
    const yearlyMatch = yearlyResult.recordset.length === csvYearly.length;
    const monthlyMatch = monthlyResult.recordset.length === csvMonthly.length;
    const yoyMatch = yoyResult.recordset.length === csvYoy.length;

    console.log('=== VALIDATION RESULTS ===\n');
    console.log(`Yearly records match: ${yearlyMatch ? '✓ YES' : '✗ NO'} (DB: ${yearlyResult.recordset.length}, CSV: ${csvYearly.length})`);
    console.log(`Monthly records match: ${monthlyMatch ? '✓ YES' : '✗ NO'} (DB: ${monthlyResult.recordset.length}, CSV: ${csvMonthly.length})`);
    console.log(`YoY records match: ${yoyMatch ? '✓ YES' : '✗ NO'} (DB: ${yoyResult.recordset.length}, CSV: ${csvYoy.length})`);

    if (!yearlyMatch || !monthlyMatch || !yoyMatch) {
      console.log('\n⚠️  Data mismatch detected! CSV files may need updating.\n');

      if (!yearlyMatch) {
        console.log('Yearly mismatch - first DB record:');
        console.log(yearlyResult.recordset[0]);
        console.log('First CSV record:');
        console.log(csvYearly[0]);
      }
    } else {
      console.log('\n✓ All data is 100% accurate!\n');
    }

    await pool.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

validateData();
