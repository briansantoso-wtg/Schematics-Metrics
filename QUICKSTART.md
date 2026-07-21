# Quick Start - Schematics Metrics

Get the metrics dashboard running in 3 minutes.

## 1️⃣ Install & Build

```bash
cd "C:\Users\brian.santoso\OneDrive - WiseTech Global Pty Ltd\Desktop\Git\Schematics-Metrics"

npm install
npm run build
```

## 2️⃣ Start the Server

```bash
npm run server
```

You'll see:
```
API server → http://localhost:3001
```

## 3️⃣ Open in Browser

Visit: **http://localhost:3001/**

You should see the SCHRG Incident Metrics dashboard with:
- Year selector (2024, 2025, 2026)
- KPI cards (total incidents, avg resolution time, etc.)
- Interactive charts
- Monthly trends
- Staff performance comparison

## ✅ Working? Great!

You can now:

### Explore the Data
- Click "Year 2025" or "Year 2026" to see different data
- Scroll down to see all visualizations
- Try http://localhost:3001/schrg for the detailed KPI dashboard

### Use Mock Data (No VPN Needed)

If you don't have database access:
```bash
set USE_MOCK_DATA=1
npm run server
```

### Run in Development Mode (With Hot Reload)

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm run dev
```

Then visit: http://localhost:5173/

---

## 📚 Documentation

- **Full Setup Guide**: See [SETUP.md](SETUP.md)
- **Project Details**: See [README.md](README.md)
- **SCHRG Queries**: See [schrg-reporting/README.md](schrg-reporting/README.md)
- **SQL Queries**: See [schrg-reporting/queries.sql](schrg-reporting/queries.sql)

## 🆘 Troubleshooting

### Port 3001 in use?
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database not connecting?
1. Check you're on corporate VPN
2. Use `USE_MOCK_DATA=1` for demo data
3. See [SETUP.md](SETUP.md#database-connection-failed)

### Missing node_modules?
```bash
npm install
```

### TypeScript errors?
```bash
npm run build
```

---

## 📂 Project Structure at a Glance

```
├── src/pages/Metrics.tsx        ← Main dashboard
├── server/index.ts              ← API & data endpoints
├── schrg-reporting/queries.sql  ← SQL queries
├── public/*.csv                 ← Data files
└── package.json                 ← Dependencies & scripts
```

**Next**: Read [SETUP.md](SETUP.md) for detailed configuration and development instructions.
