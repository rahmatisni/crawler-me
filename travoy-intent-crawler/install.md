# Panduan Instalasi dan Penggunaan — Travoy Intent Crawler

Panduan ini membawa Anda dari laptop kosong sampai hasil crawling bisa dibuka di browser lewat port tertentu.
Contoh perintah ditulis untuk **macOS** (zsh/bash). Catatan untuk Windows ada di bagian akhir.

```
setup.sh ──► isi .env ──► crawl.sh (per intent) ──► output/ (JSON + CSV + Excel) ──► serve.sh (http://localhost:8080)
```

---

## 1. Prasyarat

| Kebutuhan | Versi | Cek |
|---|---|---|
| Node.js | 22 LTS (minimal 20.19) | `node -v` |
| npm | ikut Node | `npm -v` |
| Git | bebas | `git --version` |
| Akun X | sebaiknya akun khusus riset | login di x.com |

### Pasang Node 22 (macOS, Homebrew)

```bash
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verifikasi:

```bash
which node            # /opt/homebrew/opt/node@22/bin/node
node -v               # v22.x
node -p process.arch  # arm64 di Mac Apple Silicon
```

> **Pengguna conda:** environment `(base)` bisa membawa Node lama (misalnya v16) yang menimpa Node 22.
> Jika `which node` mengarah ke folder `anaconda3`/`miniconda3`, jalankan `conda deactivate`,
> atau pastikan baris `export PATH=...node@22...` berada **setelah** blok `conda init` di `~/.zshrc`.

---

## 2. Ambil kode

Dari Git:

```bash
git clone <url-repo-anda> travoy-intent-crawler
cd travoy-intent-crawler
```

Atau dari zip:

```bash
unzip travoy-intent-crawler.zip
cd travoy-intent-crawler
```

Semua perintah berikutnya dijalankan dari **folder root proyek** ini (folder yang berisi `package.json`).

---

## 3. Setup otomatis

```bash
bash scripts/setup.sh
```

Skrip ini:

1. memeriksa versi dan lokasi Node;
2. menjalankan `npm install` (termasuk patch tweet-harvest dan unduhan Chromium);
3. memastikan Chromium untuk Playwright terpasang;
4. membuat `.env` dari `.env.example` bila belum ada (file `.env` yang sudah ada tidak diubah);
5. memberi izin eksekusi ke semua skrip di `scripts/`.

---

## 4. Isi `.env`

### Ambil `auth_token`

1. Login ke **x.com** di Chrome.
2. Buka DevTools (`Cmd+Option+I`) → tab **Application** → **Cookies** → `https://x.com`.
3. Salin nilai cookie **`auth_token`**.
4. Tempel ke `.env`:

```env
TWITTER_AUTH_TOKEN=nilai_auth_token_anda
```

Token ini setara password akun. Jangan dibagikan, jangan di-commit (`.env` sudah ada di `.gitignore`).
Jika logout dari x.com, token lama tidak berlaku dan harus diambil ulang.

### Variabel penting

| Variabel | Default | Keterangan |
|---|---|---|
| `HARVEST_ENGINE` | `playwright` | `playwright` (disarankan) atau `tweet-harvest` |
| `HEADLESS` | `true` | `false` = jendela browser terlihat. Pakai `false` jika hasil kosong |
| `BROWSER_CHANNEL` | `chromium` | `chromium` (headless baru) atau `chrome` (Google Chrome terpasang) |
| `TWEET_LANG` | `id` | Kosongkan (`TWEET_LANG=`) untuk tanpa filter bahasa |
| `EXCLUDE_RETWEETS` | `true` | `false` untuk ikut mengambil retweet |
| `SINCE` / `UNTIL` | kosong | Rentang tanggal `YYYY-MM-DD`; kosong = tanpa batas |
| `LIMIT_PER_KEYWORD` | `200` | Jumlah tweet maksimal per keyword |
| `PAUSE_BETWEEN_KEYWORDS_SEC` | `60` | Jeda antar keyword agar tidak kena rate limit |
| `ANONYMIZE_USER` | `true` | Username di-hash; user_id dan lokasi tidak disimpan |
| `HASH_SALT` | — | Ganti dengan string acak |
| `DEBUG_DUMP` | `false` | `true` = selalu simpan screenshot dan log jaringan |
| `SERVER_PORT` | `8080` | Port server hasil |
| `SERVER_HOST` | `127.0.0.1` | `0.0.0.0` agar bisa diakses dari perangkat lain |
| `SERVER_ACCESS_KEY` | kosong | Kunci akses server; wajib diisi bila `SERVER_HOST=0.0.0.0` |

---

## 5. Uji tanpa crawling (dry run)

Melihat query yang akan dikirim, tanpa membuka browser:

```bash
./scripts/crawl.sh --list                       # daftar intent
./scripts/crawl.sh find_rest_area --dry-run     # query satu intent
./scripts/crawl.sh all --dry-run                # query semua intent
```

---

## 6. Uji crawling kecil

Jalankan satu intent, 20 tweet per keyword, dengan browser terlihat:

```bash
HEADLESS=false ./scripts/crawl.sh find_ev_charger 20
```

Output yang diharapkan:

```
(1/10) [eksplisit] spklu tol -filter:retweets
  │ Membuka: https://x.com/search?q=spklu%20tol%20-filter%3Aretweets&src=typed_query&f=live
  │ terkumpul 0 (jaringan) / 10 (layar)
  │ ...
  │ Sumber data: dom
✓ ok: 20 diambil, 20 unik baru (total 20)
```

Hentikan kapan saja dengan `Ctrl+C`; data keyword yang sudah selesai tetap tersimpan.

Jika berhasil dengan `HEADLESS=false` tetapi kosong tanpa itu, lihat bagian Troubleshooting.

---

## 7. Crawling penuh

Satu intent per perintah (disarankan, lebih mudah dipantau):

```bash
./scripts/crawl.sh emergency_call
./scripts/crawl.sh get_traffic_info 100
./scripts/crawl.sh find_rest_area 100 --only=implisit
```

Semua intent berurutan:

```bash
./scripts/crawl.sh all 100
```

Setiap eksekusi mencatat log ke `logs/<intent>_<waktu>.log`.

| Intent | Isi |
|---|---|
| `emergency_call` | Bantuan darurat: kecelakaan, mogok, derek |
| `get_traffic_info` | Kondisi lalu lintas tol |
| `find_rest_area` | Rest area terdekat |
| `find_gas_station` | SPBU di tol |
| `find_ev_charger` | SPKLU / charger mobil listrik |
| `get_toll_transactions` | Riwayat transaksi tol |
| `check_card_balance` | Saldo kartu e-toll |
| `check_toll_tariff` | Tarif tol |
| `open_travoy_go` | Membuka aplikasi Travoy Go |
| `play_travoy_fm` | Siaran radio / musik Travoy FM |
| `get_near_me` | Siaran info sekitar / broadcast lalu lintas |

Keyword tiap intent ada di `src/services/<intent>.service.js` (kelompok `eksplisit` dan `implisit`).

---

## 8. Hasil crawling

```
output/
├── find_ev_charger/
│   ├── find_ev_charger_2026-11-26T05-16-54.json   ← hasil satu run (JSON, format tetap)
│   ├── find_ev_charger_2026-11-26T05-16-54.csv    ← hasil run yang sama (CSV)
│   └── _raw/…                                     ← CSV mentah & folder debug (tidak dibagikan server)
└── export/
    ├── csv/
    │   ├── emergency_call.csv                     ← semua run satu intent digabung
    │   └── find_ev_charger.csv
    └── korpus_intent.xlsx                         ← Excel: satu sheet per intent + sheet Ringkasan
```

- File JSON dan CSV per run ditulis ulang setiap satu keyword selesai.
- Folder `export/` diperbarui otomatis setiap kali satu servis selesai.
- Untuk membangun ulang `export/` secara manual: `npm run export`.
- CSV memakai UTF-8 dengan BOM sehingga langsung terbaca benar di Excel.
- Kolom `matched_keywords` dan `keyword_types` berisi beberapa nilai yang dipisahkan ` | `.
- Kolom `source` menunjukkan asal data: `graphql` (respons jaringan) atau `dom` (dibaca dari layar).
  Data `dom` hanya berisi teks, username, tanggal, dan URL; jumlah like/retweet bernilai 0.

---

## 9. Akses file lewat port

### Jalankan server

```bash
./scripts/serve.sh            # di terminal ini, Ctrl+C untuk berhenti
./scripts/serve.sh --bg       # di latar belakang, log di logs/server.log
./scripts/serve.sh --stop     # hentikan server latar belakang
```

Buka **http://localhost:8080/** (ganti `8080` sesuai `SERVER_PORT`). Halaman ini menampilkan
daftar intent, jumlah tweet unik, tautan unduh gabungan, dan file per run. Data selalu dibaca
ulang dari folder `output/`, jadi server boleh tetap jalan selama crawling.

### Endpoint

| URL | Isi |
|---|---|
| `/` | Halaman daftar intent dan file |
| `/api/intents` | Ringkasan semua intent (JSON) |
| `/api/intents/<intent>` | Semua tweet satu intent, digabung (JSON) |
| `/api/intents/<intent>?format=csv` | Sama, dalam CSV |
| `/download/korpus_intent.xlsx` | Excel, satu sheet per intent |
| `/files/<intent>/<file>.json` atau `.csv` | File hasil satu run (`?download` untuk mengunduh) |
| `/health` | Cek server hidup |

Contoh dari terminal:

```bash
curl http://localhost:8080/api/intents
curl -o find_ev_charger.csv "http://localhost:8080/api/intents/find_ev_charger?format=csv"
curl -o korpus_intent.xlsx http://localhost:8080/download/korpus_intent.xlsx
```

### Ganti port

```bash
SERVER_PORT=9000 ./scripts/serve.sh
```

atau ubah `SERVER_PORT=9000` di `.env`.

### Akses dari perangkat lain di jaringan yang sama

1. Di `.env`:
   ```env
   SERVER_HOST=0.0.0.0
   SERVER_ACCESS_KEY=isi-dengan-kunci-acak
   ```
2. Jalankan `./scripts/serve.sh`. Jika macOS menanyakan izin koneksi masuk untuk `node`, pilih **Allow**.
3. Cari IP laptop: `ipconfig getifaddr en0`.
4. Dari perangkat lain buka `http://<ip-laptop>:8080/?key=isi-dengan-kunci-acak`.
   Untuk `curl`, kirim kunci lewat header: `-H "x-access-key: isi-dengan-kunci-acak"`.

Server hanya membuka file hasil (`.json`, `.csv`, Excel). Folder `_raw` (log mentah, screenshot,
contoh respons) dan file `.env` tidak bisa diakses lewat server.

---

## 10. Memperbarui kode tanpa menimpa `.env` dan Git

Dari zip versi baru yang sudah diunduh ke `~/Downloads`:

```bash
PROJ=~/Desktop/Diserminasi/files/travoy-intent-crawler
cd "$PROJ" && git add -A && git commit -m "sebelum update"

rm -rf /tmp/tic && mkdir /tmp/tic && unzip -q ~/Downloads/travoy-intent-crawler.zip -d /tmp/tic
rsync -av --exclude '.env' --exclude '.git/' --exclude 'node_modules/' \
  --exclude 'output/' --exclude 'logs/' --exclude 'package-lock.json' \
  /tmp/tic/travoy-intent-crawler/ "$PROJ/"

cd "$PROJ" && npm install
git diff --stat
```

Keyword yang Anda ubah sendiri di `src/services/` ikut tertimpa; kembalikan dengan
`git checkout HEAD -- src/services/<file>` bila perlu. Variabel baru di `.env.example`
tambahkan sendiri ke `.env`.

---

## 11. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `EBADENGINE ... current: { node: 'v16...' }` | Node lama (sering dari conda) | Pasang Node 22, cek `which node`, `conda deactivate` |
| `ERR_REQUIRE_ESM ... chalk` | Node < 20.19 dengan tweet-harvest 2.7.1 | Pakai Node 22 |
| `Playwright requires Node.js 20 or higher` | Node lama | Pakai Node 22 |
| `Received signal 11 SEGV_ACCERR` saat membuka browser | Chromium lama tidak cocok dengan macOS | `rm -rf node_modules package-lock.json && npm install && npx playwright install chromium` |
| `unknown option '-e'` | Kode lama dengan tweet-harvest 2.6.1 | Perbarui kode (bagian 10) |
| `waitForSelector ... allOfTheseWords` timeout | Halaman Advanced Search X berubah | Pakai `HARVEST_ENGINE=playwright` |
| Berhasil dengan `HEADLESS=false`, kosong tanpa itu | X menolak browser headless | `BROWSER_CHANNEL=chromium`, lalu `chrome`; jika tetap gagal, set `HEADLESS=false` di `.env` |
| `Operasi GraphQL yang terlihat: (tidak ada)` | Halaman X tidak termuat | Lihat `screenshot.png` di folder debug yang tercetak di log |
| Browser membuka halaman login / `auth_token tidak valid` | Token salah atau kedaluwarsa | Ambil ulang `auth_token` (bagian 4) |
| `rate_limited` | Terlalu banyak permintaan | Tunggu 15–30 menit, perbesar `PAUSE_BETWEEN_KEYWORDS_SEC` |
| `EADDRINUSE` saat `serve.sh` | Port sudah dipakai | Ganti `SERVER_PORT` atau `./scripts/serve.sh --stop` |
| Halaman server tidak bisa dibuka dari HP | Server hanya di `127.0.0.1` | `SERVER_HOST=0.0.0.0` + `SERVER_ACCESS_KEY` (bagian 9) |

Folder debug: `output/<intent>/_raw/<waktu>/debug/<keyword>/` berisi `screenshot.png`,
`network-log.json`, `response-*.json`, dan `page.html`.

---

## 12. Windows

Skrip di `scripts/` ditulis untuk bash (macOS/Linux, atau Git Bash/WSL di Windows).
Di PowerShell/CMD, gunakan perintah npm yang setara:

| Skrip bash | Perintah npm |
|---|---|
| `bash scripts/setup.sh` | `npm install` lalu salin `.env.example` ke `.env` |
| `./scripts/crawl.sh find_rest_area 20` | `npm run crawl:find_rest_area -- --limit=20` |
| `./scripts/crawl.sh all 100` | `npm run crawl:all -- --limit=100` |
| `./scripts/crawl.sh all --dry-run` | `npm run dry-run` |
| `npm run export` | `npm run export` |
| `./scripts/serve.sh` | `npm run serve` |

Variabel sementara di PowerShell: `$env:HEADLESS="false"; npm run crawl:find_ev_charger -- --limit=20`.

---

## 13. Etika dan batasan

- Crawling memakai akun X Anda sendiri; perhatikan ketentuan layanan X dan beri jeda yang wajar.
- Hasil crawling adalah **kandidat ujaran**, bukan label. `intent_candidate` hanya menandai keyword yang
  menemukan tweet tersebut. Lakukan pelabelan oleh anotator dan ukur kesepakatannya (Cohen's Kappa).
- Data pengguna dianonimkan secara default. Jangan membagikan server ke jaringan publik.
