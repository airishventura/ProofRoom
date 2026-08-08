#!/bin/sh
set -e
echo "Waiting for database…"
# migrate uses compiled JS if available; fall back to tsx not present in prod
if [ -f dist/db/migrate.js ]; then
  node dist/db/migrate.js
else
  echo "No migrate.js — skip"
fi
echo "Starting API on :${PORT:-8787}"
exec node dist/index.js
