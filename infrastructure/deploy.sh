#!/usr/bin/env bash
set -euo pipefail
if [[ $# != 3 || ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Uso: deploy.sh COMMIT_SHA ARQUIVO_JAR DIRETORIO_DIST' >&2
  exit 2
fi
release_sha="$1"
artifact_jar="$(realpath "$2")"
artifact_frontend="$(realpath "$3")"
source "$(dirname "${BASH_SOURCE[0]}")/lib/releases.sh"
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
chmod 644 "$release_dir/frontend/version.json"
(cd "$release_dir" && find backend.jar frontend -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
runuser -u www-data -- test -r "$release_dir/frontend/index.html"
runuser -u www-data -- test -r "$release_dir/frontend/version.json"
previous_release=""
if [[ -L "$application_root/current" ]]; then previous_release="$(readlink -f "$application_root/current")"; fi
if activate_release "$release_dir"; then
  echo "Release $release_sha saudável."
  exit 0
fi
recover_release "$previous_release"
echo 'Publicação falhou.' >&2
exit 1
