#!/usr/bin/env bash

# ==============================================================================
# ContactDesk - Private Offline Personal CRM & Relationship Manager
# Desktop Launcher for macOS
# ==============================================================================

# Ensure script runs from the repository root directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || exit 1

# Ensure common macOS user binary directories are in PATH (Finder default environment)
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin:$HOME/.volta/bin:$HOME/.asdf/shims:$PATH"

clear
echo "=================================================================="
echo "                       ContactDesk CRM                            "
echo "        Private Offline Personal & Professional CRM              "
echo "=================================================================="
echo ""

# 1. Verify Node.js presence
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js was not found in your environment PATH."
  echo ""
  echo "Please install Node.js (v20+ or v26+) from https://nodejs.org"
  echo "or using Homebrew: brew install node"
  echo ""
  read -n 1 -s -r -p "Press any key to exit..."
  echo ""
  exit 1
fi

NODE_VERSION=$(node -v)
echo "✔ Node.js runtime detected: $NODE_VERSION"

# 2. Check and install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 First-time setup: Installing required local dependencies..."
  npm install
  if [ $? -ne 0 ]; then
    echo "❌ Error: npm install failed. Please check your system configuration."
    read -n 1 -s -r -p "Press any key to exit..."
    echo ""
    exit 1
  fi
  echo "✔ Dependencies installed."
fi

# 3. Verify client build
if [ ! -f "dist/index.html" ] && [ ! -f "dist/client/index.html" ]; then
  echo "🔨 Building local application assets..."
  npm run build
fi

# 4. Open default web browser once server initializes
(
  sleep 1.2
  echo "[ContactDesk] Opening web interface in your default browser..."
  open "http://127.0.0.1:3000"
) &

# 5. Launch the ContactDesk local server
echo ""
echo "🚀 Starting ContactDesk server..."
echo "🔒 Bound exclusively to loopback: http://127.0.0.1:3000"
echo "💾 SQLite Database: data/contactdesk.db"
echo ""
echo "To stop the server, press Ctrl+C or close this Terminal window."
echo "=================================================================="
echo ""

NODE_ENV=production node --experimental-strip-types src/server/server.ts
