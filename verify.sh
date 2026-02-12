#!/bin/bash

echo "================================"
echo "Pre-Deploy Verification"
echo "================================"
echo ""

# Check required directories
echo "Checking required directories..."
MISSING=0

if [ ! -d "app" ]; then
    echo "❌ Missing: app/"
    MISSING=1
else
    echo "✅ app/"
fi

if [ ! -d "components" ]; then
    echo "❌ Missing: components/"
    MISSING=1
else
    echo "✅ components/"
fi

# Check required files
echo ""
echo "Checking required files..."

FILES=(
    "package.json"
    "next.config.js"
    "tsconfig.json"
    "tailwind.config.js"
    "amplify.yml"
    "app/page.tsx"
    "app/layout.tsx"
    "app/globals.css"
)

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing: $file"
        MISSING=1
    else
        echo "✅ $file"
    fi
done

# Check component files
echo ""
echo "Checking components..."

COMPONENTS=(
    "components/ChatInterface.tsx"
    "components/MetricsPanel.tsx"
    "components/PerformanceCharts.tsx"
    "components/TradeHeatmap.tsx"
    "components/TradesList.tsx"
    "components/FileUpload.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ ! -f "$component" ]; then
        echo "❌ Missing: $component"
        MISSING=1
    else
        echo "✅ $component"
    fi
done

echo ""
if [ $MISSING -eq 0 ]; then
    echo "✅ All files present!"
    echo ""
    echo "Ready to deploy. Run:"
    echo "  git add ."
    echo "  git commit -m 'Trading dashboard'"
    echo "  git push"
else
    echo "❌ Some files are missing. Please extract the full archive."
    exit 1
fi
