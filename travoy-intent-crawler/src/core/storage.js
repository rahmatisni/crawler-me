import fs from 'node:fs';
import path from 'node:path';

/** Tulis JSON secara atomik (tulis ke .tmp lalu rename) agar file tidak rusak bila proses terhenti. */
export function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

export const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
