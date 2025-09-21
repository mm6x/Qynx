#!/bin/bash

echo "🚀 Qynx - Premium File Sharing"
echo "=============================="

echo "🌐 Starting Next.js server on port 3000..."
npm start &
DEV_PID=$!

echo "⏳ Waiting 5 seconds for Next.js to start..."
sleep 5

if kill -0 $DEV_PID 2>/dev/null; then
    echo "✅ Next.js server is running!"
    echo ""
    echo "🔗 Starting ngrok tunnel..."
    ngrok http 3000 &
    NGROK_PID=$!

    echo ""
    echo "🎉 SUCCESS! Your Qynx app is now running:"
    echo "📱 Local access: http://localhost:3000"
    echo "🌍 Public access: Check ngrok dashboard or terminal for public URL"
    echo ""
    echo "Press Ctrl+C to stop both servers"

    trap "echo '🛑 Stopping servers...'; kill $DEV_PID $NGROK_PID 2>/dev/null; exit" INT

    wait
else
    echo "❌ Failed to start Next.js server"
    echo "💡 Try running: npm start"
    exit 1
fi
