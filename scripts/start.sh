#!/usr/bin/env bash
# Starts the backend (port 8000) and the frontend (port 5173) together. Ctrl+C stops both.
cd "$(dirname "$0")/.."
scripts/check-env.sh || echo "  (continuing — missing keys will cause errors)"

if lsof -nP -iTCP:8000 -sTCP:LISTEN 2>/dev/null | grep -q 127.0.0.1; then
  echo "→ Backend already running on 127.0.0.1:8000"
else
  (cd backend && venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000) &
  BACKEND=$!
  trap 'kill $BACKEND 2>/dev/null' EXIT
fi

npx vite "$@"
