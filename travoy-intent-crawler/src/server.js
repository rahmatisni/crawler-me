import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import archiver from 'archiver';
import { listIntents, listRuns, loadIntentRecords, summarize, toCsv, buildWorkbook } from './core/exporter.js';
import { createFileManager, MIME, inlineType, contentDisposition } from './core/file-manager.js';
import { fileManagerPage } from './web/file-manager-page.js';

/**
 * Server file hasil crawling.
 *   GET /                              file manager (folder output)
 *   GET /browse?path=<folder>          file manager untuk subfolder
 *   GET /raw?path=<file>[&download=1]  buka / unduh satu file
 *   GET /zip?path=<folder>             unduh folder sebagai .zip (path kosong = semua)
 *   GET /zip?files=<a>&files=<b>       unduh beberapa file terpilih sebagai .zip
 *   GET /api/fs?path=<folder>          isi folder (JSON)
 *   GET /ringkasan                     halaman ringkasan per intent
 *   GET /api/intents                   ringkasan semua intent (JSON)
 *   GET /api/intents/:intent           semua tweet intent, digabung (?format=csv untuk CSV)
 *   GET /download/korpus_intent.xlsx   Excel, satu sheet per intent (dibuat saat diminta)
 *   GET /files/:intent/:file           file hasil per run (.json / .csv)
 *   GET /health                        cek server hidup
 * Folder _raw (log mentah, debug, screenshot) disembunyikan kecuali SERVER_SHOW_RAW=true.
 */
const config = loadConfig({});
const OUTPUT_DIR = path.resolve(config.outputDir);
const PORT = Number(process.env.SERVER_PORT || 8080);
const HOST = process.env.SERVER_HOST || '127.0.0.1';
const ACCESS_KEY = process.env.SERVER_ACCESS_KEY || '';
// Prefix URL bila server dipasang di belakang reverse proxy, mis. nginx /crawler/ -> :9000
const BASE_ENV = (process.env.SERVER_BASE_PATH || '').replace(/\/+$/, '');

function basePath(req) {
  const h = req.headers['x-forwarded-prefix'];
  const b = typeof h === 'string' && /^\/[\w\-/]*$/.test(h) ? h : BASE_ENV;
  return b.replace(/\/+$/, '');
}

const SHOW_RAW = ['1', 'true', 'yes'].includes(String(process.env.SERVER_SHOW_RAW || '').toLowerCase());
const fm = createFileManager(OUTPUT_DIR, { showRaw: SHOW_RAW });

/** Pembuat URL: prefix proxy + route + parameter + key akses. */
function hrefBuilder(base) {
  return (route, params = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.set(k, String(v));
    if (ACCESS_KEY) qs.set('key', ACCESS_KEY);
    const q = qs.toString();
    return `${base}${route}${q ? `?${q}` : ''}`;
  };
}

function sendFile(res, entry, download) {
  const name = path.basename(entry.abs);
  const ext = path.extname(name).slice(1).toLowerCase();
  const preview = !download && inlineType(ext);
  res.writeHead(200, {
    'Content-Type': preview || MIME[ext] || 'application/octet-stream',
    'Content-Length': entry.stat.size,
    'Content-Disposition': contentDisposition(name, Boolean(preview)),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(entry.abs).pipe(res);
}

function sendZip(res, zipName, addEntries) {
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': contentDisposition(zipName),
    'Cache-Control': 'no-store',
  });
  const zip = archiver('zip', { zlib: { level: 6 } });
  zip.on('error', (err) => {
    console.error(err);
    res.destroy(err);
  });
  zip.pipe(res);
  addEntries(zip);
  zip.finalize();
}

const SAFE_NAME = /^[a-z0-9_]+$/;
const SAFE_FILE = /^[a-z0-9_]+_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.(json|csv)$/;

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
const sendJson = (res, data, status = 200) => send(res, status, JSON.stringify(data, null, 2), 'application/json; charset=utf-8');
const attachment = (name) => ({ 'Content-Disposition': `attachment; filename="${name}"` });

function authorized(req, url) {
  if (!ACCESS_KEY) return true;
  return url.searchParams.get('key') === ACCESS_KEY || req.headers['x-access-key'] === ACCESS_KEY;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function indexPage(keyQuery, base = '') {
  const rows = summarize(OUTPUT_DIR)
    .map(({ intent, total_unique, runs, last_run }) => {
      const runLinks = listRuns(OUTPUT_DIR, intent)
        .map((r) => {
          const json = `<a href="${base}/files/${intent}/${r.json}${keyQuery}">JSON</a>`;
          const csv = r.csv ? ` · <a href="${base}/files/${intent}/${r.csv}${keyQuery}">CSV</a>` : '';
          return `<li>${esc(r.runId)} — ${json}${csv} <span class="muted">(${r.sizeKb} KB)</span></li>`;
        })
        .join('');
      return `<tr>
        <td><strong>${esc(intent)}</strong></td>
        <td class="num">${total_unique}</td>
        <td><a href="${base}/api/intents/${intent}?format=csv${keyQuery.replace('?', '&')}">CSV gabungan</a> ·
            <a href="${base}/api/intents/${intent}${keyQuery}">JSON gabungan</a></td>
        <td><details><summary>${runs} run, terakhir ${esc(last_run ?? '-')}</summary><ul>${runLinks}</ul></details></td>
      </tr>`;
    })
    .join('');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Travoy Intent Crawler — Hasil</title>
<style>
:root{--bg:#f7f6f2;--fg:#1c2433;--muted:#5b6473;--line:#d9d4c7;--card:#fff;--link:#0b5cad;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#141820;--fg:#e8eaee;--muted:#a3abb8;--line:#2d3440;--card:#1c222c;--link:#7ab8ff;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px 20px}
h1{font-size:24px;margin:0 0 4px}p{margin:0 0 16px;color:var(--muted)}
a{color:var(--link)}.muted{color:var(--muted)}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:13px;color:var(--muted)}.num{text-align:right;font-variant-numeric:tabular-nums}
ul{margin:6px 0 0;padding-left:18px}.btn{display:inline-block;margin:0 0 16px;padding:8px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);text-decoration:none}
</style></head><body><main>
<h1>Travoy Intent Crawler</h1>
<p>Hasil crawling per intent. Data diperbarui setiap halaman dimuat.</p>
<a class="btn" href="${base}/download/korpus_intent.xlsx${keyQuery}">Unduh Excel (satu sheet per intent)</a>
<div class="wrap"><table><thead><tr><th>Intent</th><th class="num">Tweet unik</th><th>Gabungan</th><th>File per run</th></tr></thead>
<tbody>${rows || '<tr><td colspan="4">Belum ada hasil crawling.</td></tr>'}</tbody></table></div>
</main></body></html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
    if (url.pathname === '/health') return sendJson(res, { ok: true });
    if (!authorized(req, url)) return send(res, 401, 'Akses ditolak: sertakan ?key=<SERVER_ACCESS_KEY>');

    const keyQuery = ACCESS_KEY ? `?key=${encodeURIComponent(ACCESS_KEY)}` : '';
    const parts = url.pathname.split('/').filter(Boolean);

    const href = hrefBuilder(basePath(req));

    // ---- File manager ----
    if (parts.length === 0 || parts[0] === 'browse') {
      const listing = fm.list(url.searchParams.get('path') || '');
      if (!listing) return send(res, 404, 'Folder tidak ditemukan');
      const sort = ['name', 'size', 'mtime'].includes(url.searchParams.get('sort')) ? url.searchParams.get('sort') : 'mtime';
      const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
      const html = fileManagerPage({ listing, href, sort, dir, summary: listing.path ? [] : summarize(OUTPUT_DIR) });
      return send(res, 200, html, 'text/html; charset=utf-8');
    }
    if (parts[0] === 'ringkasan') return send(res, 200, indexPage(keyQuery, basePath(req)), 'text/html; charset=utf-8');

    if (parts[0] === 'api' && parts[1] === 'fs') {
      const listing = fm.list(url.searchParams.get('path') || '');
      return listing ? sendJson(res, listing) : send(res, 404, 'Folder tidak ditemukan');
    }

    if (parts[0] === 'raw') {
      const entry = fm.resolve(url.searchParams.get('path') || '');
      if (!entry || !entry.stat.isFile()) return send(res, 404, 'File tidak ditemukan');
      return sendFile(res, entry, url.searchParams.has('download'));
    }

    if (parts[0] === 'zip') {
      const files = url.searchParams.getAll('files');
      if (files.length) {
        const entries = files.map((f) => fm.resolve(f)).filter((e) => e && e.stat.isFile());
        if (!entries.length) return send(res, 404, 'Tidak ada file yang valid');
        return sendZip(res, 'file_terpilih.zip', (zip) => entries.forEach((e) => zip.file(e.abs, { name: e.rel })));
      }
      const target = fm.resolve(url.searchParams.get('path') || '');
      if (!target || !target.stat.isDirectory()) return send(res, 404, 'Folder tidak ditemukan');
      const zipName = `${target.rel ? target.rel.replace(/\//g, '_') : 'output'}.zip`;
      return sendZip(res, zipName, (zip) =>
        zip.glob('**/*', {
          cwd: target.abs,
          dot: false,
          ignore: SHOW_RAW ? ['**/*.tmp'] : ['_raw/**', '**/_raw/**', '**/*.tmp'],
        }, { prefix: target.rel ? path.basename(target.abs) : 'output' })
      );
    }

    if (parts[0] === 'api' && parts[1] === 'intents') {
      if (parts.length === 2) return sendJson(res, summarize(OUTPUT_DIR));
      const intent = parts[2];
      if (!SAFE_NAME.test(intent) || !listIntents(OUTPUT_DIR).includes(intent)) return send(res, 404, 'Intent tidak ditemukan');
      const records = loadIntentRecords(OUTPUT_DIR, intent);
      if (url.searchParams.get('format') === 'csv') {
        return send(res, 200, toCsv(records), 'text/csv; charset=utf-8', attachment(`${intent}.csv`));
      }
      return sendJson(res, { intent, total: records.length, data: records });
    }

    if (parts[0] === 'download' && parts[1] === 'korpus_intent.xlsx') {
      const wb = await buildWorkbook(OUTPUT_DIR);
      const buf = await wb.xlsx.writeBuffer();
      return send(res, 200, Buffer.from(buf), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', attachment('korpus_intent.xlsx'));
    }

    if (parts[0] === 'files' && parts.length === 3) {
      const [, intent, file] = parts;
      if (!SAFE_NAME.test(intent) || !SAFE_FILE.test(file)) return send(res, 400, 'Nama file tidak valid');
      const full = path.join(OUTPUT_DIR, intent, file);
      if (!full.startsWith(OUTPUT_DIR + path.sep) || !fs.existsSync(full)) return send(res, 404, 'File tidak ditemukan');
      const type = file.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8';
      return send(res, 200, fs.readFileSync(full), type, url.searchParams.has('download') ? attachment(file) : {});
    }

    return send(res, 404, 'Tidak ditemukan');
  } catch (err) {
    console.error(err);
    return send(res, 500, 'Terjadi kesalahan di server');
  }
});

server.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server hasil crawling berjalan di http://${shown}:${PORT}/`);
  console.log(`Folder data: ${OUTPUT_DIR}`);
  if (HOST === '0.0.0.0') console.log('Perhatian: server bisa diakses dari jaringan lain. Isi SERVER_ACCESS_KEY di .env.');
});
