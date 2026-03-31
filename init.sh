#!/bin/bash

# Notify Mom Application - Initialization Script
# This script sets up the application for the first run

set -e  # Exit on error

echo "================================"
echo "Notify Mom - Setup Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js installation
echo -e "${YELLOW}[1/5]${NC} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"
echo ""

# Check npm installation
echo -e "${YELLOW}[2/5]${NC} Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"
echo ""

# Create folder structure
echo -e "${YELLOW}[3/5]${NC} Creating folder structure..."
mkdir -p data
mkdir -p logs
echo -e "${GREEN}✓ Folders created:${NC}"
echo "  - data/ (for SQLite database)"
echo "  - logs/ (for application logs)"
echo ""

# Install dependencies
echo -e "${YELLOW}[4/5]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build TypeScript
echo -e "${YELLOW}[5/5]${NC} Building TypeScript..."
npm run build
echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ IMPORTANT: Configure your .env file before continuing${NC}"
    echo "  See: OAUTH2_SETUP.md for detailed OAuth2 configuration"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your Google OAuth2 credentials"
echo "  2. Run: npm run auth (to authenticate with Google)"
echo "  3. Run: npm test (to verify setup)"
echo "  4. Run: npm start (to start the application)"
echo ""
echo "For detailed setup instructions, see: OAUTH2_SETUP.md"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration:"
echo "   nano .env"
echo ""
echo "2. Run the application:"
echo "   npm start"
echo ""
echo "3. Or run with Docker:"
echo "   docker-compose up"
echo ""
