# SCHRG Incident Metrics Reporting

Unified folder for SCHRG KPI reporting, validation, and data exports.

## Structure

- **validate.js** - Main validation script. Compares SQL query results against CSV exports.
- **queries.sql** - Reference SQL queries for Yearly, Monthly, and YoY reporting
- **data/** - CSV exports
  - `schrg_yearly.csv` - 49 rows - Yearly incident metrics by staff and priority
  - `schrg_monthly.csv` - 80 rows - Monthly incident metrics
  - `schrg_yoy.csv` - 11 rows - Year-over-year comparison with improvement percentages

## Running Validation

```bash
node validate.js
```

### Requirements
- Windows Authentication (CORP\Brian.Santoso)
- Access to `ediprod.db.corporate.cargowise.com` / `edidb`
- `msnodesqlv8` driver installed

## Key Database Mappings

- **IncidentMain.IM_ID** → Uses **IM_PK** (primary key)
- **Resolution Time** → Uses **IM_ResolveTimeUtc** (not IM_SystemUpdateTimeUtc)
- **JOIN** → `IM.IM_PK = WF.P9_ParentID` (not IM_ID)

## Query Configuration

All three queries use these parameters:
- `@StartDate` = 2024-09-01
- `@StaffList` = AER, BS8, KLT, RS6
- `@ExcludePriorities` = CR6, FTR

Status filters: Only closed incidents (`IM_Status = 'CLS'`)
