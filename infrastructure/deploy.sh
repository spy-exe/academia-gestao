#!/usr/bin/env bash
set -euo pipefail
if [[ $# != 3 || ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Uso: deploy.sh COMMIT_SHA ARQUIVO_JAR DIRETORIO_DIST' >&2
  exit 2
fi
: "${PUBLIC_URL:?Defina PUBLIC_URL para validar o frontend publicado}"
release_sha="$1"
artifact_jar="$(realpath "$2")"
artifact_frontend="$(realpath "$3")"
application_root="${APPLICATION_ROOT:-/opt/academia}"
service_name="${SERVICE_NAME:-academia-demo}"
health_url="${HEALTH_URL:-http://127.0.0.1:8080/actuator/health}"
test -f "$artifact_jar"
test -f "$artifact_frontend/index.html"
release_dir="$application_root/releases/$release_sha"
if [[ -e "$release_dir" ]]; then
  echo 'Este commit já possui release; artefatos são imutáveis.' >&2
  exit 1
fi
install -d -m 755 "$application_root/releases" "$release_dir/frontend"
install -m 644 "$artifact_jar" "$release_dir/backend.jar"
cp -a "$artifact_frontend/." "$release_dir/frontend/"
chown -R root:root "$release_dir"
printf '{"commit":"%s"}\n' "$release_sha" > "$release_dir/frontend/version.json"
(cd "$release_dir" && sha256sum backend.jar frontend/index.html > SHA256SUMS)
runuser -u www-data -- test -r "$release_dir/frontend/index.html"
previous_release=""
if [[ -L "$application_root/current" ]]; then previous_release="$(readlink -f "$application_root/current")"; fi
ln -s "$release_dir" "$application_root/current.next"
mv -Tf "$application_root/current.next" "$application_root/current"
systemctl restart "$service_name"
for attempt in $(seq 1 40); do
  if curl -fs "$health_url" >/dev/null && curl -fs "$PUBLIC_URL/" >/dev/null && curl -fs "$PUBLIC_URL/version.json" | python3 -c 'import json,sys;sys.exit(0 if json.load(sys.stdin).get("commit")==sys.argv[1] else 1)' "$release_sha"; then
    echo "Release $release_sha saudável."
    exit 0
  fi
  sleep 1
done
if [[ -n "$previous_release" && -d "$previous_release" ]]; then
  ln -s "$previous_release" "$application_root/current.rollback"
  mv -Tf "$application_root/current.rollback" "$application_root/current"
  systemctl restart "$service_name"
fi
echo 'Health check falhou; release anterior restaurada quando disponível.' >&2
exit 1
