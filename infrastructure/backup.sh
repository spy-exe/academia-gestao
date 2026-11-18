#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${PGDATABASE:?Defina PGDATABASE}"
backup_dir="${BACKUP_DIR:-/var/lib/academia/backups}"
install -d -m 700 "$backup_dir"
backup_file="$backup_dir/$(date -u +%Y%m%dT%H%M%SZ).dump"
runuser -u postgres -- pg_dump --format=custom --dbname="$PGDATABASE" > "$backup_file"
pg_restore --list "$backup_file" > /dev/null
sha256sum "$backup_file" > "$backup_file.sha256"
find "$backup_dir" -maxdepth 1 -type f -name '*.dump*' -mtime +14 -delete
printf 'Backup verificado: %s\n' "$backup_file"
