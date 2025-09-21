#!/bin/bash

echo "🚀 Qynx - Alternative Build & Deploy"
echo "===================================="

echo "📦 Building with alternative method..."
export NODE_OPTIONS="--max-old-space-size=2048"

echo "🔧 Attempting build with increased memory..."
timeout 60 npx next build 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🌐 Starting production server..."
    npm start
else
    echo "❌ Build failed. Trying development mode instead..."
    echo "🛠️  Starting in development mode (recommended for now)"
    echo "📱 Your app will be available at: http://localhost:9002"
    npm run dev
fi
