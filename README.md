# Schematics Metrics Dashboard

Production-ready dashboards for incident and work item metrics with live data from ediprod SQL Server.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev environment
npm run dev          # Frontend (Vite)
npm run server       # Backend (Express on port 3001)
```

Access the dashboard at **http://localhost:5173**

## 📁 Project Structure

```
schematics-metrics/
├── src/
│   ├── pages/
│   │   ├── Metrics.tsx              # INC Metric: Incident KPIs & trends
│   │   ├── WorkItems.tsx            # WKI Metric: Work item listing
│   │   └── WorkItemsMetrics.tsx      # WKI Drill Down: Lead time & throughput
│   ├── contexts/                    # React context providers
│   ├── types/                       # TypeScript interfaces
│   ├── App.tsx                      # Main app & routing
│   └── index.tsx                    # Entry point
├── server/
│   ├── index.ts                     # Express server & API endpoints
│   ├── db.ts                        # SQL Server connection (mssql + Windows Auth)
│   └── [data handlers]              # Query execution & caching
├── queries/                         # SQL query definitions
│   ├── schrg-queries.sql            # Incident metrics queries
│   └── work-items-query.sql         # Work item queries
├── public/                          # Static assets
├── package.json
├── vite.config.ts
└── README.md                        # This file
```

## 📊 Dashboards

### INC Metric (`/`)
**Incident metrics and KPIs**
- Monthly incident trends (volume + resolution time)
- All criticalities breakdown (CR1-CR9)
- Priority band analysis (CR1-CR2, CR3, CR4-CR5)
- Year selector for historical filtering
- Staff member performance metrics

### WKI Metric (`/work-items`)
**Work item listing and details**
- PRO/PRO/SSC filter (Product/ProductArea/Module)
- Query 1: ChangeType = TMC
- Query 2: ChangeType ≠ TMC
- Item counts and summaries
- Creation & assignment tracking

### WKI Drill Down (`/work-items-metrics`)
**Work item lead time & throughput analysis**
- Weekly throughput (items completed per week)
- Lead time tracking (first task start → last task completion)
- Trend charts with volume bars + time line
- Year selector for historical data
- Summary statistics (avg, min, max lead times)

## 🗄️ Database Connection

**Server**: `ediprod.db.corporate.cargowise.com`
**Database**: `ediprod`
**Auth**: Windows Integrated Authentication

### Key Tables
- `IncidentMain` – Incident core data (IM_*)
- `WorkItem` – Work item definitions (WKI_*)
- `WorkflowTask` – Task execution details (P9_*)

### Critical Columns
- **Incidents**: `IM_PK`, `IM_SystemCreateTimeUtc`, `IM_CloseTimeUtc`, `IM_Priority`
- **Work Items**: `WKI_PK`, `WKI_SystemCreateTimeUtc`, `WKI_WorkItemType`, `WKI_ActivitySubtype`
- **Tasks**: `P9_ActualDateUtc`, `P9_CompletedTimeUtc`, `P9_Status`

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schrg` | Incident metrics (monthly, yearly, YoY) |
| `GET` | `/api/work-items` | Work item listing (TMC + non-TMC) |
| `GET` | `/api/work-items-metrics` | Lead time & throughput trends |

## ⚙️ Configuration

### Environment Variables (optional)
```bash
DB_SERVER=ediprod.db.corporate.cargowise.com  # Default
DB_DATABASE=ediprod                            # Default
DB_PORT=1433                                   # Default
```

### Query Filter Parameters
- **Incidents**: Start 2024-09-01 | Staff: AER, BS8, KLT, RS6 | Exclude: CR6, FTR | Status: CLS
- **Work Items**: Product=PRO | ProductArea=PRO | Module=SSC | ChangeType=TMC or non-TMC
- **Lead Time**: First task start to last task completion (TaskStatus=CLS)

## 🛠️ Development

### Build & Run
```bash
npm install                # Install dependencies
npm run dev                # Dev server + hot reload
npm run server             # API server (Express)
npm run build              # Production build to dist/
```

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Charts**: Recharts (responsive bar/line/composed)
- **Backend**: Express.js + mssql package
- **Auth**: Windows Integrated Authentication
- **Icons**: Lucide React

## 🐛 Troubleshooting

### Database Connection Failed
- ✓ Check corporate VPN / network access
- ✓ Verify Windows domain auth (`CORP\Username`)
- ✓ Run: `npm run server` with admin privileges
- ✓ Check `server/db.ts` connection config

### Port Already in Use
```bash
# Find & kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### No Data in Dashboard
- ✓ Check server logs for SQL errors
- ✓ Verify database credentials & access
- ✓ Confirm query date ranges in `queries/`
- ✓ Check year selector (filters by selected year)

## 📝 SQL Queries

All queries are in the `queries/` folder:
- **schrg-queries.sql** – Incident metrics (monthly, yearly, YoY)
- **work-items-query.sql** – Work item filtering by product/area/module/change-type

Edit queries here and restart the server for changes to take effect.

## 📈 Metrics Explained

### Net Resolution Age
Calendar days from incident creation (`IM_SystemCreateTimeUtc`) to closure (`IM_CloseTimeUtc`).

### Work Item Lead Time
Time from first task actual start (`P9_ActualDateUtc`) to last task completion (`P9_CompletedTimeUtc`).
- A work item is **started** when first task begins
- A work item is **completed** when all tasks are closed

### Throughput
Number of items (incidents or work items) completed in a given period (week/month).
