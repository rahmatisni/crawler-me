import { inlineType } from '../core/file-manager.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function fmtSize(entry) {
  if (entry.type === 'dir') return `${entry.size} item`;
  const b = entry.size;
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
}

const ICON = { dir: '📁', json: '🧾', csv: '📊', xlsx: '📗', png: '🖼️', jpg: '🖼️', log: '📜', html: '🌐' };

/**
 * Halaman file manager.
 * @param {object} p
 * @param {(route: string, params?: object) => string} p.href  pembuat URL (sudah termasuk prefix & key)
 */
export function fileManagerPage({ listing, href, sort, dir, summary }) {
  const crumbs = [{ name: 'output', path: '' }];
  let acc = '';
  for (const seg of listing.path ? listing.path.split('/') : []) {
    acc = acc ? `${acc}/${seg}` : seg;
    crumbs.push({ name: seg, path: acc });
  }

  const key = { name: (e) => e.name.toLowerCase(), size: (e) => e.size, mtime: (e) => e.mtime }[sort] ?? ((e) => e.mtime);
  const factor = dir === 'asc' ? 1 : -1;
  const entries = [...listing.entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    const ka = key(a), kb = key(b);
    return ka < kb ? -factor : ka > kb ? factor : 0;
  });

  const sortLink = (col, label) => {
    const next = sort === col && dir === 'desc' ? 'asc' : 'desc';
    const arrow = sort === col ? (dir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<a href="${href('/browse', { path: listing.path, sort: col, dir: next })}">${label}${arrow}</a>`;
  };

  const rows = entries
    .map((e) => {
      const icon = e.type === 'dir' ? ICON.dir : ICON[e.ext] ?? '📄';
      const nameCell =
        e.type === 'dir'
          ? `<a href="${href('/browse', { path: e.path })}">${esc(e.name)}</a>`
          : inlineType(e.ext)
            ? `<a href="${href('/raw', { path: e.path })}" target="_blank" rel="noopener">${esc(e.name)}</a>`
            : esc(e.name);
      const actions =
        e.type === 'dir'
          ? `<a class="act" href="${href('/zip', { path: e.path })}">Unduh .zip</a>`
          : `<a class="act" href="${href('/raw', { path: e.path, download: 1 })}">Unduh</a>` +
            (inlineType(e.ext) ? ` <a class="act ghost" href="${href('/raw', { path: e.path })}" target="_blank" rel="noopener">Lihat</a>` : '');
      return `<tr data-name="${esc(e.name.toLowerCase())}">
  <td class="chk">${e.type === 'file' ? `<input type="checkbox" value="${esc(e.path)}" aria-label="Pilih ${esc(e.name)}">` : ''}</td>
  <td class="name"><span class="ic">${icon}</span>${nameCell}</td>
  <td class="num">${fmtSize(e)}</td>
  <td class="date">${fmtDate(e.mtime)}</td>
  <td class="acts">${actions}</td>
</tr>`;
    })
    .join('');

  const stats = summary
    .map((s) => `<div class="stat"><span>${esc(s.intent)}</span><strong>${s.total_unique}</strong></div>`)
    .join('');

  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>File Manager — Travoy Intent Crawler</title>
<style>
:root{--bg:#f6f5f1;--fg:#1c2433;--muted:#5b6473;--line:#dcd7ca;--card:#fff;--hover:#f1eee6;--link:#0b5cad;--accent:#14213d;--on-accent:#fff;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#12161d;--fg:#e8eaee;--muted:#a3abb8;--line:#2b323d;--card:#1a2029;--hover:#212834;--link:#7ab8ff;--accent:#e8a93a;--on-accent:#14213d;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px 20px 48px}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:18px}
h1{font-size:22px;margin:0}a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
.muted{color:var(--muted)}
.stats{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:18px}
.stat{flex:none;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;min-width:130px}
.stat span{font-size:12px;color:var(--muted)}.stat strong{font-size:18px;font-variant-numeric:tabular-nums}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px}
.crumbs{font-size:15px}.crumbs a,.crumbs span{white-space:nowrap}.crumbs .sep{color:var(--muted);margin:0 6px}
.tools{display:flex;flex-wrap:wrap;gap:8px}
input[type=search]{padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);min-width:200px}
.btn{display:inline-block;padding:7px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;font:inherit}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;min-width:720px}
th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{font-size:12px;color:var(--muted);font-weight:600}th a{color:var(--muted)}
tbody tr:hover{background:var(--hover)}tbody tr:last-child td{border-bottom:0}
.chk{width:32px}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.date{white-space:nowrap;color:var(--muted)}
.name{word-break:break-all}.ic{margin-right:8px}
.acts{white-space:nowrap;text-align:right}.act{display:inline-block;padding:3px 9px;border-radius:6px;border:1px solid var(--line)}
.act.ghost{border-color:transparent}
.empty{padding:28px;text-align:center;color:var(--muted)}
footer{margin-top:14px;font-size:12px;color:var(--muted)}
</style></head><body><main>
<header>
  <div><h1>File Manager</h1><div class="muted">Travoy Intent Crawler · hanya baca</div></div>
  <div class="tools">
    <a class="btn primary" href="${href('/download/korpus_intent.xlsx')}">Excel semua intent</a>
    <a class="btn" href="${href('/zip', { path: '' })}">Unduh semua (.zip)</a>
    <a class="btn" href="${href('/ringkasan')}">Ringkasan</a>
  </div>
</header>
${stats ? `<div class="stats">${stats}</div>` : ''}
<div class="bar">
  <nav class="crumbs">${crumbs
    .map((c, i) => (i === crumbs.length - 1 ? `<strong>${esc(c.name)}</strong>` : `<a href="${href('/browse', { path: c.path })}">${esc(c.name)}</a>`))
    .join('<span class="sep">/</span>')}</nav>
  <div class="tools">
    <input type="search" id="q" placeholder="Cari di folder ini…" aria-label="Cari file">
    <button class="btn" id="dlSel" disabled>Unduh terpilih (.zip)</button>
  </div>
</div>
<div class="wrap"><table>
<thead><tr><th class="chk"><input type="checkbox" id="all" aria-label="Pilih semua"></th>
<th>${sortLink('name', 'Nama')}</th><th class="num">${sortLink('size', 'Ukuran')}</th><th>${sortLink('mtime', 'Diubah')}</th><th></th></tr></thead>
<tbody>${rows || '<tr><td colspan="5" class="empty">Folder kosong.</td></tr>'}</tbody>
</table></div>
<footer>Klik nama file untuk melihat isinya, atau Unduh untuk menyimpan. Folder diunduh sebagai .zip.</footer>
<script>
(function(){
  var q=document.getElementById('q'),all=document.getElementById('all'),btn=document.getElementById('dlSel');
  var boxes=function(){return Array.prototype.slice.call(document.querySelectorAll('tbody input[type=checkbox]'));};
  var visible=function(b){return b.closest('tr').style.display!=='none';};
  var sync=function(){btn.disabled=!boxes().some(function(b){return b.checked;});};
  q.addEventListener('input',function(){var v=q.value.toLowerCase();document.querySelectorAll('tbody tr[data-name]').forEach(function(tr){tr.style.display=tr.dataset.name.indexOf(v)>-1?'':'none';});});
  all.addEventListener('change',function(){boxes().forEach(function(b){if(visible(b))b.checked=all.checked;});sync();});
  document.querySelector('tbody').addEventListener('change',sync);
  btn.addEventListener('click',function(){
    var u=new URL(${JSON.stringify(href('/zip'))},location.href);
    boxes().filter(function(b){return b.checked;}).forEach(function(b){u.searchParams.append('files',b.value);});
    location.href=u.toString();
  });
})();
</script>
</main></body></html>`;
}
