#!/usr/bin/env bash
# One-time setup: frontend deps, Python venv + backend deps, env files from the templates.
set -e
cd "$(dirname "$0")/.."

# Vite + its native binaries need Node 20.19+; older Node silently skips them ("Cannot find native binding").
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||a===22&&b>=12||a===21||a===20&&b>=19?0:1)'; then
  echo "✗ Node $(node -v) is too old. Need 20.19+ (22 recommended)."
  echo "  With nvm:  nvm install 22 && nvm use 22      Without: https://nodejs.org (LTS)"
  exit 1
fi

echo "→ Installing frontend packages"
npm install

echo "→ Setting up Python backend (needs Python 3.10+)"
PY=$(command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3)
"$PY" -c 'import sys; assert sys.version_info >= (3, 10), f"Python 3.10+ required, found {sys.version.split()[0]}"'
[ -d backend/venv ] || "$PY" -m venv backend/venv
backend/venv/bin/pip install -q -r backend/requirements.txt

[ -f backend/.env ] || { cp backend/.env.example backend/.env; echo "→ Created backend/.env — fill in the keys"; }
[ -f .env.local ] || { cp .env.example .env.local; echo "→ Created .env.local — fill in the Supabase URL + publishable key"; }

scripts/check-env.sh || true
echo "✓ Setup done. Start everything with: npm start"
