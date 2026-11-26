import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { ensureTweetHarvestPatched } from './patch-tweet-harvest.js';
import { harvestWithPlaywright } from './playwright-harvester.js';
import { readCsv } from './normalizer.js';

const require = createRequire(import.meta.url);

export function harvestVersion() {
  try {
    return require('tweet-harvest/package.json').version;
  } catch {
    return 'unknown';
  }
}

function resolveHarvestBin(override) {
  if (override) return path.resolve(override);
  const pkgJson = require.resolve('tweet-harvest/package.json');
  return path.join(path.dirname(pkgJson), 'dist', 'bin.js');
}

/**
 * tweet-harvest 2.7.x memakai dependensi ESM-only (chalk 5, yargs 18, znv 0.5)
 * dari kode CommonJS. Itu hanya jalan di Node yang mendukung require(esm):
 * Node >= 20.19 atau >= 22.12. Cek lebih awal agar pesan error jelas.
 */
export function assertNodeCompatible() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const nodeOk = major >= 23 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19);
  const hv = harvestVersion();
  const needsRequireEsm = /^2\.(7|8|9)\./.test(hv) || /^[3-9]\./.test(hv);
  if (needsRequireEsm && !nodeOk) {
    throw new Error(
      `tweet-harvest ${hv} butuh Node >= 20.19 atau >= 22.12 (Node Anda ${process.versions.node}). ` +
        'Upgrade Node ke 22 LTS, atau pakai tweet-harvest 2.6.1: npm install tweet-harvest@2.6.1 --save-exact'
    );
  }
}

/**
 * Menjalankan tweet-harvest untuk satu query.
 * tweet-harvest selalu menulis ke ./tweets-data/<nama>.csv relatif ke cwd,
 * jadi setiap topik punya folder kerja sendiri.
 */
/**
 * Pilih mesin crawling lewat HARVEST_ENGINE di .env:
 *  - playwright (default): Playwright langsung ke x.com/search
 *  - tweet-harvest: CLI tweet-harvest (sudah di-patch)
 * Keduanya mengembalikan { rows, rateLimited, invalidToken, timedOut }.
 */
export async function runHarvest({ query, outputName, workDir, config }) {
  if (config.engine === 'tweet-harvest') {
    const r = await runTweetHarvest({ query, outputName, workDir, config });
    return { ...r, rows: r.csvPath ? readCsv(r.csvPath) : null };
  }
  return harvestWithPlaywright({ query, config, debugDir: path.join(workDir, 'debug'), label: outputName });
}

function runTweetHarvest({ query, outputName, workDir, config }) {
  if (!config.harvestBin) ensureTweetHarvestPatched({ quiet: true });
  const bin = resolveHarvestBin(config.harvestBin);
  fs.mkdirSync(workDir, { recursive: true });
  const csvPath = path.join(workDir, 'tweets-data', `${outputName}.csv`);
  if (fs.existsSync(csvPath)) fs.rmSync(csvPath);

  const args = [
    bin,
    '-t', config.token,
    '-s', query,
    '--tab', config.tab,
    '-l', String(config.limitPerKeyword),
    '-d', String(config.delayPerTweetSec),
    '-o', outputName,
    // Format default tweet-harvest sudah CSV; flag -e tidak ada di versi 2.6.x.
  ];

  return new Promise((resolve) => {
    // Tanpa shell: query yang memuat tanda kutip aman di Windows maupun Linux/macOS.
    const child = spawn(process.execPath, args, {
      cwd: workDir,
      stdio: ['ignore', 'pipe', 'pipe'], // stdin ditutup agar tidak menggantung di prompt interaktif
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let log = '';
    const onData = (buf) => {
      const text = buf.toString();
      log += text;
      if (log.length > 20000) log = log.slice(-20000);
      process.stdout.write(text.replace(/^(?=.)/gm, '    │ '));
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, config.keywordTimeoutMin * 60 * 1000);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      const lower = log.toLowerCase();
      resolve({
        csvPath: fs.existsSync(csvPath) ? csvPath : null,
        rateLimited: lower.includes('rate limit'),
        invalidToken: lower.includes('invalid twitter auth token'),
        timedOut,
        exitCode,
      });
    });
  });
}
