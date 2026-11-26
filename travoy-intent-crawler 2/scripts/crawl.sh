#!/usr/bin/env bash
# Menjalankan servis crawling satu intent atau semua intent, log disimpan di logs/.
#   ./scripts/crawl.sh <intent|all> [limit] [--dry-run] [--only=eksplisit|implisit]
#   ./scripts/crawl.sh --list
set -euo pipefail
cd "$(dirname "$0")/.."

INTENTS=$(ls src/services | sed -n 's/\.service\.js$//p')

usage() {
  echo "Pemakaian: ./scripts/crawl.sh <intent|all> [limit] [--dry-run] [--only=eksplisit|implisit]"
  echo "Intent tersedia:"; echo "$INTENTS" | sed 's/^/  - /'
}

[ $# -eq 0 ] && { usage; exit 1; }
[ "$1" = "--list" ] && { echo "$INTENTS"; exit 0; }

TARGET="$1"; shift
EXTRA=()
if [ $# -gt 0 ] && [[ "$1" =~ ^[0-9]+$ ]]; then EXTRA+=("--limit=$1"); shift; fi
EXTRA+=("$@")

if [ "$TARGET" = "all" ]; then
  ENTRY="src/run-all.js"
elif echo "$INTENTS" | grep -qx "$TARGET"; then
  ENTRY="src/services/$TARGET.service.js"
else
  echo "Intent '$TARGET' tidak dikenal." >&2; usage; exit 1
fi

mkdir -p logs
LOG="logs/${TARGET}_$(date +%Y-%m-%dT%H-%M-%S).log"
echo "Menjalankan $ENTRY ${EXTRA[*]:-} (log: $LOG)"
node "$ENTRY" ${EXTRA[@]+"${EXTRA[@]}"} 2>&1 | tee "$LOG"
