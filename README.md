# Schematics Metrics - Standalone Environment

This is a standalone incident metrics reporting application extracted from the Data Governance Hub.

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run server

# In another terminal, start the Vite dev server (optional for HMR)
npm run dev
```

The app will be available at `http://localhost:3001`

## Project Structure

```
├── src/
│   ├── pages/
│   │   ├── Metrics.tsx          # Main metrics dashboard
│   │   └── SchrgReport.tsx       # SCHRG KPI dashboard
│   ├── components/              # Shared React components
│   ├── types/                   # TypeScript type definitions
│   ├── lib/                     # Utility functions
│   └── App.tsx                  # Main app component
├── server/
│   ├── index.ts                 # Express server & API endpoints
│   ├── db.ts                    # Database connection (mssql)
│   ├── dataStore.ts             # Data persistence
│   └── previewCache.ts          # Caching layer
├── schrg-reporting/
│   ├── queries.sql              # Reference SQL queries
│   ├── validate.js              # Validation script
│   ├── README.md                # SCHRG documentation
│   └── data/
│       ├── schrg_yearly.csv     # Yearly metrics (49 rows)
│       ├── schrg_monthly.csv    # Monthly metrics (80 rows)
│       └── schrg_yoy.csv        # Year-over-year (11 rows)
├── public/                      # Static assets & CSV data
└── package.json
```

## Features

### Metrics Dashboard (`/`)
- Interactive incident metrics visualization
- Year selector (2024-2026)
- KPI cards with live metrics
- Monthly trends chart
- Staff performance comparison
- Priority breakdown pie chart
- Year-over-year improvement tracking

### SCHRG KPI Dashboard (`/schrg`)
- Detailed incident data tables
- Multiple view modes (Dashboard/Table)
- Staff filtering
- CSV export functionality
- Priority-based analysis

## Database Connection

The app connects to the SQL Server database:
- **Server**: `ediprod.db.corporate.cargowise.com`
- **Database**: `edidb`
- **Auth**: Windows Integrated Authentication (requires corporate VPN)

### Database Tables Used
- `IncidentMain` (IM) - Core incident data
- `WorkflowTask` (WF) - Incident workflow assignments

### Key Column Mappings
- Primary Key: `IM.IM_PK` (not IM_ID)
- Resolution Time: `IM.IM_ResolveTimeUtc`
- Join Condition: `IM.IM_PK = WF.P9_ParentID`

## API Endpoints

### Data Endpoints
- `GET /api/schrg` - Fetch all SCHRG metrics (monthly, yearly, YoY)
- `GET /api/platform` - Platform info
- `POST /api/rule-result/:ruleId` - Execute custom SQL

### Data Files
- `GET /api/schrg/csv/:type` - Download CSV exports

## SQL Queries

All queries are defined in `schrg-reporting/queries.sql`:

1. **Yearly Metrics** - Incidents by Year, Staff, Priority
2. **Monthly Metrics** - Incidents by Year, Month, Staff
3. **Year-over-Year** - Improvement comparison across years

## Configuration

### Environment Variables
- `DB_SERVER` - SQL Server address (default: `ediprod.db.corporate.cargowise.com`)
- `DB_DATABASE` - Database name (default: `edidb`)
- `DB_PORT` - Port (default: `1433`)
- `USE_MOCK_DATA` - Use mock data instead of DB (set to `1`)

### Filter Parameters
All queries apply:
- **Start Date**: 2024-09-01
- **Staff Members**: AER, BS8, KLT, RS6
- **Excluded Priorities**: CR6, FTR
- **Status**: CLS (closed incidents only)

## Development

### Build & Deploy
```bash
npm run build      # Build React app to dist/
npm run server     # Start API server on port 3001
```

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Charts**: Recharts
- **Server**: Express.js
- **Database**: mssql (Node.js driver)
- **Icons**: Lucide React

## Troubleshooting

### Database Connection Issues
- Ensure you're on the corporate network/VPN
- Check Windows domain authentication (`CORP\Username`)
- Verify database user has access to `edidb`

### Port 3001 Already in Use
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Missing Dependencies
```bash
npm install
npm run build
```

## Support

For issues or questions about the metrics data, refer to:
- SCHRG Query Documentation: `schrg-reporting/README.md`
- SQL Queries: `schrg-reporting/queries.sql`
- Data Validation: `schrg-reporting/validate.js`
