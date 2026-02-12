# Trading Analytics Dashboard

Full-featured web UI for AI-powered trading analytics.

## Features

✅ **AI Chat Interface** - Natural language queries powered by Claude  
✅ **Interactive Charts** - Cumulative P&L, profit distribution, performance metrics  
✅ **Trade Heatmap** - Visualize performance by day/hour  
✅ **File Upload** - Import trades from CSV, Excel, or JSON  
✅ **Export Data** - Download trades as CSV  
✅ **Real-time Metrics** - Win rate, profit factor, avg win/loss  
✅ **Trade History** - Filterable, sortable table of all trades  

## Quick Deploy to AWS Amplify

### Prerequisites

1. AWS Account
2. GitHub account (or other git provider)
3. Your backend API URL: `https://3py7ugu4yc.execute-api.us-west-2.amazonaws.com/prod`

### Deployment Steps

#### Option 1: Deploy via Amplify Console (Recommended)

1. **Push to GitHub:**
   ```bash
   cd trading-dashboard
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy in Amplify:**
   - Go to AWS Console → Amplify
   - Click "New app" → "Host web app"
   - Connect your GitHub repo
   - Amplify auto-detects Next.js
   - Click "Save and deploy"

3. **Configure Environment Variable:**
   - In Amplify console → Environment variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://3py7ugu4yc.execute-api.us-west-2.amazonaws.com/prod`
   - Redeploy

#### Option 2: Deploy via Amplify CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
cd trading-dashboard
amplify init

# Add hosting
amplify add hosting

# Choose:
# - Hosting with Amplify Console
# - Manual deployment

# Publish
amplify publish
```

## Local Development

```bash
# Install dependencies
npm install

# Set environment variable
export NEXT_PUBLIC_API_URL="https://3py7ugu4yc.execute-api.us-west-2.amazonaws.com/prod"

# Run development server
npm run dev

# Open http://localhost:3000
```

## Environment Variables

Create `.env.local` for local development:

```
NEXT_PUBLIC_API_URL=https://3py7ugu4yc.execute-api.us-west-2.amazonaws.com/prod
```

## File Upload Format

### CSV Example:
```csv
timestamp,action,entry_price,exit_price,quantity,profit,ticker,interval
1770781800000,buy,25313.75,25342,1,425,NQH2026,5
```

### JSON Example:
```json
[
  {
    "timestamp": "1770781800000",
    "action": "buy",
    "entry_price": "25313.75",
    "exit_price": "25342",
    "quantity": "1",
    "profit": "425",
    "ticker": "NQH2026",
    "interval": "5"
  }
]
```

## Stack

- **Framework:** Next.js 14 (React)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **File Parsing:** PapaParse, XLSX
- **Icons:** Lucide React
- **Hosting:** AWS Amplify
- **Backend:** AWS Lambda + API Gateway

## Cost

**AWS Amplify Hosting:**
- Free tier: 1,000 build minutes/month, 15GB storage
- After free tier: ~$0.01 per build minute
- **Estimated:** $0-5/month

**Backend (Lambda + API Gateway):**
- Already deployed
- Pay per use
- **Estimated:** $5-15/month depending on usage

## Support

Check logs in Amplify Console → Your App → Build logs

## Features Roadmap

- [ ] Multi-account support
- [ ] Custom date range filters
- [ ] Strategy backtesting
- [ ] Email alerts
- [ ] Mobile responsive improvements
