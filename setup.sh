#!/bin/bash

set -e

echo "================================"
echo "Trading Dashboard - Local Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env.local
echo ""
echo "⚙️  Creating environment file..."
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://3py7ugu4yc.execute-api.us-west-2.amazonaws.com/prod
EOF

echo "✅ Environment configured"

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "To deploy to AWS Amplify:"
echo "  1. Push to GitHub"
echo "  2. Connect repo in Amplify Console"
echo "  3. Amplify auto-deploys on push"
echo ""
