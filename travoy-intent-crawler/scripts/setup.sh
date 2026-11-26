#!/usr/bin/env bash
# Setup awal: cek Node, install dependensi + Chromium, siapkan .env
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 1/4 Cek Node.js =="
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang. Pasang Node 22 LTS dulu (lihat install.md)." >&2
  exit 1
fi
NODE_VER="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VER%%.*}"
echo "Node $NODE_VER di $(command -v node) ($(node -p process.arch))"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node terlalu lama. Butuh Node 22 LTS (minimal 20.19)." >&2
  echo "Jika memakai conda, jalankan 'conda deactivate' lalu cek lagi 'which node'." >&2
  exit 1
fi

echo "== 2/4 Install dependensi =="
npm install

echo "== 3/4 Pastikan Chromium Playwright terpasang =="
npx playwright install chromium

echo "== 4/4 Siapkan .env =="
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env dibuat dari .env.example. Isi TWITTER_AUTH_TOKEN sebelum crawling."
else
  echo ".env sudah ada, tidak diubah."
fi
grep -q '^TWITTER_AUTH_TOKEN=.\+' .env || echo "PERHATIAN: TWITTER_AUTH_TOKEN di .env masih kosong."

chmod +x scripts/*.sh
echo
echo "Setup selesai. Langkah berikut:"
echo "  ./scripts/crawl.sh --list          # lihat daftar intent"
echo "  ./scripts/crawl.sh find_rest_area 20"
echo "  ./scripts/serve.sh                 # buka hasil di browser"
