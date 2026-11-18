import { useSyncExternalStore } from "react";
const query = "(max-width: 600px)";
function subscribe(notify: () => void) {
  const media = window.matchMedia?.(query);
  if (!media) return () => {};
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
function snapshot() {
  return window.matchMedia?.(query).matches ?? false;
}
export function useMobile() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
