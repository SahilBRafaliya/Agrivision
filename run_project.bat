@echo off
REM AgriVision AI Project Runner Script for Windows
REM This script starts both the frontend and backend servers

echo 🚀 Starting AgriVision AI Platform...

REM Check if we're in the correct directory
if not exist "backend" (
    echo ❌ Error: Please run this script from the project root directory
    echo    The script expects to find 'backend' directory
    pause
    exit /b 1
)

if not exist "Frontend" (
    echo ❌ Error: Please run this script from the project root directory
    echo    The script expects to find 'Frontend' directory
    pause
    exit /b 1
)

REM Function to check if a port is in use
:check_port
netstat -an | findstr ":%1" >nul
goto :eof

echo 🔍 Checking port availability...

REM Check if ports are available
call :check_port 8000
if not errorlevel 1 (
    echo ⚠️  Port 8000 is already in use. Please stop the service using this port.
    pause
    exit /b 1
)

call :check_port 3000
if not errorlevel 1 (
    echo ⚠️  Port 3000 is already in use. Please stop the service using this port.
    pause
    exit /b 1
)

echo ✅ Ports 8000 and 3000 are available

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo ❌ Backend virtual environment not found
    echo    Please run the setup script first:
    echo    cd backend && setup_backend.bat
    pause
    exit /b 1
)

REM Check if frontend dependencies are installed
if not exist "Frontend\node_modules" (
    echo ❌ Frontend dependencies not found
    echo    Installing frontend dependencies...
    cd Frontend
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Frontend dependencies installed
)

REM Start backend server
echo 🔧 Starting backend server...
cd backend

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start backend
echo 📡 Starting FastAPI server on port 8000...
start "Backend Server" cmd /k "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

cd ..

REM Start frontend server
echo 🎨 Starting frontend server...
cd Frontend

REM Start frontend
echo 🌐 Starting React development server on port 3000...
start "Frontend Server" cmd /k "npm run dev"

REM Wait a moment for frontend to start
timeout /t 5 /nobreak >nul

cd ..

echo.
echo 🎉 AgriVision AI Platform is now running!
echo.
echo 📱 Access the application:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    API Documentation: http://localhost:8000/docs
echo.
echo 📋 Server windows have been opened separately.
echo    Close the "Backend Server" and "Frontend Server" windows to stop the servers.
echo.
echo 🎉 Setup complete! The application is ready to use.
echo.
pause
