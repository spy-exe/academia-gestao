#!/usr/bin/env bash
set -euo pipefail
if [[ "${APP_ENV:-}" != demo || "${PGDATABASE:-}" != *_demo ]]; then
 echo 'Seed permitido somente com APP_ENV=demo e PGDATABASE com sufixo _demo.' >&2
 exit 1
fi
psql -v ON_ERROR_STOP=1 -f "$(dirname "$0")/demo-seed.sql"
