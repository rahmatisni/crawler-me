#!/usr/bin/env bash
# Menjalankan server file hasil crawling.
#   ./scripts/serve.sh          # jalan di terminal ini (Ctrl+C untuk berhenti)
#   ./scripts/serve.sh --bg     # jalan di latar belakang, log di logs/server.log
#   ./scripts/serve.sh --stop   # hentikan server latar belakang
set -euo pipefail
cd "$(dirname "$0")/.."
PID_FILE=".server.pid"

case "${1:-}" in
  --stop)
    if [ -f "$PID_FILE" ] && kill "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Server dihentikan."; rm -f "$PID_FILE"
    else
      echo "Tidak ada server latar belakang yang berjalan."; rm -f "$PID_FILE"
    fi ;;
  --bg)
    mkdir -p logs
    nohup node src/server.js >> logs/server.log 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    tail -n 3 logs/server.log
    echo "PID $(cat "$PID_FILE"). Hentikan dengan: ./scripts/serve.sh --stop" ;;
  *)
    node src/server.js ;;
esac
