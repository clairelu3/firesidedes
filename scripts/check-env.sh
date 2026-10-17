#!/usr/bin/env bash
# Says which keys are missing, without printing any key values.
cd "$(dirname "$0")/.."
missing=0
check() { # file var
  if ! grep -qE "^$2=.+" "$1" 2>/dev/null; then echo "✗ $2 is empty or missing in $1"; missing=1; fi
}
check backend/.env SUPABASE_URL
check backend/.env SUPABASE_SERVICE_ROLE_KEY
check backend/.env OPENAI_API_KEY
check .env.local VITE_SUPABASE_URL
check .env.local VITE_SUPABASE_ANON_KEY
[ $missing = 0 ] && echo "✓ All keys present"
exit $missing
