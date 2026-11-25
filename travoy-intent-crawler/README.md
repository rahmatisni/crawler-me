# Travoy Intent Crawler

Servis crawling X (Twitter) untuk mengumpulkan **kandidat ujaran** per intent voice assistant Travoy.
Crawling memakai [tweet-harvest](https://www.npmjs.com/package/tweet-harvest) (versi dikunci 2.7.1),
sama seperti pendekatan di repo FathonyS073/crawling-data-twitter, tetapi dijalankan dari Node.js
dan hasilnya disimpan sebagai JSON.

Satu intent = satu servis (`src/services/<intent>.service.js`).

## Persiapan

1. Node.js 18 atau lebih baru.
2. Install dependensi (otomatis mengunduh Chromium untuk Playwright):
   ```bash
   npm install
   ```
   Jika Chromium gagal terunduh: `npx playwright install chromium`.
3. Salin `.env.example` menjadi `.env`, lalu isi `TWITTER_AUTH_TOKEN`.

### Cara mengambil auth_token

Login ke x.com di browser → DevTools (F12) → tab Application/Storage → Cookies → `https://x.com`
→ salin nilai cookie `auth_token`. Token ini setara password akun: simpan hanya di `.env`
dan jangan dibagikan atau di-commit. Disarankan memakai akun khusus riset.

## Menjalankan

Cek dulu query yang akan dikirim tanpa crawling:

```bash
npm run dry-run
```

Satu servis (satu intent):

```bash
npm run crawl:emergency_call
npm run crawl:find_rest_area -- --limit=50
npm run crawl:get_traffic_info -- --only=implisit
```

Semua servis berurutan:

```bash
npm run crawl:all
```

| Servis | Intent |
|---|---|
| `crawl:emergency_call` | Bantuan darurat: kecelakaan, mogok, derek |
| `crawl:get_traffic_info` | Kondisi lalu lintas tol |
| `crawl:find_rest_area` | Rest area terdekat |
| `crawl:find_gas_station` | SPBU di tol |
| `crawl:find_ev_charger` | SPKLU / charger mobil listrik |
| `crawl:get_toll_transactions` | Riwayat transaksi tol |
| `crawl:check_card_balance` | Saldo kartu e-toll |
| `crawl:check_toll_tariff` | Tarif tol |
| `crawl:open_travoy_go` | Membuka aplikasi Travoy Go |
| `crawl:play_travoy_fm` | Siaran radio / musik Travoy FM |
| `crawl:get_near_me` | Siaran info sekitar / broadcast lalu lintas |

Argumen tambahan: `--limit=N` (tweet per keyword), `--only=eksplisit|implisit`, `--dry-run`.

## Keyword

Setiap servis punya dua kelompok keyword berbahasa Indonesia:

- **eksplisit**: kebutuhan atau fitur disebut langsung (mis. `"rest area terdekat"`, `"cek saldo e-toll"`).
- **implisit**: situasi digambarkan tanpa menyebut fitur (mis. `ngantuk nyetir tol`, `"saldo tidak cukup" tol`).

Keyword ditulis dalam sintaks pencarian X: frasa dalam tanda kutip dicari persis.
Filter `lang:id`, `-filter:retweets`, `since:` dan `until:` ditambahkan otomatis dari `.env`.
Ubah atau tambah keyword langsung di file servis masing-masing.

## Struktur hasil

```
output/
  emergency_call/
    emergency_call_2026-11-26T09-00-00.json   ← hasil final (JSON)
    _raw/2026-11-26T09-00-00/tweets-data/*.csv ← CSV mentah dari tweet-harvest
```

File JSON disimpan ulang setelah setiap keyword selesai, jadi data aman bila proses terhenti.

```json
{
  "meta": {
    "intent": "emergency_call",
    "crawled_at": "...",
    "tool": "tweet-harvest@2.7.1",
    "params": { "lang": "id", "tab": "LATEST", "since": "2023-01-01", "limit_per_keyword": 200 },
    "total_tweets": 812,
    "keywords": [
      { "keyword": "\"derek tol\"", "type": "eksplisit", "query": "...", "fetched": 120, "new_unique": 118, "status": "ok" }
    ]
  },
  "data": [
    {
      "id_str": "...",
      "created_at": "...",
      "full_text": "teks asli",
      "text_clean": "teks tanpa URL, mention diganti @USER",
      "tweet_url": "https://x.com/i/status/...",
      "favorite_count": 0,
      "user_hash": "hash username (bila ANONYMIZE_USER=true)",
      "intent_candidate": "emergency_call",
      "matched_keywords": ["\"derek tol\""],
      "keyword_types": ["eksplisit"],
      "label": null,
      "label_status": "unlabeled"
    }
  ]
}
```

Status keyword: `ok`, `partial_timeout`, `no_result`, `rate_limited`, `timeout`.

## Catatan penting

- **Hasil crawling adalah kandidat, bukan label.** `intent_candidate` hanya menunjukkan keyword
  mana yang menemukan tweet itu. Banyak tweet berupa berita atau keluhan, bukan perintah.
  Tetap lakukan pelabelan oleh anotator dan hitung Cohen's Kappa.
- Gaya bahasa tweet berbeda dari perintah suara. Gunakan tweet sebagai sumber kosakata dan situasi,
  lalu parafrasekan menjadi ujaran perintah bila perlu (catat sebagai data turunan).
- Keyword yang sangat spesifik (mis. `"travoy fm"`) kemungkinan menghasilkan sedikit tweet.
- Jika kena rate limit, servis menunggu `RATE_LIMIT_PAUSE_MIN` menit lalu mencoba ulang.
  Jalankan servis satu per satu dan beri jeda antar keyword.
- Secara default username di-hash, sedangkan user_id dan lokasi tidak disimpan.
- Crawling memakai akun X Anda sendiri; perhatikan ketentuan layanan X dan etika riset.
