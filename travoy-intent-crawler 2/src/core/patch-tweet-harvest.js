import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * Patch kecil untuk tweet-harvest (2.6.x dan 2.7.x).
 *
 * Masalah: tweet-harvest membuka x.com/search-advanced lalu menunggu kolom
 * input[name="allOfTheseWords"]. Di tampilan X sekarang kolom itu tidak muncul,
 * sehingga crawling berakhir dengan "No more tweets found" lalu TimeoutError.
 *
 * Solusi: langsung buka halaman hasil pencarian x.com/search?q=<query>
 * (tab LATEST memakai &f=live) dan lewati pengisian formulir.
 * Cara tweet-harvest membaca data (respons SearchTimeline) tidak diubah.
 */
const MARKER = '/* travoy-patch: search-via-url */';

export function ensureTweetHarvestPatched({ quiet = false } = {}) {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('tweet-harvest/package.json');
  const binPath = path.join(path.dirname(pkgPath), 'dist', 'bin.js');
  let src = fs.readFileSync(binPath, 'utf8');

  if (src.includes(MARKER)) {
    if (!quiet) console.log('tweet-harvest sudah di-patch.');
    return true;
  }

  const gotoOld = 'await page.goto(twitterSearchUrl);';
  const gotoNew =
    `${MARKER}\n` +
    '      const __directUrl = IS_SEARCH_MODE\n' +
    '        ? "https://x.com/search?q=" + encodeURIComponent(MODIFIED_SEARCH_KEYWORDS) + "&src=typed_query" + (String(twitterSearchUrl).includes("f=live") ? "&f=live" : "")\n' +
    '        : twitterSearchUrl;\n' +
    '      console.info("Membuka: " + __directUrl);\n' +
    '      await page.goto(__directUrl);';
  const inputRe = /if \(IS_SEARCH_MODE\) \{(\s*)inputKeywords\(page, \{/;

  if (!src.includes(gotoOld) || !inputRe.test(src)) {
    console.warn(
      'Peringatan: struktur tweet-harvest berbeda dari yang diharapkan; patch tidak diterapkan. ' +
        'Periksa versi tweet-harvest (diuji pada 2.6.1 dan 2.7.1).'
    );
    return false;
  }

  src = src.replace(gotoOld, gotoNew);
  src = src.replace(inputRe, 'if (false /* travoy-patch: form dilewati */) {$1inputKeywords(page, {');
  fs.writeFileSync(binPath, src, 'utf8');
  if (!quiet) console.log('tweet-harvest berhasil di-patch: pencarian langsung lewat URL.');
  return true;
}

// Dipanggil oleh "postinstall"
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  ensureTweetHarvestPatched();
}
