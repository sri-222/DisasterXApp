#!/usr/bin/env bash
# Keeps `adb reverse` tunnels (Metro on 8081, backend on 4000) alive across
# device disconnects, USB sleep, and adb server restarts. Those drop the
# reverse mapping silently (no app-visible error until the next request),
# which is what causes "Network request failed" in the app even though the
# backend and device are both fine. This polls and reapplies instead of
# needing a manual `adb reverse` every time.

PORTS=(8081 4000)
last_state=""

echo "Watching adb reverse tunnels for ports: ${PORTS[*]} (Ctrl+C to stop)"

while true; do
  state=$(adb get-state 2>/dev/null)

  if [ "$state" = "device" ]; then
    current=$(adb reverse --list 2>/dev/null)
    for p in "${PORTS[@]}"; do
      if ! echo "$current" | grep -q "tcp:$p tcp:$p"; then
        echo "$(date '+%H:%M:%S') reapplying adb reverse tcp:$p"
        adb reverse "tcp:$p" "tcp:$p" >/dev/null 2>&1
      fi
    done
  fi

  last_state="$state"
  sleep 2
done
