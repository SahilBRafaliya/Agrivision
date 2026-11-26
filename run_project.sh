#!/bin/bash

# AgriVision AI Project Runner Script
# This script starts both the frontend and backend servers

echo "🚀 Starting AgriVision AI Platform..."

# Check if we're in the correct directory
if [ ! -d "Backend" ] || [ ! -d "Frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   The script expects to find 'Backend' and 'Frontend' directories"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if ports are available
echo "🔍 Checking port availability..."

if check_port 8000; then
    echo "⚠️  Port 8000 is already in use. Please stop the service using this port."
    echo "   You can find the process with: lsof -i :8000"
    exit 1
fi

if check_port 3000; then
    echo "⚠️  Port 3000 is already in use. Please stop the service using this port."
    echo "   You can find the process with: lsof -i :3000"
    exit 1
fi

echo "✅ Ports 8000 and 3000 are available"

# Check if backend virtual environment exists
if [ ! -d "Backend/venv" ]; then
    echo "❌ Backend virtual environment not found"
    echo "   Please run the setup script first:"
    echo "   cd Backend && ./setup_backend.sh"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "Frontend/node_modules" ]; then
    echo "❌ Frontend dependencies not found"
    echo "   Installing frontend dependencies..."
    cd Frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
    echo "✅ Frontend dependencies installed"
fi

# Start backend server
echo "🔧 Starting backend server..."
cd Backend

# Activate virtual environment
source venv/bin/activate

# Start backend in background
echo "📡 Starting FastAPI server on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if check_port 8000; then
    echo "✅ Backend server started successfully (PID: $BACKEND_PID)"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
else
    echo "❌ Backend server failed to start"
    echo "   Check backend.log for details"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd ..

# Start frontend server
echo "🎨 Starting frontend server..."
cd Frontend

# Start frontend in background
echo "🌐 Starting React development server on port 3000..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if check_port 3000; then
    echo "✅ Frontend server started successfully (PID: $FRONTEND_PID)"
    echo "   Frontend URL: http://localhost:3000"
else
    echo "❌ Frontend server failed to start"
    echo "   Check frontend.log for details"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

cd ..

# Create a script to stop both servers
cat > stop_servers.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping AgriVision AI servers..."

# Find and kill backend server
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    BACKEND_PID=$(lsof -Pi :8000 -sTCP:LISTEN -t)
    kill $BACKEND_PID
    echo "✅ Backend server stopped (PID: $BACKEND_PID)"
else
    echo "ℹ️  Backend server not running"
fi

# Find and kill frontend server
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    FRONTEND_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    kill $FRONTEND_PID
    echo "✅ Frontend server stopped (PID: $FRONTEND_PID)"
else
    echo "ℹ️  Frontend server not running"
fi

echo "🎉 All servers stopped"
EOF

chmod +x stop_servers.sh

echo ""
echo "🎉 AgriVision AI Platform is now running!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "📋 Available commands:"
echo "   View backend logs: tail -f backend/backend.log"
echo "   View frontend logs: tail -f Frontend/frontend.log"
echo "   Stop servers: ./stop_servers.sh"
echo ""
echo "🔧 To stop the servers, press Ctrl+C or run: ./stop_servers.sh"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
echo "⏳ Servers are running. Press Ctrl+C to stop them."
while true; do
    sleep 1
    
    # Check if servers are still running
    if ! check_port 8000 || ! check_port 3000; then
        echo "❌ One or more servers stopped unexpectedly"
        cleanup
    fi
done
