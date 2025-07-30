@echo off
echo 🎮 Assembly Summer 2025 Discord Activity Tracker Setup
echo =====================================================
echo.

REM Check if running in WSL
wsl --version >nul 2>&1
if %errorlevel% == 0 (
    echo 🐧 WSL is available on this system
    echo.
    echo For the best experience, please run this setup inside WSL:
    echo   1. Open WSL terminal: wsl
    echo   2. Navigate to the project directory
    echo   3. Run: ./setup.sh
    echo.
    echo Alternatively, continue with Windows Docker Desktop setup...
    pause
)

REM Check Docker Desktop
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    echo Please install Docker Desktop for Windows:
    echo https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
) else (
    echo ✅ Docker found
    docker --version
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Docker Compose is not available
        echo Please install Docker Desktop which includes Docker Compose
        pause
        exit /b 1
    ) else (
        echo ✅ Docker Compose (plugin) found
    )
) else (
    echo ✅ Docker Compose found
    docker-compose --version
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running
    echo Please start Docker Desktop
    pause
    exit /b 1
) else (
    echo ✅ Docker is running
)

echo.

REM Setup environment file
echo 📝 Setting up environment configuration...

if exist .env (
    echo ⚠️  .env file already exists
    set /p overwrite="Do you want to overwrite it? (y/N): "
    if /i "%overwrite%" neq "y" (
        echo Keeping existing .env file
    ) else (
        copy .env.example .env >nul
        echo ✅ .env file created from template
    )
) else (
    copy .env.example .env >nul
    echo ✅ .env file created from template
)

REM Create required directories
echo.
echo 📁 Creating required directories...
if not exist data mkdir data
if not exist backups mkdir backups
echo ✅ Directories created

REM Validate Docker Compose
echo.
echo 🔍 Validating Docker Compose configuration...
docker-compose config >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Docker Compose configuration is valid
) else (
    echo ❌ Docker Compose configuration has errors
    docker-compose config
    pause
    exit /b 1
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit the .env file with your Discord bot token and server ID
echo.
echo 2. Start the application:
echo    For WSL: wsl make dev
echo    For Windows: docker-compose up --build
echo.
echo 3. Open the dashboard:
echo    http://localhost:3000
echo.
echo 💡 Windows Tips:
echo   - For best performance, consider using WSL
echo   - Access dashboard via http://localhost:3000
echo   - Use Docker Desktop dashboard for container management
echo.
pause
