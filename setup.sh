#!/bin/bash
# ============================================================
#  SupplySense – One-Click Setup Script
#  Installs MongoDB 7.0, sets up Python venv, installs all
#  dependencies, seeds the database, and starts the project.
#
#  Usage:  chmod +x setup.sh && ./setup.sh
#  (Will ask for sudo password for MongoDB installation)
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_step() { echo -e "\n${GREEN}${BOLD}[✔] $1${NC}"; }
print_warn() { echo -e "${YELLOW}[!] $1${NC}"; }
print_err()  { echo -e "${RED}[✘] $1${NC}"; }

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─────────────────────────────────────────────────────────────
# Step 1: Install MongoDB 7.0 (if not already installed)
# ─────────────────────────────────────────────────────────────
if command -v mongod &>/dev/null; then
    print_step "MongoDB already installed: $(mongod --version | head -1)"
else
    print_step "Installing MongoDB 7.0..."
    
    # Install prerequisites
    sudo apt-get update -qq
    sudo apt-get install -y gnupg curl apt-transport-https

    # Import MongoDB public GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null

    # Add MongoDB repo (using Ubuntu 22.04/jammy which is compatible with Mint 22 / Noble)
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y mongodb-org

    print_step "MongoDB 7.0 installed successfully!"
fi

# ─────────────────────────────────────────────────────────────
# Step 2: Start MongoDB service
# ─────────────────────────────────────────────────────────────
print_step "Starting MongoDB service..."
sudo systemctl start mongod 2>/dev/null || sudo systemctl start mongodb 2>/dev/null || {
    # If systemd service doesn't exist, try starting manually
    sudo mkdir -p /var/lib/mongodb /var/log/mongodb
    sudo chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb 2>/dev/null || true
    sudo mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork
}
sudo systemctl enable mongod 2>/dev/null || sudo systemctl enable mongodb 2>/dev/null || true

# Verify MongoDB is running
sleep 2
if mongosh --eval "db.runCommand({ ping: 1 })" --quiet &>/dev/null; then
    print_step "MongoDB is running on port 27017 ✓"
else
    print_err "MongoDB failed to start. Check: sudo systemctl status mongod"
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 3: Backend setup
# ─────────────────────────────────────────────────────────────
print_step "Setting up backend..."
cd "$PROJECT_DIR/backend"

# Create .env from template if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    print_step "Created .env from .env.example"
fi

# Install Node dependencies
npm install
print_step "Backend dependencies installed ✓"

# Seed the database
print_step "Seeding database with sample data..."
npm run seed
print_step "Database seeded ✓"

# ─────────────────────────────────────────────────────────────
# Step 4: Frontend setup
# ─────────────────────────────────────────────────────────────
print_step "Setting up frontend..."
cd "$PROJECT_DIR/frontend"
npm install
print_step "Frontend dependencies installed ✓"

# ─────────────────────────────────────────────────────────────
# Step 5: Python analytics setup (using venv)
# ─────────────────────────────────────────────────────────────
print_step "Setting up Python analytics..."
cd "$PROJECT_DIR/analytics"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_step "Python virtual environment created"
fi

# Activate venv and install dependencies
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate
print_step "Python analytics dependencies installed ✓"

# ─────────────────────────────────────────────────────────────
# Step 6: Start all services
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  🌍 SupplySense – Setup Complete!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Starting all services..."
echo ""

# Start backend in background
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
echo -e "  ${GREEN}▸ Backend${NC}  → http://localhost:5000  (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 3

# Start frontend in background
cd "$PROJECT_DIR/frontend"
BROWSER=none npx react-scripts start &
FRONTEND_PID=$!
echo -e "  ${GREEN}▸ Frontend${NC} → http://localhost:3000  (PID: $FRONTEND_PID)"

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo -e "  ${BOLD}Open your browser:${NC} ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "  ${BOLD}Run analytics:${NC}"
echo -e "    cd analytics && source venv/bin/activate && python run_analysis.py"
echo ""
echo -e "  ${BOLD}Stop all services:${NC}"
echo -e "    kill $BACKEND_PID $FRONTEND_PID"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo ""

# Wait for background processes
wait
