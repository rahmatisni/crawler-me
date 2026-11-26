import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

/** Kolom CSV/Excel, urut dari yang paling berguna untuk pelabelan. */
export const COLUMNS = [
  'intent_candidate',
  'label',
  'label_status',
  'id_str',
  'created_at',
  'full_text',
  'text_clean',
  'lang',
  'matched_keywords',
  'keyword_types',
  'source',
  'tweet_url',
  'favorite_count',
  'retweet_count',
  'reply_count',
  'quote_count',
  'user_hash',
  'username',
];

const RUN_FILE = /^(.+)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.json$/;

/** Ubah record JSON menjadi baris datar (array digabung dengan " | "). */
export function flatRow(record) {
  const row = {};
  for (const c of COLUMNS) {
    const v = record[c];
    row[c] = Array.isArray(v) ? v.join(' | ') : v ?? '';
  }
  return row;
}

/** CSV dengan BOM UTF-8 agar huruf dan emoji terbaca benar saat dibuka di Excel. */
export function toCsv(records) {
  return '\ufeff' + Papa.unparse({ fields: COLUMNS, data: records.map((r) => COLUMNS.map((c) => flatRow(r)[c])) });
}

/** Daftar intent yang punya hasil crawling di folder output. */
export function listIntents(outputDir) {
  if (!fs.existsSync(outputDir)) return [];
  return fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name !== 'export')
    .map((d) => d.name)
    .filter((intent) => listRuns(outputDir, intent).length > 0)
    .sort();
}

/** File hasil per run (JSON dan CSV) untuk satu intent, terbaru lebih dulu. */
export function listRuns(outputDir, intent) {
  const dir = path.join(outputDir, intent);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((f) => f.match(RUN_FILE))
    .filter((m) => m && m[1] === intent)
    .map((m) => {
      const json = path.join(dir, m[0]);
      const csv = json.replace(/\.json$/, '.csv');
      return {
        runId: m[2],
        json: m[0],
        csv: fs.existsSync(csv) ? path.basename(csv) : null,
        sizeKb: Math.round(fs.statSync(json).size / 1024),
      };
    })
    .sort((a, b) => b.runId.localeCompare(a.runId));
}

/** Gabungkan semua run satu intent; duplikat (id_str sama) disatukan. */
export function loadIntentRecords(outputDir, intent) {
  const merged = new Map();
  for (const run of listRuns(outputDir, intent).reverse()) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(path.join(outputDir, intent, run.json), 'utf8'));
    } catch {
      continue; // file rusak atau sedang ditulis
    }
    for (const rec of doc.data ?? []) {
      const prev = merged.get(rec.id_str);
      if (!prev) {
        merged.set(rec.id_str, { ...rec });
        continue;
      }
      for (const k of ['matched_keywords', 'keyword_types']) {
        prev[k] = [...new Set([...(prev[k] ?? []), ...(rec[k] ?? [])])];
      }
      if (rec.label && !prev.label) {
        prev.label = rec.label;
        prev.label_status = rec.label_status;
      }
    }
  }
  return [...merged.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export function summarize(outputDir) {
  return listIntents(outputDir).map((intent) => {
    const runs = listRuns(outputDir, intent);
    return { intent, total_unique: loadIntentRecords(outputDir, intent).length, runs: runs.length, last_run: runs[0]?.runId ?? null };
  });
}

/** Workbook Excel: satu sheet per intent + sheet Ringkasan. */
export async function buildWorkbook(outputDir) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const summary = wb.addWorksheet('Ringkasan');
  summary.columns = [
    { header: 'intent', key: 'intent', width: 26 },
    { header: 'total_unik', key: 'total_unique', width: 12 },
    { header: 'jumlah_run', key: 'runs', width: 12 },
    { header: 'run_terakhir', key: 'last_run', width: 22 },
  ];

  for (const intent of listIntents(outputDir)) {
    const records = loadIntentRecords(outputDir, intent);
    const runs = listRuns(outputDir, intent);
    summary.addRow({ intent, total_unique: records.length, runs: runs.length, last_run: runs[0]?.runId });

    const ws = wb.addWorksheet(intent.slice(0, 31));
    ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: c === 'full_text' || c === 'text_clean' ? 60 : 16 }));
    records.forEach((r) => ws.addRow(flatRow(r)));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };
    ws.getColumn('full_text').alignment = { wrapText: true, vertical: 'top' };
  }
  summary.getRow(1).font = { bold: true };
  return wb;
}

/**
 * Tulis file gabungan ke output/export/:
 *  - csv/<intent>.csv   (satu file per intent, semua run digabung)
 *  - korpus_intent.xlsx (satu sheet per intent)
 */
export async function writeExports(outputDir) {
  const exportDir = path.join(outputDir, 'export');
  fs.mkdirSync(path.join(exportDir, 'csv'), { recursive: true });
  for (const intent of listIntents(outputDir)) {
    fs.writeFileSync(path.join(exportDir, 'csv', `${intent}.csv`), toCsv(loadIntentRecords(outputDir, intent)), 'utf8');
  }
  const wb = await buildWorkbook(outputDir);
  const xlsx = path.join(exportDir, 'korpus_intent.xlsx');
  await wb.xlsx.writeFile(xlsx);
  return { exportDir, xlsx };
}
