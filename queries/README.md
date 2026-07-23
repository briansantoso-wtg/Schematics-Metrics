# SQL Queries Reference

This folder contains all SQL queries used by the SCHRG Metrics dashboard.

## Files

### schrg-queries.sql
Incident metrics queries for the INC Metric dashboard.

**Queries:**
1. **monthlyQuery** - Monthly incident counts aggregated by staff member
   - Groups: Year, Month, Staff (AER, BS8, KLT, RS6)
   - Filters: Status = CLS, Exclude CR6/FTR priorities, Start date ≥ 2024-09-01
   - Output: YearNum, MonthNum, MonthName, Staff, Count

2. **yearlyQuery** - Yearly incident counts with priority breakdown
   - Groups: Year, Priority (CR1-CR9)
   - Filters: Status = CLS, Exclude CR6/FTR priorities, Start date ≥ 2024-09-01
   - Output: YearNum, Priority, Count

3. **priorityMonthlyQuery** - Monthly incident counts grouped by priority bands
   - Priority bands:
     - CR1-CR2 (Critical)
     - CR3 (High)
     - CR4-CR5 (Medium)
     - Other (CR7-CR9)
   - Filters: Status = CLS, Start date ≥ 2024-09-01
   - Output: YearNum, MonthNum, MonthName, PriorityBand, Count

4. **priorityWeeklyQuery** - Weekly incident counts by all criticalities (CR1-CR9)
   - Groups: Week start date, Criticality (CR1-CR9)
   - Filters: Status = CLS, Start date ≥ 2024-09-01
   - Calculation: Week = DATEADD(WEEK, DATEDIFF(WEEK, 0, IM_SystemCreateTimeUtc), 0)
   - Output: WeekStart, Criticality, Count

### work-items-query.sql
Work item metrics queries for WKI dashboards.

**Queries:**
1. **workItemsQuery** - Work items filtered by Product/ProductArea/Module
   - Filters: Product=PRO, ProductArea=PRO, Module=SSC
   - Splits results: Query 1 (ChangeType=TMC), Query 2 (ChangeType≠TMC)
   - Output: WKI_PK, WKI_WorkItemNumber, ProductCode, AreaCode, ModuleCode, ChangeTypeCode, ChangeTypeDescription, WKI_Summary, WKI_Status, WKI_Priority, timestamps

2. **leadTimeQuery** - Work item lead time and throughput metrics
   - Filters: Product=PRO, ProductArea=PRO, Module=SSC, ChangeType=TMC
   - Lead time: First task start (P9_ActualDateUtc) to last task completion (P9_CompletedTimeUtc)
   - Only includes items where tasks have status = CLS
   - Groups: Weekly (DATEADD(WEEK, ...))
   - Output: WeekStart, Throughput (completed items), AvgLeadTimeDays, AvgLeadTimeHours, MinLeadTimeDays, MaxLeadTimeDays, OpenItems

## Key Schema References

### IncidentMain Table (IM)
- `IM_PK` - Primary key
- `IM_SystemCreateTimeUtc` - Incident creation timestamp
- `IM_CloseTimeUtc` - Incident resolution timestamp
- `IM_Priority` - Priority code (CR1-CR9)
- `IM_Status` - Status (CLS = closed)

### WorkItem Table (WKI)
- `WKI_PK` - Primary key
- `WKI_WorkItemNumber` - Human-readable ID
- `WKI_SystemCreateTimeUtc` - Creation timestamp
- `WKI_SystemLastEditTimeUtc` - Last edit timestamp
- `WKI_WorkItemType` - Type ID
- `WKI_ActivitySubtype` - Subtype/change type

### WorkflowTask Table (WFT)
- `P9_ParentID` - Foreign key to WorkItem (WKI_PK)
- `P9_ActualDateUtc` - Task start timestamp
- `P9_CompletedTimeUtc` - Task completion timestamp
- `P9_Status` - Task status (CLS = closed)

### stmdata Table
- `WorkItemTypeTree` - XML field containing product/area/module/change-type mappings

## Usage in Application

### Backend (server/index.ts)
- **GET /api/schrg** - Executes all four queries from schrg-queries.sql
- **GET /api/work-items** - Executes workItemsQuery from work-items-query.sql
- **GET /api/work-items-metrics** - Executes leadTimeQuery from work-items-query.sql

### Frontend Pages
- **Metrics.tsx** - Consumes `/api/schrg` endpoint
- **WorkItems.tsx** - Consumes `/api/work-items` endpoint
- **WorkItemsMetrics.tsx** - Consumes `/api/work-items-metrics` endpoint

## Modifying Queries

To update a query:
1. Edit the `.sql` file in this folder
2. Restart the backend server: `npm run server`
3. No frontend rebuild needed - new query executes on next fetch

**Common modifications:**
- Change date filters: Look for `IM_SystemCreateTimeUtc >= '2024-09-01'` or `DATEADD(DAY, -180, ...)`
- Add/remove staff members: Edit the `IN ('AER', 'BS8', 'KLT', 'RS6')` lists
- Adjust priority bands: Modify `CASE WHEN IM_Priority IN (...)` statements
- Change aggregation period: Modify `DATEADD(WEEK/MONTH, ...)` calculations

## Testing Queries

Run queries directly in SQL Server Management Studio (SSMS):
- Server: `ediprod.db.corporate.cargowise.com`
- Database: `ediprod`
- Authentication: Windows Integrated Auth

Example:
```sql
SELECT TOP 10 * FROM IncidentMain WHERE IM_Status = 'CLS'
```

## Troubleshooting

**Query returns no results:**
- Check date filters match your data range
- Verify staff member codes exist in the database
- Ensure you're querying the correct table (ediprod, not edidb)

**Slow query performance:**
- Add indexes on frequently filtered columns (IM_Status, IM_Priority, WKI_WorkItemType)
- Reduce date range to smaller window
- Check SQL Server query plan with SSMS

**Column not found errors:**
- Verify column names are exact (case-sensitive in some contexts)
- Common mistakes: IM_ID (should be IM_PK), IM_UpdateTimeUtc (should be IM_CloseTimeUtc)
- Check table aliases (IM, WKI, WFT, etc.) match the FROM/JOIN clauses
