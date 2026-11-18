#!/usr/bin/env bash
application_root="${APPLICATION_ROOT:-/opt/academia}"
service_name="${SERVICE_NAME:-academia-demo}"
health_url="${HEALTH_URL:-http://127.0.0.1:8080/actuator/health}"
: "${PUBLIC_URL:?Defina PUBLIC_URL para validar a aplicação publicada}"
install -d -m 755 "$application_root"
exec 9>"$application_root/.release.lock"
flock -n 9 || { echo 'Já existe uma publicação em andamento.' >&2; exit 1; }

wait_for_release() {
  local expected_sha="$1"
  local attempt
  for attempt in $(seq 1 "${HEALTH_ATTEMPTS:-40}"); do
    if curl -fsS --connect-timeout 2 --max-time 5 "$health_url" >/dev/null &&
      curl -fsS --connect-timeout 2 --max-time 5 "$PUBLIC_URL/" >/dev/null &&
      curl -fsS --connect-timeout 2 --max-time 5 "$PUBLIC_URL/version.json" |
        python3 -c 'import json,sys;sys.exit(0 if json.load(sys.stdin).get("commit")==sys.argv[1] else 1)' "$expected_sha"; then
      return 0
    fi
    sleep "${HEALTH_RETRY_DELAY:-1}"
  done
  return 1
}

activate_release() {
  local target_dir="$1"
  local staged_link="$application_root/.current.$$"
  ln -s "$target_dir" "$staged_link" || return 1
  if ! mv -Tf "$staged_link" "$application_root/current"; then
    rm -f "$staged_link"
    return 1
  fi
  systemctl restart "$service_name" || return 1
  wait_for_release "$(basename "$target_dir")"
}

recover_release() {
  local previous="$1"
  if [[ -n "$previous" && -d "$previous" ]] && activate_release "$previous"; then
    echo 'Release anterior restaurada e validada.' >&2
  else
    echo 'Falha ao validar a recuperação; intervenção operacional necessária.' >&2
  fi
}
