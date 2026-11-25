import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

function resolveHarvestBin(override) {
  if (override) return path.resolve(override);
  const pkgJson = require.resolve('tweet-harvest/package.json');
  return path.join(path.dirname(pkgJson), 'dist', 'bin.js');
}

/**
 * Menjalankan tweet-harvest untuk satu query.
 * tweet-harvest selalu menulis ke ./tweets-data/<nama>.csv relatif ke cwd,
 * jadi setiap topik punya folder kerja sendiri.
 */
export function runHarvest({ query, outputName, workDir, config }) {
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
    '-e', 'csv',
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
