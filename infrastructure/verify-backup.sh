#!/usr/bin/env bash
set -euo pipefail
backup_file="$(realpath "${1:?Informe o arquivo de backup}")"
restore_db="academia_restore_check_$(date -u +%Y%m%d%H%M%S)_${RANDOM}"
sha256sum --check "$backup_file.sha256"
runuser -u postgres -- createdb "$restore_db"
trap 'runuser -u postgres -- dropdb "$restore_db"' EXIT
runuser -u postgres -- pg_restore --exit-on-error --no-owner --dbname "$restore_db" < "$backup_file"
runuser -u postgres -- psql --dbname "$restore_db" -v ON_ERROR_STOP=1 -tAc "SELECT json_build_object('students',(select count(*) from students),'plans',(select count(*) from plans),'teachers',(select count(*) from teachers),'invoices',(select count(*) from invoices),'workouts',(select count(*) from workouts),'assessments',(select count(*) from assessments));"
