#!/usr/bin/env sh
# Starts the Docker stack with the current LAN IP injected into NETWORK_IP,
# so the address printed in the server log is always up to date.
set -e

ip=""
for iface in en0 en1 en2; do
  candidate=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [ -n "$candidate" ]; then
    ip="$candidate"
    break
  fi
done

if [ -n "$ip" ]; then
  export NETWORK_IP="$ip"
  echo "LAN IP detected: $ip"
else
  echo "Could not detect a LAN IP — falling back to NETWORK_IP from .env"
fi

docker compose up -d "$@"
