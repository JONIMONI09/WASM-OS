#!/usr/bin/env bash
set -euo pipefail

echo "[JULES SETUP] Initializing cloud workspace environment for WASM-OS..."

# Ensure Node.js 24 is active & verify npm/npx availability
if command -v node &> /dev/null; then
  echo "[JULES SETUP] Active Node version: $(node -v)"
else
  echo "[JULES SETUP] ERROR: Node.js is not installed in the container environment!" >&2
  exit 1
fi

# Clean install dependencies without breaking on lockfile warnings
if [ -f "package.json" ]; then
  if [ -f "package-lock.json" ]; then
    echo "[JULES SETUP] Installing dependencies via 'npm ci'..."
    npm ci
  else
    echo "[JULES SETUP] package-lock.json missing. Running 'npm install' to generate deterministic lockfile..."
    npm install
  fi
else
  echo "[JULES SETUP] WARNING: package.json not found in workspace root."
fi

# Install Headless Playwright Chromium binaries for automated UI/VGA verification tests
if [ -f "package.json" ] && grep -q "playwright" package.json; then
  echo "[JULES SETUP] Installing Playwright Chromium browser binaries..."
  npx playwright install --with-deps chromium || npx playwright install chromium
fi

echo "[JULES SETUP] Workspace setup completed successfully. Ready for build, lint, and test execution."