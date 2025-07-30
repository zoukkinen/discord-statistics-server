#!/bin/bash

# Assembly Summer 2025 Discord Activity Tracker
# Cross-platform setup script for Windows WSL, Linux, and macOS

set -e

echo "🎮 Assembly Summer 2025 Discord Activity Tracker Setup"
echo "====================================================="

# Detect platform
OS=$(uname -s)
ARCH=$(uname -m)
WSL_DETECTED=""

if [[ -f /proc/version ]] && grep -qi microsoft /proc/version; then
    WSL_DETECTED="true"
    echo "🐧 Windows Subsystem for Linux detected"
elif [[ "$OS" == "Darwin" ]]; then
    echo "🍎 macOS detected"
    if [[ "$ARCH" == "arm64" ]]; then
        echo "🍎 Apple Silicon (ARM64) detected"
    fi
elif [[ "$OS" == "Linux" ]]; then
    echo "🐧 Linux detected"
fi

echo "  Architecture: $ARCH"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker Desktop:"
    echo "  - Windows: https://docs.docker.com/desktop/install/windows-install/"
    echo "  - macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "  - Linux: https://docs.docker.com/engine/install/"
    exit 1
else
    echo "✅ Docker found: $(docker --version)"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed"
        echo "Please install Docker Compose or use Docker Desktop which includes it"
        exit 1
    else
        echo "✅ Docker Compose (plugin) found"
        # Create an alias for docker-compose
        alias docker-compose='docker compose'
    fi
else
    echo "✅ Docker Compose found: $(docker-compose --version)"
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    echo "Please start Docker Desktop or Docker daemon"
    exit 1
else
    echo "✅ Docker is running"
fi

echo ""

# Setup environment file
echo "📝 Setting up environment configuration..."

if [[ -f .env ]]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
    else
        cp .env.example .env
        echo "✅ .env file created from template"
    fi
else
    cp .env.example .env
    echo "✅ .env file created from template"
fi

# Platform-specific optimizations
if [[ "$WSL_DETECTED" == "true" ]]; then
    echo ""
    echo "🐧 Applying WSL optimizations..."
    
    # Check if BuildKit variables are set
    if ! grep -q "DOCKER_BUILDKIT" ~/.bashrc 2>/dev/null; then
        echo "Adding Docker BuildKit optimization to ~/.bashrc"
        echo "" >> ~/.bashrc
        echo "# Docker BuildKit optimization for WSL" >> ~/.bashrc
        echo "export DOCKER_BUILDKIT=1" >> ~/.bashrc
        echo "export COMPOSE_DOCKER_CLI_BUILD=1" >> ~/.bashrc
    fi
    
    echo "✅ WSL optimizations applied"
    echo "💡 Tip: Restart your WSL session or run 'source ~/.bashrc' for optimizations to take effect"
fi

if [[ "$OS" == "Darwin" && "$ARCH" == "arm64" ]]; then
    echo ""
    echo "🍎 Apple Silicon detected - Docker will use ARM64 optimizations"
fi

# Create required directories
echo ""
echo "📁 Creating required directories..."
mkdir -p data
mkdir -p backups
echo "✅ Directories created"

# Validate Docker Compose file
echo ""
echo "🔍 Validating Docker Compose configuration..."
if docker-compose config &> /dev/null; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration has errors"
    docker-compose config
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your Discord bot token and server ID:"
echo "   nano .env"
echo ""
echo "2. Start the application:"
echo "   make dev          # Development mode"
echo "   make prod         # Production mode (with nginx)"
echo ""
echo "3. Open the dashboard:"
echo "   http://localhost:3000"
echo ""
echo "For help with commands, run: make help"

# Show platform-specific tips
if [[ "$WSL_DETECTED" == "true" ]]; then
    echo ""
    echo "💡 WSL Tips:"
    echo "  - Use 'make wsl-setup' for additional WSL optimizations"
    echo "  - Performance is better with named volumes (already configured)"
    echo "  - Access via http://localhost:3000 from Windows browsers"
fi

if [[ "$OS" == "Darwin" ]]; then
    echo ""
    echo "💡 macOS Tips:"
    echo "  - Docker Desktop handles ARM64/AMD64 compatibility automatically"
    echo "  - Use 'make build-multiplatform' for cross-platform builds"
fi
