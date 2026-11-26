import fs from 'node:fs';
import path from 'node:path';

/**
 * Akses file read-only di dalam folder output untuk dashboard file manager.
 * Semua path dari URL dicek agar tidak bisa keluar dari folder output.
 */
export function createFileManager(rootDir, { showRaw = false } = {}) {
  const root = fs.realpathSync(fs.existsSync(rootDir) ? rootDir : (fs.mkdirSync(rootDir, { recursive: true }), rootDir));

  const hiddenSegment = (seg) => seg.startsWith('.') || (!showRaw && seg === '_raw') || seg.endsWith('.tmp');

  /** Ubah path relatif dari URL menjadi path absolut yang aman, atau null. */
  function resolve(rel = '') {
    const clean = String(rel).replace(/\\/g, '/').split('/').filter((s) => s && s !== '.');
    if (clean.some((s) => s === '..' || hiddenSegment(s))) return null;
    const abs = path.join(root, ...clean);
    if (!fs.existsSync(abs)) return null;
    const real = fs.realpathSync(abs);
    if (real !== root && !real.startsWith(root + path.sep)) return null;
    return { abs: real, rel: clean.join('/'), stat: fs.statSync(real) };
  }

  function list(rel = '') {
    const dir = resolve(rel);
    if (!dir || !dir.stat.isDirectory()) return null;
    const entries = fs
      .readdirSync(dir.abs, { withFileTypes: true })
      .filter((d) => !hiddenSegment(d.name))
      .map((d) => {
        const abs = path.join(dir.abs, d.name);
        const st = fs.statSync(abs);
        const isDir = st.isDirectory();
        return {
          name: d.name,
          path: dir.rel ? `${dir.rel}/${d.name}` : d.name,
          type: isDir ? 'dir' : 'file',
          ext: isDir ? '' : path.extname(d.name).slice(1).toLowerCase(),
          size: isDir ? countItems(abs) : st.size,
          mtime: st.mtime.toISOString(),
        };
      });
    return { path: dir.rel, entries };
  }

  function countItems(abs) {
    try {
      return fs.readdirSync(abs).filter((n) => !hiddenSegment(n)).length;
    } catch {
      return 0;
    }
  }

  return { root, resolve, list, hiddenSegment };
}

export const MIME = {
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  log: 'text/plain; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
};

/** Tipe saat file dibuka (bukan diunduh). HTML sengaja ditampilkan sebagai teks biasa. */
export function inlineType(ext) {
  if (ext === 'png' || ext === 'jpg' || ext === 'json') return MIME[ext];
  if (['csv', 'log', 'txt', 'md', 'html'].includes(ext)) return 'text/plain; charset=utf-8';
  return null; // tidak bisa dipratinjau, hanya unduh
}

export function contentDisposition(name, inline = false) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
