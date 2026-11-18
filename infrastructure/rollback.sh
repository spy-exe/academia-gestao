#!/usr/bin/env bash
set -euo pipefail
if [[ $# != 1 || ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Uso: rollback.sh COMMIT_SHA' >&2
  exit 2
fi
source "$(dirname "${BASH_SOURCE[0]}")/lib/releases.sh"
release_dir="$application_root/releases/$1"
test -d "$release_dir"
(cd "$release_dir" && sha256sum --check SHA256SUMS)
previous_release="$(readlink -f "$application_root/current")"
if activate_release "$release_dir"; then
  echo "Rollback para $1 validado."
  exit 0
fi
recover_release "$previous_release"
echo 'Rollback falhou.' >&2
exit 1
