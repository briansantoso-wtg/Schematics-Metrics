# Setup Guide - Schematics Metrics

This guide will help you set up the standalone Metrics environment.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Corporate VPN access (for database connections)
- Windows domain authentication (CORP\Username)

## Installation Steps

### 1. Initialize the Project

```bash
cd "C:\Users\brian.santoso\OneDrive - WiseTech Global Pty Ltd\Desktop\Git\Schematics-Metrics"

# Install dependencies
npm install
```

### 2. Configure Environment (Optional)

Copy `.env.example` to `.env` and update as needed:

```bash
cp .env.example .env
```

Default configuration uses Windows Integrated Authentication and will connect to:
- Server: `ediprod.db.corporate.cargowise.com`
- Database: `edidb`

### 3. Build the Frontend

```bash
npm run build
```

This creates the `dist/` folder with the compiled React app.

### 4. Start the Server

**Terminal 1** - Start the API server:
```bash
npm run server
```

Expected output:
```
> operational-data-prototype@0.0.0 server
> tsx watch server/index.ts

API server → http://localhost:3001
```

### 5. Access the Application

Open your browser and navigate to:
- **Metrics Dashboard**: http://localhost:3001/
- **SCHRG KPI Report**: http://localhost:3001/schrg

## Running in Development Mode

If you want hot module reloading (HMR) for faster development:

**Terminal 1** - Start the API server:
```bash
npm run server
```

**Terminal 2** - Start the Vite dev server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite) with the API on `http://localhost:3001`.

## Using Mock Data

If you don't have database access, you can use mock data:

```bash
# Set USE_MOCK_DATA environment variable
set USE_MOCK_DATA=1
npm run server
```

All metrics will be populated with sample data for 2024-2026.

## Verifying Installation

### Check Database Connection

```bash
curl http://localhost:3001/api/schrg
```

Expected response: JSON with `monthly`, `yearly`, and `yoy` data arrays.

### Check Frontend

Visit `http://localhost:3001/` in your browser. You should see:
- SCHRG Incident Metrics dashboard
- Year selector dropdown
- Four KPI stat cards
- Charts showing trends and performance

## Common Issues

### Port 3001 Already in Use

```bash
# Find the process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with the actual PID)
taskkill /PID <PID> /F

# Restart the server
npm run server
```

### Database Connection Failed

**Error**: `Login failed for user 'CORP\Username'`

**Solution**:
1. Ensure you're on corporate VPN
2. Check your Windows authentication is active
3. Verify database user has access to `edidb`

**Alternative**: Use mock data with `USE_MOCK_DATA=1`

### Missing Dependencies

```bash
npm install
npm audit fix
npm run build
```

### TypeScript Errors

```bash
npm run build  # This will show any TypeScript compilation errors
```

## Project Structure Quick Reference

```
Schematics-Metrics/
├── src/
│   ├── pages/Metrics.tsx           # Main dashboard (localhost:3001/)
│   ├── pages/SchrgReport.tsx       # SCHRG report (localhost:3001/schrg)
│   ├── components/                 # Shared components
│   ├── types/                      # TypeScript types
│   └── App.tsx                     # Route definitions
├── server/
│   ├── index.ts                    # Express server & API routes
│   ├── db.ts                       # Database connection
│   └── dataStore.ts                # Data persistence
├── schrg-reporting/
│   ├── queries.sql                 # SQL queries reference
│   ├── validate.js                 # Data validation script
│   └── data/                       # CSV export files
├── public/                         # Static assets
├── dist/                           # Built app (created by npm run build)
├── package.json                    # Dependencies
├── vite.config.ts                  # Build configuration
└── tsconfig.json                   # TypeScript configuration
```

## Next Steps

1. **Explore the Metrics Dashboard** - Visit http://localhost:3001/ and try:
   - Selecting different years
   - Filtering by staff members
   - Exporting CSV data

2. **Review the Queries** - Check `schrg-reporting/queries.sql` to understand:
   - What data is being queried
   - Filter parameters (dates, staff, priorities)
   - Column mappings

3. **Customize Reports** - Edit React components in `src/pages/` to:
   - Add new visualizations
   - Change metrics calculations
   - Modify filtering options

## Git Initialization

When ready to version control this project:

```bash
git init
git add .
git commit -m "Initial commit: Standalone metrics environment"
git remote add origin <your-repo-url>
git push -u origin main
```

Create a `.gitignore` with:
```
node_modules/
dist/
.env
.DS_Store
*.log
```

## Support & Documentation

- **Metrics FAQ**: See README.md
- **SCHRG Details**: See schrg-reporting/README.md
- **SQL Reference**: See schrg-reporting/queries.sql
